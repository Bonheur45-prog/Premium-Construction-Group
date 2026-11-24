import { clientViewer, route } from "@/lib/portal/api";
import { deleteFolder, renameFolder } from "@/lib/portal/files";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request, true);
  const { id } = await context.params;
  await renameFolder(id, client.id, (await readJsonBody<{ name?: unknown }>(request)).name);
  return { ok: true };
});

/** Removes the folder; its files go back to “All files”. */
export const DELETE = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request, true);
  const { id } = await context.params;
  await deleteFolder(id, client.id);
  return { ok: true };
});
