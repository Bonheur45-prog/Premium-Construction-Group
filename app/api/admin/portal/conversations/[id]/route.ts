import { route, staffViewer } from "@/lib/portal/api";
import { getConversation, updateConversation } from "@/lib/portal/chat";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: Context) => {
  const { viewer } = await staffViewer(request);
  const { id } = await context.params;
  const before = Number(new URL(request.url).searchParams.get("before")) || undefined;
  return getConversation(id, viewer, { before });
});

/** Close or re-open, rename, assign to a team member. */
export const PATCH = route(async (request: Request, context: Context) => {
  const { viewer } = await staffViewer(request, true);
  const { id } = await context.params;
  await updateConversation(id, viewer, await readJsonBody(request));
  return { ok: true };
});
