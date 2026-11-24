import { clientViewer, route } from "@/lib/portal/api";
import { createFolder } from "@/lib/portal/files";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (request: Request) => {
  const { client } = await clientViewer(request, true);
  return { folder: await createFolder(client.id, (await readJsonBody<{ name?: unknown }>(request)).name) };
});
