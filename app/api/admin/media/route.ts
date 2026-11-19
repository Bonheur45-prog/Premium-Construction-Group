import { requireStaff } from "@/lib/admin/guard";
import { listMedia, mediaStorageMode, saveMediaUpload, MAX_VIDEO_BYTES } from "@/lib/media/library";
import { logActivity } from "@/lib/server/activity";
import { errorResponse, HttpError, noStore } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/media?kind=image&q=roof&offset=0 — browse the media library. */
export async function GET(request: Request) {
  try {
    await requireStaff(request);
    const params = new URL(request.url).searchParams;
    const result = await listMedia({ kind: params.get("kind") || undefined, search: params.get("q") || undefined, offset: Number(params.get("offset") || 0), limit: 60 });
    return Response.json({ ...result, storage: mediaStorageMode() }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/admin/media (multipart: file, alt) — upload to the library. */
export async function POST(request: Request) {
  try {
    const user = await requireStaff(request, { write: true });
    if (Number(request.headers.get("content-length") || 0) > MAX_VIDEO_BYTES + 1024 * 1024) throw new HttpError(413, "This file is too large. Videos can be up to 200 MB.");
    const form = await request.formData().catch(() => { throw new HttpError(400, "Choose an image or video to upload."); });
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Choose an image or video to upload.");
    const item = await saveMediaUpload(file, user.username, typeof form.get("alt") === "string" ? String(form.get("alt")) : "");
    await logActivity({ type: "staff", id: user.id, name: user.username }, "media.upload", `Uploaded ${item.filename}`, { type: "media", id: item.id });
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "The file could not be uploaded. Try again.");
  }
}
