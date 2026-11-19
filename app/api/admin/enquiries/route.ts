import { requireStaff } from "@/lib/admin/guard";
import { listEnquiries } from "@/lib/enquiries/store";
import { errorResponse, noStore } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/enquiries?status=open&q=… */
export async function GET(request: Request) {
  try {
    await requireStaff(request);
    const params = new URL(request.url).searchParams;
    return Response.json(await listEnquiries({ status: params.get("status") || undefined, search: params.get("q") || undefined }), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
