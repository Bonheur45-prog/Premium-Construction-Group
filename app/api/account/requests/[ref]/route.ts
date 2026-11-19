import { requireClient } from "@/lib/clients/guard";
import { getRequestDetail, markSeen } from "@/lib/requests/store";
import { errorResponse, HttpError, noStore } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ ref: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const client = await requireClient(request, { verified: true });
    const { ref } = await context.params;
    const detail = await getRequestDetail({ ref }, { type: "client", clientId: client.id });
    if (!detail) throw new HttpError(404, "We couldn't find that request in your account.");
    await markSeen(detail.id, "client");
    return Response.json({ request: detail }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
