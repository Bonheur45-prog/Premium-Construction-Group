import { pgQuery } from "@/lib/db/postgres";
import { route, staffViewer } from "@/lib/portal/api";
import { fileVersions } from "@/lib/portal/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: Context) => {
  await staffViewer(request);
  const { id } = await context.params;
  const family = await pgQuery<{ family_id: string; client_id: string }>("SELECT family_id, client_id FROM pcg_client_files WHERE id = $1", [id]);
  return { versions: family.rows[0] ? await fileVersions(family.rows[0].family_id, family.rows[0].client_id) : [] };
});
