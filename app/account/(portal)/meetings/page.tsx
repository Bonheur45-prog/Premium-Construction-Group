import { notFound } from "next/navigation";
import { MeetingsView } from "@/components/portal/meetings-view";
import { getFeatures } from "@/lib/features";
import { reservationSystemConfigured } from "@/lib/reservations/email";
import { getReservationSettings } from "@/lib/reservations/settings";
import { getSiteContent } from "@/lib/site-content/store";

export const metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  if (!(await getFeatures()).portalMeetings.enabled) notFound();
  const [settings, enabled, content] = await Promise.all([getReservationSettings(), reservationSystemConfigured(), getSiteContent()]);
  const booking = content.reservations.booking;
  return (
    <MeetingsView booking={{ enabled, windowDays: settings.windowDays, durationMinutes: settings.durationMinutes, daysLabel: content.contact.reservation.daysLabel, hoursLabel: settings.hoursLabel, timezoneLabel: booking.timezone }} />
  );
}
