import { requireStaff } from "@/lib/admin/guard";
import { listProjects, sanitizeProject, saveProject } from "@/lib/projects/store";
import { logActivity } from "@/lib/server/activity";
import { errorResponse, noStore, readJsonBody } from "@/lib/server/http";
import { getSiteContent } from "@/lib/site-content/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireStaff(request);
    const content = await getSiteContent();
    return Response.json({
      projects: await listProjects(),
      categories: content.projects.categories.map((category) => ({ id: category.id, label: category.type })),
    }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request, { write: true });
    const content = await getSiteContent();
    const data = sanitizeProject(await readJsonBody(request, 200_000), content.projects.categories.map((category) => category.id));
    const project = await saveProject(null, data);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "page.project-create", `added the project “${project.title}”`, { type: "project", id: project.id });
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
