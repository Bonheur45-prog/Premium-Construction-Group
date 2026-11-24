import { requireFeature } from "@/lib/features";
import { clientViewer, route } from "@/lib/portal/api";
import { listProjects } from "@/lib/portal/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const { client } = await clientViewer(request);
  await requireFeature("progress");
  return { projects: await listProjects({ clientId: client.id }) };
});
