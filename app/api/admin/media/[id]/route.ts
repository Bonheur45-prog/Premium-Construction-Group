import { requireStaff } from "@/lib/admin/guard";
import { deleteMedia, updateMediaAlt } from "@/lib/media/library";
import { logActivity } from "@/lib/server/activity";
import { cleanText, errorResponse, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH { alt } — update the image description. */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireStaff(request, { write: true });
    const { id } = await context.params;
    const body = await readJsonBody(request, 4_000);
    return Response.json({ item: await updateMediaAlt(id, cleanText(body.alt, 300)) });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE — remove the file from the library and storage. Pages still using its URL will show a broken image. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    const url = await deleteMedia(id);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "media.delete", `Deleted ${url.split("/").pop()}`, { type: "media", id });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
