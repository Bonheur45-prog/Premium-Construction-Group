import { route, staffViewer } from "@/lib/portal/api";
import { deleteProject } from "@/lib/portal/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const DELETE = route(async (request: Request, context: Context) => {
  await staffViewer(request, true, true);
  const { id } = await context.params;
  await deleteProject(id);
  return { ok: true };
});
