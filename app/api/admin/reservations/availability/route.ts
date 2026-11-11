import { hasValidAdminSession } from "@/lib/reservations/auth";
import { getAvailableReservationTimes, getReservationDateBounds, isValidReservationDate } from "@/lib/reservations/availability";
import { getReservation } from "@/lib/reservations/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasValidAdminSession(request))) {
    return Response.json({ error: "Sign in to manage reservations." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "";
  const reservationId = url.searchParams.get("reservationId") || "";
  if (!isValidReservationDate(date) || !reservationId || !(await getReservation(reservationId))) {
    return Response.json({ error: "Choose a valid date." }, { status: 400 });
  }

  return Response.json(
    { date, availableTimes: await getAvailableReservationTimes(date, reservationId), ...await getReservationDateBounds() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
