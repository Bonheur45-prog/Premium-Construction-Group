import { route, staffViewer } from "@/lib/portal/api";
import { sendMessage, type MessageKind } from "@/lib/portal/chat";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { HttpError, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Sends a message: text and/or files (already uploaded), a voice note, or a reply. Staff can post internal notes. */
export const POST = route(async (request: Request, context: Context) => {
  const { viewer, actor } = await staffViewer(request, true);
  const { id } = await context.params;
  if (!(await takeRateLimit("chat-message", actor.id, 240, 3600))) throw new HttpError(429, "You're sending messages very quickly. Please wait a moment.");
  const body = await readJsonBody<{ body?: unknown; fileIds?: unknown; replyTo?: unknown; kind?: unknown; internal?: unknown; duration?: unknown; peaks?: unknown }>(request);
  const kind: MessageKind = body.kind === "voice" ? "voice" : "text";
  if (kind === "voice" && (!Array.isArray(body.fileIds) || body.fileIds.length !== 1)) throw new HttpError(400, "The voice note didn't upload. Please record it again.");
  const message = await sendMessage(id, viewer, {
    body: body.body, fileIds: body.fileIds, replyTo: body.replyTo, kind, internal: body.internal === true,
    meta: kind === "voice" ? {
      duration: Math.min(Math.max(Math.round(Number(body.duration) || 0), 0), 3600),
      peaks: Array.isArray(body.peaks) ? body.peaks.slice(0, 64).map((value) => Math.min(Math.max(Number(value) || 0, 0), 1)) : [],
    } : {},
    origin: publicOrigin(request),
  });
  return { message };
});
