import { requireStaff } from "@/lib/admin/guard";
import { postToRequest } from "@/lib/requests/actions";
import { notifyClientMessage } from "@/lib/requests/email";
import { filesFromForm, MAX_FILE_BYTES } from "@/lib/requests/files";
import { getRequestDetail, markSeen } from "@/lib/requests/store";
import { logActivity } from "@/lib/server/activity";
import { cleanText, errorResponse, HttpError, publicOrigin } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Multipart: kind ("message" for the client | "note" internal), body, category, file[]. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    if (Number(request.headers.get("content-length") || 0) > MAX_FILE_BYTES * 10 + 100_000) throw new HttpError(413, "These files are too large to send together.");
    const form = await request.formData().catch(() => { throw new HttpError(400, "The message couldn't be read."); });
    const internal = form.get("kind") === "note";
    const body = cleanText(form.get("body"), 8_000);
    const files = filesFromForm(form);
    const result = await postToRequest({
      requestId: id, author: { type: "staff", id: user.id, name: user.username }, body, files,
      category: cleanText(form.get("category"), 30), visibility: internal ? "internal" : "client", kind: internal ? "note" : "message",
    });
    await markSeen(id, "staff");
    const clientNotified = internal ? false : await notifyClientMessage(id, user.username, body, result.fileCount, publicOrigin(request));
    await logActivity({ type: "staff", id: user.id, name: user.username }, internal ? "request.note" : "request.message", internal ? "added an internal note" : `messaged the client${result.fileCount ? ` with ${result.fileCount} file${result.fileCount === 1 ? "" : "s"}` : ""}`, { type: "request", id });
    return Response.json({ request: await getRequestDetail({ id }, { type: "staff" }), clientNotified }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
