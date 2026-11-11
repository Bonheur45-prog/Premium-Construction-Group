import { getAvailableReservationTimes, getReservationDateBounds, CONSULTATION_DURATION_MINUTES, RESERVATION_TIME_ZONE } from "@/lib/reservations/availability";
import { isValidReservationDate } from "@/lib/reservations/availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") || "";
  if (!isValidReservationDate(date)) {
    return Response.json({ error: "Choose a valid date." }, { status: 400 });
  }

  return Response.json(
    {
      date,
      availableTimes: getAvailableReservationTimes(date),
      ...getReservationDateBounds(),
      timeZone: RESERVATION_TIME_ZONE,
      durationMinutes: CONSULTATION_DURATION_MINUTES,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
