import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pgQuery, postgresEnabled } from "@/lib/db/postgres";
import { r2Configured, r2Delete, r2Put, r2PublicUrl } from "@/lib/media/r2";
import { HttpError } from "@/lib/server/http";

/**
 * The website media library: every image/video uploaded in the CMS lands here, on Cloudflare R2 when configured
 * (falls back to the server's shared uploads folder, which Caddy serves at /uploads/...).
 */
export type MediaKind = "image" | "video";
export type MediaItem = {
  id: string;
  url: string;
  kind: MediaKind;
  mime: string;
  sizeBytes: number;
  filename: string;
  alt: string;
  storage: "r2" | "local";
  uploadedBy: string;
  createdAt: string;
};

export const MEDIA_TYPES: Record<string, { extension: string; kind: MediaKind }> = {
  "image/jpeg": { extension: "jpg", kind: "image" },
  "image/png": { extension: "png", kind: "image" },
  "image/webp": { extension: "webp", kind: "image" },
  "image/avif": { extension: "avif", kind: "image" },
  "image/gif": { extension: "gif", kind: "image" },
  "video/mp4": { extension: "mp4", kind: "video" },
  "video/webm": { extension: "webm", kind: "video" },
};
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function sniffMatches(bytes: Uint8Array, mime: string) {
  const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const ascii = (offset: number, text: string) => [...text].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
  switch (mime) {
    case "image/jpeg": return starts(0xff, 0xd8, 0xff);
    case "image/png": return starts(0x89, 0x50, 0x4e, 0x47);
    case "image/gif": return ascii(0, "GIF8");
    case "image/webp": return ascii(0, "RIFF") && ascii(8, "WEBP");
    case "image/avif": return ascii(4, "ftyp");
    case "video/mp4": return ascii(4, "ftyp");
    case "video/webm": return starts(0x1a, 0x45, 0xdf, 0xa3);
    default: return false;
  }
}

function fromRow(row: Record<string, unknown>): MediaItem {
  return {
    id: String(row.id),
    url: String(row.url),
    kind: row.kind === "video" ? "video" : "image",
    mime: String(row.mime),
    sizeBytes: Number(row.size_bytes || 0),
    filename: String(row.filename || ""),
    alt: String(row.alt || ""),
    storage: row.storage === "r2" ? "r2" : "local",
    uploadedBy: String(row.uploaded_by || ""),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export function mediaStorageMode() {
  return r2Configured("public") ? "r2" : "local";
}

export async function saveMediaUpload(file: File, uploadedBy: string, alt = ""): Promise<MediaItem> {
  const type = MEDIA_TYPES[file.type];
  if (!type) throw new HttpError(415, "Use JPG, PNG, WebP, AVIF, GIF, MP4 or WebM files.");
  const limit = type.kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!file.size || file.size > limit) throw new HttpError(413, `Choose a file that is ${type.kind === "video" ? "200" : "20"} MB or less.`);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffMatches(bytes, file.type)) throw new HttpError(415, "That file's contents don't match its type. Export it again and retry.");

  const month = new Date().toISOString().slice(0, 7);
  const id = randomUUID();
  const key = `library/${month}/${id}.${type.extension}`;
  const filename = (file.name || `upload.${type.extension}`).replace(/[^\w.\- ()]+/g, "_").slice(0, 150);
  let url: string;
  let storage: "r2" | "local";

  if (r2Configured("public")) {
    await r2Put("public", key, bytes, file.type);
    url = r2PublicUrl(key);
    storage = "r2";
  } else {
    const directory = join(process.cwd(), "public", "uploads", "library", month);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${id}.${type.extension}`), bytes, { flag: "wx" });
    url = `/uploads/${key}`;
    storage = "local";
  }

  const item: MediaItem = { id, url, kind: type.kind, mime: file.type, sizeBytes: file.size, filename, alt: alt.slice(0, 300), storage, uploadedBy, createdAt: new Date().toISOString() };
  if (postgresEnabled()) {
    await pgQuery(
      "INSERT INTO pcg_media (id, storage, object_key, url, kind, mime, size_bytes, filename, alt, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [id, storage, key, url, type.kind, file.type, file.size, filename, item.alt, uploadedBy],
    );
  }
  return item;
}

export async function listMedia({ kind, search, limit = 60, offset = 0 }: { kind?: string; search?: string; limit?: number; offset?: number } = {}) {
  if (!postgresEnabled()) return { items: [] as MediaItem[], total: 0 };
  const where: string[] = [];
  const values: unknown[] = [];
  if (kind === "image" || kind === "video") { values.push(kind); where.push(`kind = $${values.length}`); }
  if (search) { values.push(`%${search.toLowerCase().slice(0, 80)}%`); where.push(`(lower(filename) LIKE $${values.length} OR lower(alt) LIKE $${values.length})`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = await pgQuery<{ count: string }>(`SELECT COUNT(*)::text AS count FROM pcg_media ${clause}`, values);
  values.push(Math.min(Math.max(limit, 1), 200), Math.max(offset, 0));
  const rows = await pgQuery(`SELECT * FROM pcg_media ${clause} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return { items: rows.rows.map(fromRow), total: Number(total.rows[0]?.count || 0) };
}

export async function updateMediaAlt(id: string, alt: string) {
  const result = await pgQuery("UPDATE pcg_media SET alt = $2 WHERE id = $1 RETURNING *", [id, alt.slice(0, 300)]);
  if (!result.rowCount) throw new HttpError(404, "That file no longer exists.");
  return fromRow(result.rows[0]);
}

export async function deleteMedia(id: string) {
  const result = await pgQuery("DELETE FROM pcg_media WHERE id = $1 RETURNING storage, object_key, url", [id]);
  if (!result.rowCount) throw new HttpError(404, "That file no longer exists.");
  const row = result.rows[0];
  try {
    if (row.storage === "r2") await r2Delete("public", row.object_key);
    else await unlink(join(process.cwd(), "public", "uploads", ...String(row.object_key).split("/")));
  } catch (error) {
    console.error("Media file could not be removed from storage.", error);
  }
  return String(row.url);
}

export async function mediaStats() {
  if (!postgresEnabled()) return { count: 0, bytes: 0 };
  const result = await pgQuery<{ count: string; bytes: string }>("SELECT COUNT(*)::text AS count, COALESCE(SUM(size_bytes),0)::text AS bytes FROM pcg_media");
  return { count: Number(result.rows[0]?.count || 0), bytes: Number(result.rows[0]?.bytes || 0) };
}
