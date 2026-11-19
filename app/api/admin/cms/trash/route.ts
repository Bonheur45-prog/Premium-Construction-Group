import { requireStaff } from "@/lib/admin/guard";
import { listTrash } from "@/lib/cms/entries";
import { errorResponse, noStore } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireStaff(request);
    return Response.json({ entries: await listTrash() }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
