import "server-only";

import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, open, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { gunzipSync, constants as zlibConstants } from "node:zlib";
import { pgQuery } from "@/lib/db/postgres";
import { getFeatures } from "@/lib/features";
import { r2Configured, r2Delete, r2Head512, r2SignedGetUrl, r2SignedPutUrl, r2Size } from "@/lib/media/r2";
import { extensionOf, fileTypeOf, kindOfMime, type FileKind } from "@/lib/portal/file-types";
import { publishBoth } from "@/lib/portal/realtime";
import { HttpError } from "@/lib/server/http";

/**
 * The client file space. Files go from the browser straight to the private R2 bucket through a
 * one-time upload link, so the website's server never carries them (and never slows down). Without
 * R2, files stream to the server's private data folder instead — still never held in memory.
 *
 * Quota: only what the client uploads counts. Files the company sends are free for the client.
 */
export type Actor = { type: "client" | "staff"; id: string; name: string };

type FileRow = {
  id: string; client_id: string; folder_id: string | null; family_id: string; version: number; name: string; mime: string;
  size_bytes: string; original_bytes: string; encoding: string; storage: "r2" | "local"; object_key: string; status: "pending" | "ready";
  uploaded_by_type: "client" | "staff"; uploaded_by_id: string; uploaded_by_name: string; counts_quota: boolean; meta: Record<string, unknown>;
  created_at: Date; deleted_at: Date | null;
};

export type PortalFileItem = {
  id: string; familyId: string; version: number; versions: number; name: string; mime: string; kind: FileKind; size: number; originalSize: number;
  folderId: string | null; uploadedBy: "client" | "staff"; uploadedByName: string; countsQuota: boolean; createdAt: string; meta: Record<string, unknown>;
};
export type FolderItem = { id: string; name: string; count: number };
export type Usage = { usedBytes: number; quotaBytes: number; maxFileBytes: number };

const LOCAL_ROOT = () => join(process.cwd(), "data", "private-files");
const MB = 1024 * 1024;

export function toItem(row: FileRow, versions = 1): PortalFileItem {
  return {
    id: row.id, familyId: row.family_id, version: row.version, versions, name: row.name, mime: row.mime, kind: kindOfMime(row.mime, row.name),
    size: Number(row.size_bytes), originalSize: Number(row.original_bytes) || Number(row.size_bytes), folderId: row.folder_id,
    uploadedBy: row.uploaded_by_type, uploadedByName: row.uploaded_by_name, countsQuota: row.counts_quota, createdAt: row.created_at.toISOString(), meta: row.meta || {},
  };
}

export async function usage(clientId: string): Promise<Usage> {
  const features = await getFeatures();
  const result = await pgQuery<{ used: string | null }>(
    `SELECT COALESCE(SUM(size_bytes), 0) AS used FROM pcg_client_files
     WHERE client_id = $1 AND counts_quota AND deleted_at IS NULL AND (status = 'ready' OR created_at > NOW() - INTERVAL '2 hours')`,
    [clientId],
  );
  return { usedBytes: Number(result.rows[0]?.used || 0), quotaBytes: features.files.quotaMb * MB, maxFileBytes: features.files.maxFileMb * MB };
}

function cleanName(name: string) {
  const extension = extensionOf(name);
  const base = name.normalize("NFC").replace(/[\u0000-\u001f\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
  return (base.length > 150 ? `${base.slice(0, 140)}….${extension}` : base) || `file.${extension}`;
}

async function cleanupAbandoned() {
  const stale = await pgQuery<FileRow>("DELETE FROM pcg_client_files WHERE status = 'pending' AND created_at < NOW() - INTERVAL '2 hours' RETURNING *");
  for (const row of stale.rows) await removeObject(row).catch(() => undefined);
}

async function removeObject(row: Pick<FileRow, "storage" | "object_key">) {
  if (row.storage === "r2") await r2Delete("private", row.object_key);
  else await rm(join(LOCAL_ROOT(), ...row.object_key.split("/")), { force: true });
}

/**
 * Step 1 of an upload: checks type, size and space, reserves the space and returns where to send the bytes.
 * `encoding: "gzip"` means the browser already compressed the file (text-like formats only).
 */
export async function createUpload(input: {
  clientId: string; actor: Actor; name?: unknown; size?: unknown; originalSize?: unknown; encoding?: unknown; folderId?: unknown; replaceFamilyId?: unknown; meta?: Record<string, unknown>;
}) {
  const features = await getFeatures();
  if (!features.files.enabled && input.actor.type === "client" && !input.meta?.conversationId) throw new HttpError(404, "The file space is switched off at the moment.");
  void cleanupAbandoned().catch(() => undefined);
  const name = cleanName(String(input.name || ""));
  const type = fileTypeOf(name);
  if (!type) throw new HttpError(415, `“${name}” isn't a file type we accept. Use photos, PDF, video, audio, Office documents, drawings (DWG, DXF, IFC, SKP) or ZIP.`);
  const size = Math.floor(Number(input.size));
  if (!Number.isFinite(size) || size <= 0) throw new HttpError(400, `“${name}” is empty.`);
  const encoding = input.encoding === "gzip" && type.compressible ? "gzip" : "";
  const originalSize = Math.max(Math.floor(Number(input.originalSize) || size), size);
  const maxBytes = features.files.maxFileMb * MB;
  if (size > maxBytes) throw new HttpError(413, `“${name}” is ${Math.ceil(size / MB)} MB. The largest file allowed is ${features.files.maxFileMb} MB.`);

  const countsQuota = input.actor.type === "client";
  if (countsQuota) {
    const current = await usage(input.clientId);
    if (current.usedBytes + size > current.quotaBytes) {
      const free = Math.max(current.quotaBytes - current.usedBytes, 0);
      throw new HttpError(413, `Not enough space: “${name}” needs ${(size / MB).toFixed(2)} MB and you have ${(free / MB).toFixed(2)} MB free. Delete files you no longer need to make room.`);
    }
  }

  let folderId: string | null = null;
  if (typeof input.folderId === "string" && input.folderId) {
    const folder = await pgQuery("SELECT id FROM pcg_client_folders WHERE id = $1 AND client_id = $2", [input.folderId, input.clientId]);
    folderId = folder.rows[0] ? input.folderId : null;
  }

  let familyId: string = randomUUID();
  let version = 1;
  if (typeof input.replaceFamilyId === "string" && input.replaceFamilyId) {
    const family = await pgQuery<{ version: number; folder_id: string | null }>(
      "SELECT version, folder_id FROM pcg_client_files WHERE family_id = $1 AND client_id = $2 AND deleted_at IS NULL ORDER BY version DESC LIMIT 1",
      [input.replaceFamilyId, input.clientId],
    );
    if (!family.rows[0]) throw new HttpError(404, "The file you're updating no longer exists.");
    familyId = input.replaceFamilyId;
    version = family.rows[0].version + 1;
    folderId = family.rows[0].folder_id;
  }

  const id = randomUUID();
  const storage: "r2" | "local" = r2Configured("private") ? "r2" : "local";
  const objectKey = `clients/${input.clientId}/${id}.${extensionOf(name)}${encoding ? ".gz" : ""}`;
  await pgQuery(
    `INSERT INTO pcg_client_files (id, client_id, folder_id, family_id, version, name, mime, size_bytes, original_bytes, encoding, storage, object_key, status,
       uploaded_by_type, uploaded_by_id, uploaded_by_name, counts_quota, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13,$14,$15,$16,$17)`,
    [id, input.clientId, folderId, familyId, version, name, type.mime, size, originalSize, encoding, storage, objectKey, input.actor.type, input.actor.id, input.actor.name, countsQuota, JSON.stringify(input.meta || {})],
  );
  return {
    id,
    upload: storage === "r2"
      ? { url: r2SignedPutUrl("private", objectKey, 1800), method: "PUT" as const, direct: true }
      : { url: `${input.actor.type === "staff" ? "/api/admin/portal" : "/api/portal"}/files/${id}/upload`, method: "PUT" as const, direct: false },
  };
}

async function findFile(id: string, clientId?: string) {
  const result = await pgQuery<FileRow>(`SELECT * FROM pcg_client_files WHERE id = $1 ${clientId ? "AND client_id = $2" : ""}`, clientId ? [id, clientId] : [id]);
  return result.rows[0] || null;
}

/** Local fallback (no R2): streams the request body to disk, refusing anything bigger than reserved. */
export async function receiveLocalUpload(id: string, request: Request, clientId?: string) {
  const row = await findFile(id, clientId);
  if (!row || row.status !== "pending" || row.storage !== "local") throw new HttpError(404, "This upload has expired. Please try again.");
  if (!request.body) throw new HttpError(400, "No file was received.");
  const target = join(LOCAL_ROOT(), ...row.object_key.split("/"));
  await mkdir(dirname(target), { recursive: true });
  const limit = Number(row.size_bytes);
  let received = 0;
  const guard = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received > limit) callback(new HttpError(413, "The file is larger than announced."));
      else callback(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream), guard, createWriteStream(target, { flags: "w" }));
  } catch (error) {
    await rm(target, { force: true });
    throw error instanceof HttpError ? error : new HttpError(400, "The upload was interrupted. Please try again.");
  }
}

/** Step 2 of an upload: confirms the bytes arrived, match the reserved size and really are that file type. */
export async function completeUpload(id: string, clientId?: string): Promise<PortalFileItem> {
  const row = await findFile(id, clientId);
  if (!row) throw new HttpError(404, "This upload has expired. Please try again.");
  if (row.status === "ready") return toItem(row);
  let actualSize: number | null;
  let head: Uint8Array;
  if (row.storage === "r2") {
    actualSize = await r2Size("private", row.object_key);
    head = actualSize ? await r2Head512("private", row.object_key) : new Uint8Array();
  } else {
    const path = join(LOCAL_ROOT(), ...row.object_key.split("/"));
    actualSize = await stat(path).then((info) => info.size).catch(() => null);
    head = new Uint8Array(1024);
    if (actualSize) {
      const handle = await open(path, "r");
      try { await handle.read(head, 0, 1024, 0); } finally { await handle.close(); }
    }
  }
  const fail = async (message: string) => {
    await removeObject(row).catch(() => undefined);
    await pgQuery("DELETE FROM pcg_client_files WHERE id = $1", [id]);
    throw new HttpError(400, message);
  };
  if (!actualSize) return fail("The file didn't arrive. Please try again.");
  if (actualSize !== Number(row.size_bytes)) return fail("The file arrived incomplete. Please try again.");
  let sample = head;
  if (row.encoding === "gzip") {
    try { sample = new Uint8Array(gunzipSync(head, { finishFlush: zlibConstants.Z_SYNC_FLUSH })); } catch { return fail("The file couldn't be read. Please try again."); }
  }
  const type = fileTypeOf(row.name);
  if (!type || !type.check(sample)) return fail(`“${row.name}” doesn't look like a real .${extensionOf(row.name)} file. Export or save it again, then retry.`);
  const updated = await pgQuery<FileRow>("UPDATE pcg_client_files SET status = 'ready' WHERE id = $1 RETURNING *", [id]);
  publishBoth(row.client_id, { type: "files" });
  return toItem(updated.rows[0]);
}

/** The client's files (latest version of each), folders and storage use. */
export async function listFiles(clientId: string) {
  const [files, folders, counts, used] = await Promise.all([
    pgQuery<FileRow & { versions: string }>(
      `SELECT DISTINCT ON (family_id) *, COUNT(*) OVER (PARTITION BY family_id) AS versions
       FROM pcg_client_files WHERE client_id = $1 AND status = 'ready' AND deleted_at IS NULL
       ORDER BY family_id, version DESC`,
      [clientId],
    ),
    pgQuery<{ id: string; name: string }>("SELECT id, name FROM pcg_client_folders WHERE client_id = $1 ORDER BY lower(name)", [clientId]),
    pgQuery<{ folder_id: string | null; count: string }>(
      "SELECT folder_id, COUNT(DISTINCT family_id) AS count FROM pcg_client_files WHERE client_id = $1 AND status = 'ready' AND deleted_at IS NULL GROUP BY folder_id",
      [clientId],
    ),
    usage(clientId),
  ]);
  const countBy = new Map(counts.rows.map((row) => [row.folder_id || "", Number(row.count)]));
  return {
    files: files.rows.map((row) => toItem(row, Number(row.versions))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    folders: folders.rows.map((row) => ({ id: row.id, name: row.name, count: countBy.get(row.id) || 0 })),
    usage: used,
  };
}

export async function filesByIds(ids: string[], clientId: string) {
  if (!ids.length) return [];
  const result = await pgQuery<FileRow>("SELECT * FROM pcg_client_files WHERE id = ANY($1) AND client_id = $2 AND status = 'ready'", [ids, clientId]);
  return result.rows.map((row) => toItem(row));
}

export async function fileVersions(familyId: string, clientId: string) {
  const result = await pgQuery<FileRow>("SELECT * FROM pcg_client_files WHERE family_id = $1 AND client_id = $2 AND status = 'ready' AND deleted_at IS NULL ORDER BY version DESC", [familyId, clientId]);
  return result.rows.map((row) => toItem(row, result.rows.length));
}

export async function renameFile(id: string, clientId: string, name: unknown) {
  const row = await findFile(id, clientId);
  if (!row) throw new HttpError(404, "File not found.");
  const extension = extensionOf(row.name);
  let next = cleanName(String(name || "")).replace(/\.[a-z0-9]{1,6}$/i, "");
  if (!next) throw new HttpError(400, "Give the file a name.");
  next = `${next}.${extension}`;
  await pgQuery("UPDATE pcg_client_files SET name = $1 WHERE family_id = $2 AND client_id = $3", [next, row.family_id, clientId]);
  publishBoth(clientId, { type: "files" });
}

export async function moveFile(id: string, clientId: string, folderId: unknown) {
  const row = await findFile(id, clientId);
  if (!row) throw new HttpError(404, "File not found.");
  let target: string | null = null;
  if (typeof folderId === "string" && folderId) {
    const folder = await pgQuery("SELECT id FROM pcg_client_folders WHERE id = $1 AND client_id = $2", [folderId, clientId]);
    if (!folder.rows[0]) throw new HttpError(404, "Folder not found.");
    target = folderId;
  }
  await pgQuery("UPDATE pcg_client_files SET folder_id = $1 WHERE family_id = $2 AND client_id = $3", [target, row.family_id, clientId]);
  publishBoth(clientId, { type: "files" });
}

/** Deletes a file with all its versions (or one version), freeing the space straight away. */
export async function deleteFile(id: string, clientId: string, actor: Actor, { onlyThisVersion = false } = {}) {
  const row = await findFile(id, clientId);
  if (!row) throw new HttpError(404, "File not found.");
  if (actor.type === "client" && row.uploaded_by_type === "staff") throw new HttpError(403, "Files sent by our team can't be deleted. They don't use any of your space.");
  const rows = onlyThisVersion
    ? [row]
    : (await pgQuery<FileRow>("SELECT * FROM pcg_client_files WHERE family_id = $1 AND client_id = $2 AND deleted_at IS NULL", [row.family_id, clientId])).rows;
  await pgQuery("UPDATE pcg_client_files SET deleted_at = NOW() WHERE id = ANY($1)", [rows.map((item) => item.id)]);
  for (const item of rows) await removeObject(item).catch(() => undefined);
  publishBoth(clientId, { type: "files" });
}

export async function createFolder(clientId: string, name: unknown) {
  const clean = String(name || "").replace(/[\u0000-\u001f\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!clean) throw new HttpError(400, "Give the folder a name.");
  const count = await pgQuery<{ count: string }>("SELECT COUNT(*) AS count FROM pcg_client_folders WHERE client_id = $1", [clientId]);
  if (Number(count.rows[0].count) >= 50) throw new HttpError(400, "You can have up to 50 folders.");
  const id = randomUUID();
  await pgQuery("INSERT INTO pcg_client_folders (id, client_id, name) VALUES ($1, $2, $3)", [id, clientId, clean]);
  publishBoth(clientId, { type: "files" });
  return { id, name: clean, count: 0 };
}

export async function renameFolder(id: string, clientId: string, name: unknown) {
  const clean = String(name || "").replace(/[\u0000-\u001f\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!clean) throw new HttpError(400, "Give the folder a name.");
  await pgQuery("UPDATE pcg_client_folders SET name = $1 WHERE id = $2 AND client_id = $3", [clean, id, clientId]);
  publishBoth(clientId, { type: "files" });
}

/** Removes the folder; its files move back to “All files” (nothing is deleted). */
export async function deleteFolder(id: string, clientId: string) {
  await pgQuery("DELETE FROM pcg_client_folders WHERE id = $1 AND client_id = $2", [id, clientId]);
  publishBoth(clientId, { type: "files" });
}

const INLINE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime", "audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav", "text/plain"]);

/** Opens or downloads a file for an authorised viewer — a short-lived private link, never a public one. */
export async function deliverFile(id: string, clientId: string | undefined, download: boolean) {
  const row = await findFile(id, clientId);
  if (!row || row.status !== "ready" || row.deleted_at) return Response.json({ error: "This file is no longer available." }, { status: 404 });
  const inline = !download && INLINE.has(row.mime);
  if (row.storage === "r2") {
    const url = r2SignedGetUrl("private", row.object_key, 600, row.name, inline, { contentType: row.mime, contentEncoding: row.encoding || undefined });
    // The redirect may be cached briefly by this browser only, so images in a chat don't re-request every render.
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, max-age=480" } });
  }
  const path = join(LOCAL_ROOT(), ...row.object_key.split("/"));
  const info = await stat(path).catch(() => null);
  if (!info) return Response.json({ error: "This file is no longer available." }, { status: 404 });
  const { createReadStream } = await import("node:fs");
  const safeName = row.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
    headers: {
      "Content-Type": row.mime,
      ...(row.encoding ? { "Content-Encoding": row.encoding } : {}),
      "Content-Length": String(info.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
