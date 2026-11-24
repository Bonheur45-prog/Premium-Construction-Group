import { clientViewer, route } from "@/lib/portal/api";
import { deleteFile, deliverFile, moveFile, renameFile } from "@/lib/portal/files";
import { readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Opens (or with ?download=1 downloads) one of the client's files through a short-lived private link. */
export const GET = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request);
  const { id } = await context.params;
  return deliverFile(id, client.id, new URL(request.url).searchParams.get("download") === "1");
});

/** { name } renames (all versions); { folderId } moves (null = All files). */
export const PATCH = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request, true);
  const { id } = await context.params;
  const body = await readJsonBody<{ name?: unknown; folderId?: unknown }>(request);
  if (body.name !== undefined) await renameFile(id, client.id, body.name);
  if (body.folderId !== undefined) await moveFile(id, client.id, body.folderId);
  return { ok: true };
});

/** Deletes the file and its versions (?version=only deletes just this version), freeing the space. */
export const DELETE = route(async (request: Request, context: Context) => {
  const { client, actor } = await clientViewer(request, true);
  const { id } = await context.params;
  await deleteFile(id, client.id, actor, { onlyThisVersion: new URL(request.url).searchParams.get("version") === "only" });
  return { ok: true };
});
