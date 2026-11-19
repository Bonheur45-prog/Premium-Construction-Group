import { requireStaff } from "@/lib/admin/guard";
import { isCollectionId } from "@/lib/cms/collections";
import { reorderEntries } from "@/lib/cms/entries";
import { errorResponse, HttpError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ collection: string }> };

/** POST { ids: [...] } — saves the order from drag-and-drop. */
export async function POST(request: Request, context: RouteContext) {
  try {
    await requireStaff(request, { write: true });
    const { collection } = await context.params;
    if (!isCollectionId(collection)) throw new HttpError(404, "Unknown section.");
    const body = await readJsonBody(request, 40_000);
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string" && id.length < 80) : [];
    await reorderEntries(collection, ids);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
