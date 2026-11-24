import { clientViewer, route } from "@/lib/portal/api";
import { typing } from "@/lib/portal/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** “… is typing” — sent at most every few seconds by the composer. */
export const POST = route(async (request: Request, context: Context) => {
  const { viewer } = await clientViewer(request, true);
  const { id } = await context.params;
  await typing(id, viewer);
  return { ok: true };
});
