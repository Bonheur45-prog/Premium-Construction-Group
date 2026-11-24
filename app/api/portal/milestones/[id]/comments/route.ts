import { requireFeature } from "@/lib/features";
import { clientViewer, route } from "@/lib/portal/api";
import { addMilestoneComment } from "@/lib/portal/projects";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request, true);
  await requireFeature("progress");
  const { id } = await context.params;
  await addMilestoneComment(id, { type: "client", name: client.name, clientId: client.id }, (await readJsonBody<{ body?: unknown }>(request)).body);
  return { ok: true };
});
