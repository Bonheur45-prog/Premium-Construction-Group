import { requireStaff } from "@/lib/admin/guard";
import { PRIORITIES, isRequestStatus } from "@/lib/portal/constants";
import { notifyClientStatus } from "@/lib/requests/email";
import { getRequestDetail, markSeen, statusLabel, updateRequest } from "@/lib/requests/store";
import { logActivity } from "@/lib/server/activity";
import { cleanText, errorResponse, HttpError, noStore, publicOrigin, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireStaff(request);
    const { id } = await context.params;
    const detail = await getRequestDetail(id.startsWith("PCG-") ? { ref: id } : { id }, { type: "staff" });
    if (!detail) throw new HttpError(404, "This request no longer exists.");
    await markSeen(detail.id, "staff");
    return Response.json({ request: detail }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** PATCH { status?, note?, notifyClient?, priority?, assignedTo?, progress?, title? } */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff(request, { write: true });
    const { id } = await context.params;
    const body = await readJsonBody(request, 12_000);
    const status = isRequestStatus(body.status) ? body.status : undefined;
    const priority = PRIORITIES.some((item) => item.id === body.priority) ? (body.priority as (typeof PRIORITIES)[number]["id"]) : undefined;
    const note = cleanText(body.note, 4_000);
    const result = await updateRequest(id, {
      status, priority, note,
      assignedTo: typeof body.assignedTo === "string" ? cleanText(body.assignedTo, 40) : undefined,
      progress: typeof body.progress === "number" && Number.isFinite(body.progress) ? body.progress : undefined,
      title: cleanText(body.title, 160) || undefined,
    }, { id: user.id, name: user.username });
    let clientNotified = false;
    if (result.statusChanged) {
      if (body.notifyClient !== false) clientNotified = await notifyClientStatus(id, result.to, note, publicOrigin(request));
      await logActivity({ type: "staff", id: user.id, name: user.username }, "request.status", `moved a request to ${statusLabel(result.to)}`, { type: "request", id });
    }
    const detail = await getRequestDetail({ id }, { type: "staff" });
    return Response.json({ request: detail, clientNotified });
  } catch (error) {
    return errorResponse(error);
  }
}
