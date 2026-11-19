import { requireStaff } from "@/lib/admin/guard";
import { MAX_VIDEO_BYTES, saveMediaUpload } from "@/lib/media/library";
import { logActivity } from "@/lib/server/activity";
import { errorResponse, HttpError } from "@/lib/server/http";

export const runtime = "nodejs";

/** Upload endpoint used by the page editors' "Upload" buttons. Files go into the shared media library. */
export async function POST(request: Request) {
  try {
    const user = await requireStaff(request, { write: true });
    if (Number(request.headers.get("content-length") || 0) > MAX_VIDEO_BYTES + 1024 * 1024) throw new HttpError(413, "This file is too large. Videos can be up to 200 MB.");
    const form = await request.formData().catch(() => { throw new HttpError(400, "Choose an image or video file to upload."); });
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Choose an image or video file to upload.");
    const item = await saveMediaUpload(file, user.username);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "media.upload", `Uploaded ${item.filename}`, { type: "media", id: item.id });
    return Response.json({ src: item.url, kind: item.kind, item });
  } catch (error) {
    return errorResponse(error, "The file could not be uploaded. Try again.");
  }
}
