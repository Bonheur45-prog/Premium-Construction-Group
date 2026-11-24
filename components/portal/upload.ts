"use client";

import { fileTypeOf } from "@/lib/portal/file-types";
import type { PortalFileItem } from "@/lib/portal/files";

/**
 * Uploads from the browser:
 *  1. Photos are resized (longest side 2560 px) and re-encoded before upload — usually 5–10× smaller,
 *     still sharp on any screen. Text-like formats (DXF, CSV, old Office files, IFC) are gzip-compressed.
 *     Already-compressed formats (PDF, video, DOCX/XLSX, ZIP, DWG) are sent as they are.
 *  2. The server reserves the space and returns a one-time link.
 *  3. The file goes straight to storage (Cloudflare R2), with a progress bar — never through the website server.
 *  4. The server checks it arrived whole and is the file type it claims to be.
 */
export type UploadTarget = { createUrl: string; completeBase: string; extra?: Record<string, unknown> };
export type UploadProgress = { name: string; loaded: number; total: number; stage: "compressing" | "uploading" | "checking" };

const COMPRESSIBLE_IMAGES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIDE = 2560;

async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE_IMAGES.has(file.type) || file.size < 350_000) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    // PNGs with transparency stay PNG-like (WebP keeps transparency); photos become high-quality JPEG.
    const type = file.type === "image/png" ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.84));
    if (!blob || blob.size >= file.size * 0.9) return file;
    const base = file.name.replace(/\.[a-z0-9]+$/i, "");
    return new File([blob], `${base}.${type === "image/webp" ? "webp" : "jpg"}`, { type, lastModified: file.lastModified });
  } catch {
    return file; // the browser can't read it (e.g. some HEIC files) — send the original
  }
}

async function gzip(file: File): Promise<{ blob: Blob; encoding: "gzip" } | null> {
  if (typeof CompressionStream === "undefined" || !fileTypeOf(file.name)?.compressible || file.size < 20_000) return null;
  try {
    const blob = await new Response(file.stream().pipeThrough(new CompressionStream("gzip"))).blob();
    return blob.size < file.size * 0.85 ? { blob, encoding: "gzip" } : null;
  } catch {
    return null;
  }
}

function put(url: string, body: Blob, onProgress: (loaded: number) => void, headers: Record<string, string>) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    Object.entries(headers).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.onprogress = (event) => onProgress(event.loaded);
    request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(request.status === 413 ? "The file is too large." : "The upload didn't finish. Please try again.")));
    request.onerror = () => reject(new Error("The connection dropped during the upload. Please try again."));
    request.send(body);
  });
}

async function json<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "The upload couldn't start. Please try again.");
  return data as T;
}

export async function uploadFile(original: File, target: UploadTarget, options: { compressImages?: boolean; onProgress?: (progress: UploadProgress) => void } = {}): Promise<PortalFileItem> {
  const report = (progress: Omit<UploadProgress, "name">) => options.onProgress?.({ name: original.name, ...progress });
  if (!fileTypeOf(original.name)) throw new Error(`“${original.name}” isn't a file type we accept.`);
  report({ loaded: 0, total: original.size, stage: "compressing" });
  const file = options.compressImages === false ? original : await compressImage(original);
  const packed = await gzip(file);
  const body: Blob = packed?.blob || file;
  const { id, upload } = await json<{ id: string; upload: { url: string; direct: boolean } }>(target.createUrl, {
    ...target.extra, name: file.name, size: body.size, originalSize: original.size, encoding: packed?.encoding || "",
  });
  report({ loaded: 0, total: body.size, stage: "uploading" });
  await put(upload.url, body, (loaded) => report({ loaded, total: body.size, stage: "uploading" }), upload.direct ? {} : { "Content-Type": "application/octet-stream" });
  report({ loaded: body.size, total: body.size, stage: "checking" });
  const { file: stored } = await json<{ file: PortalFileItem }>(`${target.completeBase}/${id}/complete`, {});
  return stored;
}

export const clientUploadTarget = (extra: Record<string, unknown> = {}): UploadTarget => ({ createUrl: "/api/portal/files", completeBase: "/api/portal/files", extra });
export const staffUploadTarget = (clientId: string, extra: Record<string, unknown> = {}): UploadTarget => ({ createUrl: `/api/admin/portal/clients/${clientId}/files`, completeBase: "/api/admin/portal/files", extra });
