import { clientViewer, route } from "@/lib/portal/api";
import { receiveLocalUpload } from "@/lib/portal/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Only used when R2 isn't configured: the file streams to the server's private folder (never into memory). */
export const PUT = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request, true);
  const { id } = await context.params;
  await receiveLocalUpload(id, request, client.id);
  return { ok: true };
});
