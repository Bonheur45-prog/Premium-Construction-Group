import { route, staffViewer } from "@/lib/portal/api";
import { completeUpload } from "@/lib/portal/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: Context) => {
  await staffViewer(request, true);
  const { id } = await context.params;
  return { file: await completeUpload(id) };
});
