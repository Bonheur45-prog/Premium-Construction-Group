import { route, staffViewer } from "@/lib/portal/api";
import { startCall } from "@/lib/portal/chat";
import { publicOrigin } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Creates a private video room and posts the invitation in the conversation. */
export const POST = route(async (request: Request, context: Context) => {
  const { viewer } = await staffViewer(request, true);
  const { id } = await context.params;
  return { message: await startCall(id, viewer, publicOrigin(request)) };
});
