import { clientViewer, route } from "@/lib/portal/api";
import { deleteMessage, editMessage, pinMessage } from "@/lib/portal/chat";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** { body } edits your own message (within the allowed minutes); { pinned } pins or unpins any message. */
export const PATCH = route(async (request: Request, context: Context) => {
  const { viewer } = await clientViewer(request, true);
  const { id } = await context.params;
  const body = await readJsonBody<{ body?: unknown; pinned?: unknown }>(request);
  if (typeof body.pinned === "boolean") return { message: await pinMessage(id, viewer, body.pinned) };
  return { message: await editMessage(id, viewer, body.body) };
});

export const DELETE = route(async (request: Request, context: Context) => {
  const { viewer } = await clientViewer(request, true);
  const { id } = await context.params;
  return { message: await deleteMessage(id, viewer) };
});
