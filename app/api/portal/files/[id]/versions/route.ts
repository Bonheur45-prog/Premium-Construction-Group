import { clientViewer, route } from "@/lib/portal/api";
import { fileVersions } from "@/lib/portal/files";
import { pgQuery } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Every version of a file, newest first. */
export const GET = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request);
  const { id } = await context.params;
  const family = await pgQuery<{ family_id: string }>("SELECT family_id FROM pcg_client_files WHERE id = $1 AND client_id = $2", [id, client.id]);
  return { versions: family.rows[0] ? await fileVersions(family.rows[0].family_id, client.id) : [] };
});
