import { requireStaff } from "@/lib/admin/guard";
import { COLLECTIONS, isCollectionId } from "@/lib/cms/collections";
import { createEntry, listEntries } from "@/lib/cms/entries";
import { logActivity } from "@/lib/server/activity";
import { cleanText, errorResponse, HttpError, noStore, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ collection: string }> };

/** GET /api/admin/cms/<collection>?status=published&q=… — the list screen. */
export async function GET(request: Request, context: RouteContext) {
  try {
    await requireStaff(request);
    const { collection } = await context.params;
    if (!isCollectionId(collection)) throw new HttpError(404, "Unknown section.");
    const params = new URL(request.url).searchParams;
    const status = params.get("status");
    return Response.json(await listEntries(collection, {
      status: status === "draft" || status === "published" ? status : "",
      search: params.get("q") || undefined,
    }), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST { title } — creates a draft and returns it, so the editor opens straight away. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { collection } = await context.params;
    if (!isCollectionId(collection)) throw new HttpError(404, "Unknown section.");
    const body = await readJsonBody(request, 2_000);
    const entry = await createEntry(collection, cleanText(body.title, 160), user.username);
    await logActivity({ type: "staff", id: user.id, name: user.username }, "page.create", `added the ${COLLECTIONS[collection].singular} “${entry.title}”`, { type: collection, id: entry.id });
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
