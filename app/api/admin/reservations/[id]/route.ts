import { hasValidAdminSession, isSameOriginRequest } from "@/lib/reservations/auth";
import { isBookableReservationTime } from "@/lib/reservations/availability";
import { sendReservationCancelled, sendReservationRescheduled } from "@/lib/reservations/email";
import { sendReservationConfirmation } from "@/lib/reservations/email";
import {
  cancelReservation,
  getReservation,
  moveReservation,
  ReservationSlotUnavailableError,
  setReservationEmailStatus,
} from "@/lib/reservations/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!(await hasValidAdminSession(request))) {
    return Response.json({ error: "Sign in to manage reservations." }, { status: 401 });
  }
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }
  const { id } = await context.params;
  const reservation = await getReservation(id);
  if (!reservation) return Response.json({ error: "This reservation could not be found." }, { status: 404 });

  const adminUrl = `${new URL(request.url).origin}/admin/reservations`;
  const delivery = reservation.status === "confirmed"
    ? await sendReservationConfirmation(reservation, adminUrl)
    : await sendReservationCancelled(reservation, adminUrl);
  await setReservationEmailStatus(id, delivery.customer, delivery.admin);
  return Response.json({
    reservation: { ...reservation, customerEmailSent: delivery.customer, adminEmailSent: delivery.admin },
    notifications: delivery,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await hasValidAdminSession(request))) {
    return Response.json({ error: "Sign in to manage reservations." }, { status: 401 });
  }
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }

  const { id } = await context.params;
  const previous = await getReservation(id);
  if (!previous || previous.status !== "confirmed") {
    return Response.json({ error: "This active reservation could not be found." }, { status: 404 });
  }
  if (Number(request.headers.get("content-length") || 0) > 2_000) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    const raw: unknown = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return Response.json({ error: "Choose a date and time." }, { status: 400 });
    }
    body = raw as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Choose a date and time." }, { status: 400 });
  }
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  if (!(await isBookableReservationTime(date, time))) {
    return Response.json({ error: "Choose an available weekday time within the booking window." }, { status: 400 });
  }

  try {
    const updated = await moveReservation(id, date, time);
    if (!updated) return Response.json({ error: "This reservation is no longer active." }, { status: 404 });
    if (updated.date === previous.date && updated.time === previous.time) {
      return Response.json({ reservation: updated, unchanged: true });
    }

    const adminUrl = `${new URL(request.url).origin}/admin/reservations`;
    const delivery = await sendReservationRescheduled(previous, updated, adminUrl);
    await setReservationEmailStatus(id, delivery.customer, delivery.admin);
    return Response.json({ reservation: { ...updated, customerEmailSent: delivery.customer, adminEmailSent: delivery.admin }, notifications: delivery });
  } catch (error) {
    if (error instanceof ReservationSlotUnavailableError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Could not reschedule a reservation.");
    return Response.json({ error: "We could not move this reservation. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await hasValidAdminSession(request))) {
    return Response.json({ error: "Sign in to manage reservations." }, { status: 401 });
  }
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }

  const { id } = await context.params;
  const active = await getReservation(id);
  if (!active || active.status !== "confirmed") {
    return Response.json({ error: "This active reservation could not be found." }, { status: 404 });
  }

  const cancelled = await cancelReservation(id);
  if (!cancelled) return Response.json({ error: "This reservation could not be cancelled." }, { status: 409 });
  const adminUrl = `${new URL(request.url).origin}/admin/reservations`;
  const delivery = await sendReservationCancelled(cancelled, adminUrl);
  await setReservationEmailStatus(id, delivery.customer, delivery.admin);
  return Response.json({ reservation: { ...cancelled, status: "cancelled", customerEmailSent: delivery.customer, adminEmailSent: delivery.admin }, notifications: delivery });
}
