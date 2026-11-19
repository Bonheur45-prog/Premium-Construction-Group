import { requireStaff } from "@/lib/admin/guard";
import { deleteProject, sanitizeProject, saveProject } from "@/lib/projects/store";
import { logActivity } from "@/lib/server/activity";
import { errorResponse, readJsonBody } from "@/lib/server/http";
import { getSiteContent } from "@/lib/site-content/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    const content = await getSiteContent();
    const data = sanitizeProject(await readJsonBody(request, 200_000), content.projects.categories.map((category) => category.id));
    const project = await saveProject(id, data);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "page.project-update", `${project.published ? "updated" : "saved a draft of"} the project “${project.title}”`, { type: "project", id });
    return Response.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    await deleteProject(id);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "page.project-delete", "deleted a project", { type: "project", id });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
