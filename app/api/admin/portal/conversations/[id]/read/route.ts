import { route, staffViewer } from "@/lib/portal/api";
import { markRead } from "@/lib/portal/chat";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Marks messages up to `seq` as read (shows the blue ticks on the other side). */
export const POST = route(async (request: Request, context: Context) => {
  const { viewer } = await staffViewer(request, true);
  const { id } = await context.params;
  await markRead(id, viewer, (await readJsonBody<{ seq?: unknown }>(request)).seq);
  return { ok: true };
});
