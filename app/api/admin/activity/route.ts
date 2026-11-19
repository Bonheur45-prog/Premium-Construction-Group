import { requireStaff } from "@/lib/admin/guard";
import { activityPage } from "@/lib/server/activity";
import { errorResponse, noStore } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/activity?who=staff&offset=0 — administrators only. */
export async function GET(request: Request) {
  try {
    await requireStaff(request, { adminOnly: true });
    const params = new URL(request.url).searchParams;
    return Response.json(await activityPage({ actorType: params.get("who") || undefined, offset: Number(params.get("offset") || 0) }), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
