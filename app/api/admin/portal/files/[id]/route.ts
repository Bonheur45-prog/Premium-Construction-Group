import { pgQuery } from "@/lib/db/postgres";
import { route, staffViewer } from "@/lib/portal/api";
import { deleteFile, deliverFile } from "@/lib/portal/files";
import { HttpError } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: Context) => {
  await staffViewer(request);
  const { id } = await context.params;
  return deliverFile(id, undefined, new URL(request.url).searchParams.get("download") === "1");
});

export const DELETE = route(async (request: Request, context: Context) => {
  const { actor } = await staffViewer(request, true);
  const { id } = await context.params;
  const owner = await pgQuery<{ client_id: string }>("SELECT client_id FROM pcg_client_files WHERE id = $1", [id]);
  if (!owner.rows[0]) throw new HttpError(404, "File not found.");
  await deleteFile(id, owner.rows[0].client_id, actor);
  return { ok: true };
});
