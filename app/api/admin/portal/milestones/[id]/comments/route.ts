import { route, staffViewer } from "@/lib/portal/api";
import { addMilestoneComment } from "@/lib/portal/projects";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: Context) => {
  const { actor } = await staffViewer(request, true);
  const { id } = await context.params;
  await addMilestoneComment(id, { type: "staff", name: actor.name }, (await readJsonBody<{ body?: unknown }>(request)).body);
  return { ok: true };
});
