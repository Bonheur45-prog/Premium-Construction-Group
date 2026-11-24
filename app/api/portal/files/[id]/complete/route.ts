import { clientViewer, route } from "@/lib/portal/api";
import { completeUpload } from "@/lib/portal/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Step 2 of an upload: checks the file arrived whole and is what it says it is. */
export const POST = route(async (request: Request, context: Context) => {
  const { client } = await clientViewer(request, true);
  const { id } = await context.params;
  return { file: await completeUpload(id, client.id) };
});
