import { getClientFromRequest } from "@/lib/clients/session";
import { getAdminSessionUserFromRequest } from "@/lib/reservations/auth";
import { deliverRequestFile } from "@/lib/requests/files";
import { getFileForDownload } from "@/lib/requests/store";
import { errorResponse } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/files/<id>[?download=1] — the only way to open a request document.
 * Staff can open any file; a client only files on their own requests that are shared with them.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const file = await getFileForDownload(id);
    const notFound = Response.json({ error: "This file isn't available." }, { status: 404 });
    if (!file) return notFound;
    const staff = await getAdminSessionUserFromRequest(request);
    if (!staff) {
      const client = await getClientFromRequest(request);
      if (!client || !client.verified || file.client_id !== client.id || file.visibility !== "client") return notFound;
    }
    return deliverRequestFile(file, new URL(request.url).searchParams.get("download") === "1");
  } catch (error) {
    return errorResponse(error);
  }
}
