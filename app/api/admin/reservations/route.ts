import { hasValidAdminSession } from "@/lib/reservations/auth";
import { listReservations } from "@/lib/reservations/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasValidAdminSession(request)) {
    return Response.json({ error: "Sign in to view reservations." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  return Response.json({ reservations: listReservations() }, { headers: { "Cache-Control": "no-store" } });
}
