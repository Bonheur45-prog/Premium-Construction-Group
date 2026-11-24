import { route, staffViewer } from "@/lib/portal/api";
import { createConversation, listConversations, sendMessage } from "@/lib/portal/chat";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { HttpError, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const { viewer } = await staffViewer(request);
  const url = new URL(request.url);
  return { conversations: await listConversations(viewer, { search: url.searchParams.get("q") || "", status: url.searchParams.get("status") || "" }) };
});

/** Starts a conversation (subject + optional first message). */
export const POST = route(async (request: Request) => {
  const { viewer, actor } = await staffViewer(request, true);
  const body = await readJsonBody<{ subject?: unknown; message?: unknown; clientId?: unknown; fileIds?: unknown }>(request);
  if (!(await takeRateLimit("conversation-new", actor.id, 20, 3600))) throw new HttpError(429, "You've started a lot of conversations. Please wait a little.");
  const clientId = String(body.clientId || "");
  if (!clientId) throw new HttpError(400, "Choose a client.");
  const id = await createConversation({ clientId, subject: body.subject, actor });
  if ((typeof body.message === "string" && body.message.trim()) || (Array.isArray(body.fileIds) && body.fileIds.length)) {
    await sendMessage(id, viewer, { body: body.message, fileIds: body.fileIds, origin: publicOrigin(request) });
  }
  return { id };
});
