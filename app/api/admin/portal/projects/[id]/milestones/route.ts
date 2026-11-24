import { route, staffViewer } from "@/lib/portal/api";
import { deleteMilestone, reorderMilestones, saveMilestone } from "@/lib/portal/projects";
import { HttpError, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Adds or updates a milestone. Marking it done posts the news (with photos) in the client's conversation. */
export const POST = route(async (request: Request, context: Context) => {
  await staffViewer(request, true);
  const { id } = await context.params;
  const body = await readJsonBody<{ action?: unknown; milestoneId?: unknown; ids?: unknown }>(request);
  if (body.action === "reorder") { await reorderMilestones(id, body.ids); return { ok: true }; }
  if (body.action === "delete") {
    if (typeof body.milestoneId !== "string") throw new HttpError(400, "Missing milestone.");
    await deleteMilestone(id, body.milestoneId);
    return { ok: true };
  }
  return { id: await saveMilestone(id, body as Parameters<typeof saveMilestone>[1], publicOrigin(request)) };
});
