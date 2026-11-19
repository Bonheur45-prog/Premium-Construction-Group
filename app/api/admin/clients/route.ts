import { requireStaff } from "@/lib/admin/guard";
import { listClients } from "@/lib/clients/store";
import { errorResponse, noStore } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireStaff(request);
    return Response.json({ clients: await listClients(new URL(request.url).searchParams.get("q") || "") }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
