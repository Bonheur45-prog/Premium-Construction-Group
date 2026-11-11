import { getAvailableReservationTimes, isBookableReservationTime } from "@/lib/reservations/availability";
import { sendReservationConfirmation } from "@/lib/reservations/email";
import { createReservation, ReservationSlotUnavailableError, setReservationEmailStatus } from "@/lib/reservations/store";
import { PROJECT_TYPES, type ReservationInput } from "@/lib/reservations/types";
import { isSameOriginRequest } from "@/lib/reservations/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified. Refresh the page and try again." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12_000) return Response.json({ error: "The form is too large." }, { status: 413 });

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Enter your details and try again." }, { status: 400 });
  }

  if (clean(raw.website, 200)) return Response.json({ ok: true });

  const input: ReservationInput = {
    name: clean(raw.name, 140),
    email: clean(raw.email, 254).toLowerCase(),
    phone: clean(raw.phone, 60),
    enquiryType: raw.enquiryType === "company" ? "company" : "personal",
    company: clean(raw.company, 160),
    projectType: clean(raw.projectType, 80),
    message: clean(raw.message, 1800),
    date: clean(raw.date, 10),
    time: clean(raw.time, 5),
  };

  if (
    input.name.length < 2 ||
    !validEmail(input.email) ||
    (input.phone && input.phone.length < 5) ||
    (input.enquiryType === "company" && input.company.length < 2) ||
    !PROJECT_TYPES.includes(input.projectType as (typeof PROJECT_TYPES)[number]) ||
    input.message.length > 1800 ||
    !isBookableReservationTime(input.date, input.time)
  ) {
    return Response.json({ error: "Check your details and choose an available weekday time." }, { status: 400 });
  }

  try {
    if (!getAvailableReservationTimes(input.date).includes(input.time)) {
      return Response.json({ error: "That time is no longer available. Choose another time." }, { status: 409 });
    }

    const reservation = createReservation(input);
    const adminUrl = `${new URL(request.url).origin}/admin/reservations`;
    const delivery = await sendReservationConfirmation(reservation, adminUrl);
    setReservationEmailStatus(reservation.id, delivery.customer, delivery.admin);

    return Response.json(
      {
        ok: true,
        reservation: { id: reservation.id, date: reservation.date, time: reservation.time },
        notifications: delivery,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ReservationSlotUnavailableError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Could not save a reservation.");
    return Response.json({ error: "We could not save your reservation. Please try again." }, { status: 500 });
  }
}
