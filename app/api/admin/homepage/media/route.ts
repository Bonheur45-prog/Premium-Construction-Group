import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hasValidAdminSession, isSameOriginRequest } from "@/lib/reservations/auth";

export const runtime = "nodejs";

const mediaTypes: Record<string, { extension: string; kind: "image" | "video" }> = {
  "image/jpeg": { extension: "jpg", kind: "image" },
  "image/png": { extension: "png", kind: "image" },
  "image/webp": { extension: "webp", kind: "image" },
  "image/avif": { extension: "avif", kind: "image" },
  "image/gif": { extension: "gif", kind: "image" },
  "video/mp4": { extension: "mp4", kind: "video" },
  "video/webm": { extension: "webm", kind: "video" },
};

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }
  if (!(await hasValidAdminSession(request))) {
    return Response.json({ error: "Sign in to upload site media." }, { status: 401 });
  }

  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_VIDEO_SIZE + 1024 * 1024) {
    return Response.json({ error: "This file is too large. Videos can be up to 200 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Choose an image or video file to upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an image or video file to upload." }, { status: 400 });
  }

  const media = mediaTypes[file.type];
  if (!media) {
    return Response.json({ error: "Use JPG, PNG, WebP, AVIF, GIF, MP4, or WebM media." }, { status: 415 });
  }
  const maxSize = media.kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (!file.size || file.size > maxSize) {
    const limit = media.kind === "video" ? "200 MB" : "20 MB";
    return Response.json({ error: `Choose a file that is ${limit} or less.` }, { status: 413 });
  }

  const directory = join(process.cwd(), "public", "uploads", "home");
  const filename = `${randomUUID()}.${media.extension}`;
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), Buffer.from(await file.arrayBuffer()), { flag: "wx" });

  return Response.json({ src: `/uploads/home/${filename}`, kind: media.kind });
}
