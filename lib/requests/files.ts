import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { r2Configured, r2Put, r2SignedGetUrl } from "@/lib/media/r2";
import { PORTAL_FILE_MAX_MB } from "@/lib/portal/constants";
import { HttpError } from "@/lib/server/http";

/**
 * Private documents attached to client requests (plans, photos, quotes, invoices…).
 * Stored in the private R2 bucket when configured, otherwise in the server's private data folder
 * (/var/www/premium-construction/shared/data — never served directly by Caddy).
 */
const TYPES: Record<string, { mime: string; check: (bytes: Uint8Array) => boolean }> = {};
const starts = (...signature: number[]) => (bytes: Uint8Array) => signature.every((byte, index) => bytes[index] === byte);
const ascii = (offset: number, text: string) => (bytes: Uint8Array) => [...text].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
const zip = starts(0x50, 0x4b, 0x03, 0x04);
const ole = starts(0xd0, 0xcf, 0x11, 0xe0);
const add = (extensions: string[], mime: string, check: (bytes: Uint8Array) => boolean) => extensions.forEach((extension) => { TYPES[extension] = { mime, check }; });
add(["pdf"], "application/pdf", ascii(0, "%PDF"));
add(["jpg", "jpeg"], "image/jpeg", starts(0xff, 0xd8, 0xff));
add(["png"], "image/png", starts(0x89, 0x50, 0x4e, 0x47));
add(["webp"], "image/webp", (b) => ascii(0, "RIFF")(b) && ascii(8, "WEBP")(b));
add(["heic", "heif"], "image/heic", ascii(4, "ftyp"));
add(["docx"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document", zip);
add(["xlsx"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zip);
add(["pptx"], "application/vnd.openxmlformats-officedocument.presentationml.presentation", zip);
add(["zip"], "application/zip", zip);
add(["doc"], "application/msword", ole);
add(["xls"], "application/vnd.ms-excel", ole);
add(["ppt"], "application/vnd.ms-powerpoint", ole);
add(["dwg"], "application/acad", ascii(0, "AC10"));
add(["dxf"], "application/dxf", (bytes) => {
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 256));
  return /^\s*0\s*\r?\n\s*SECTION/.test(head) || head.startsWith("AutoCAD Binary DXF");
});

export const MAX_FILE_BYTES = PORTAL_FILE_MAX_MB * 1024 * 1024;

export type StoredFile = { filename: string; mime: string; sizeBytes: number; storage: "r2" | "local"; objectKey: string };

export async function storeRequestFile(file: File, requestId: string): Promise<StoredFile> {
  const original = (file.name || "document").normalize("NFC");
  const extension = original.split(".").pop()?.toLowerCase() || "";
  const type = TYPES[extension];
  if (!type) throw new HttpError(415, `“${original}” isn't a supported file type. Use PDF, images, Word, Excel, PowerPoint, DWG/DXF or ZIP.`);
  if (!file.size) throw new HttpError(400, `“${original}” is empty.`);
  if (file.size > MAX_FILE_BYTES) throw new HttpError(413, `“${original}” is larger than ${PORTAL_FILE_MAX_MB} MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!type.check(bytes)) throw new HttpError(415, `“${original}” doesn't look like a real .${extension} file. Export it again and retry.`);

  const filename = original.replace(/[\u0000-\u001f\\/:*?"<>|]+/g, "_").slice(-150) || `document.${extension}`;
  const objectKey = `requests/${requestId}/${randomUUID()}.${extension}`;
  if (r2Configured("private")) {
    await r2Put("private", objectKey, bytes, type.mime, "private, no-store");
    return { filename, mime: type.mime, sizeBytes: file.size, storage: "r2", objectKey };
  }
  const directory = join(process.cwd(), "data", "private-files", "requests", requestId);
  await mkdir(directory, { recursive: true });
  await writeFile(join(process.cwd(), "data", "private-files", objectKey), bytes, { flag: "wx" });
  return { filename, mime: type.mime, sizeBytes: file.size, storage: "local", objectKey };
}

const INLINE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

/** Sends the file to an authorised viewer: a 2-minute signed R2 link, or the bytes from the private folder. */
export async function deliverRequestFile(file: { storage: string; object_key: string; filename: string; mime: string }, download: boolean) {
  const inline = !download && INLINE.has(file.mime);
  if (file.storage === "r2") {
    return Response.redirect(r2SignedGetUrl("private", file.object_key, 120, file.filename, inline), 302);
  }
  const bytes = await readFile(join(process.cwd(), "data", "private-files", ...file.object_key.split("/"))).catch(() => null);
  if (!bytes) return Response.json({ error: "This file is no longer available." }, { status: 404 });
  const safeName = file.filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    },
  });
}

/** Reads all "file" entries from a multipart form (max 10 per message). */
export function filesFromForm(form: FormData) {
  const files = form.getAll("file").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 10) throw new HttpError(400, "Attach up to 10 files at a time.");
  return files;
}
