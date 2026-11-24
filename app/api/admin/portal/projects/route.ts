import { route, staffViewer } from "@/lib/portal/api";
import { listProjects, saveProject } from "@/lib/portal/projects";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await staffViewer(request);
  return { projects: await listProjects({ clientId: new URL(request.url).searchParams.get("client") || undefined }) };
});

/** Creates (or with { id } updates) a client project. */
export const POST = route(async (request: Request) => {
  await staffViewer(request, true);
  return { id: await saveProject(await readJsonBody(request)) };
});
