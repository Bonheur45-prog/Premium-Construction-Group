import { getAvailableReservationTimes, getReservationDateBounds, RESERVATION_TIME_ZONE } from "@/lib/reservations/availability";
import { isValidReservationDate } from "@/lib/reservations/availability";
import { getReservationSettings } from "@/lib/reservations/settings";

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
      availableTimes: await getAvailableReservationTimes(date),
      ...await getReservationDateBounds(),
      timeZone: RESERVATION_TIME_ZONE,
      durationMinutes: (await getReservationSettings()).durationMinutes,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
