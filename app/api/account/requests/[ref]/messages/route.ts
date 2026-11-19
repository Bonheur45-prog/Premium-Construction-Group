import { requireClient } from "@/lib/clients/guard";
import { CLIENT_FILE_CATEGORIES } from "@/lib/portal/constants";
import { postToRequest } from "@/lib/requests/actions";
import { notifyStaff } from "@/lib/requests/email";
import { filesFromForm, MAX_FILE_BYTES } from "@/lib/requests/files";
import { getRequestDetail, markSeen } from "@/lib/requests/store";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { logActivity } from "@/lib/server/activity";
import { cleanText, errorResponse, HttpError, publicOrigin } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ ref: string }> };

/** Multipart: body, category, file[] — a client message (and/or documents) on their own request. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const client = await requireClient(request, { write: true, verified: true });
    const { ref } = await context.params;
    const detail = await getRequestDetail({ ref }, { type: "client", clientId: client.id });
    if (!detail) throw new HttpError(404, "We couldn't find that request in your account.");
    if (detail.status === "closed") throw new HttpError(400, "This request is closed. Open a new request if you need anything else.");
    if (Number(request.headers.get("content-length") || 0) > MAX_FILE_BYTES * 10 + 100_000) throw new HttpError(413, "These files are too large to send together. Try fewer at a time.");
    if (!(await takeRateLimit("client-message", client.id, 40, 3600))) throw new HttpError(429, "You've sent a lot of messages in a short time. Please wait a little.");
    const form = await request.formData().catch(() => { throw new HttpError(400, "The message couldn't be read. Please try again."); });
    const category = cleanText(form.get("category"), 30);
    const files = filesFromForm(form);
    const body = cleanText(form.get("body"), 8_000);
    const result = await postToRequest({
      requestId: detail.id, author: { type: "client", id: client.id, name: client.name }, body, files,
      category: (CLIENT_FILE_CATEGORIES as readonly string[]).includes(category) ? category : "other", visibility: "client", kind: "message",
    });
    await markSeen(detail.id, "client");
    await notifyStaff(detail.id, "message", { clientName: client.name, message: body, fileCount: result.fileCount }, publicOrigin(request));
    await logActivity({ type: "client", id: client.id, name: client.name }, "request.message", `${result.fileCount && !body ? `shared ${result.fileCount} file${result.fileCount === 1 ? "" : "s"}` : "sent a message"} on ${detail.ref}`, { type: "request", id: detail.id });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Your message couldn't be sent. Please try again.");
  }
}
