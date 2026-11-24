import { route, staffViewer } from "@/lib/portal/api";
import { receiveLocalUpload } from "@/lib/portal/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Only used when R2 isn't configured: streams the file to the server's private folder. */
export const PUT = route(async (request: Request, context: Context) => {
  await staffViewer(request, true);
  const { id } = await context.params;
  await receiveLocalUpload(id, request);
  return { ok: true };
});
