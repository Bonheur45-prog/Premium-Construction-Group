import "server-only";

import { getSiteContent } from "@/lib/site-content/store";

const DEFAULT_WEEKDAYS = {
  sunday: false,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
};

export type ReservationSettings = {
  enabled: boolean;
  durationMinutes: number;
  windowDays: number;
  hoursLabel: string;
  startMinutes: number;
  endMinutes: number;
  daysLabel: string;
  weekdays: typeof DEFAULT_WEEKDAYS;
};

function parseHours(value: string) {
  const match = value.match(/^\s*(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})\s*$/);
  if (!match) return null;
  const startHour = Number(match[1]);
  const startMinute = Number(match[2]);
  const endHour = Number(match[3]);
  const endMinute = Number(match[4]);
  if ([startMinute, endMinute].some((minute) => minute > 59) || startHour > 23 || endHour > 24 || (endHour === 24 && endMinute !== 0)) return null;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return end > start ? { start, end } : null;
}

export async function getReservationSettings(): Promise<ReservationSettings> {
  const booking = (await getSiteContent()).reservations.booking;
  const hours = parseHours(booking.hours) || { start: 9 * 60, end: 17 * 60 };
  const weekdays = Object.fromEntries(
    Object.entries(DEFAULT_WEEKDAYS).map(([day, defaultValue]) => [
      day,
      typeof booking.weekdays[day as keyof typeof DEFAULT_WEEKDAYS] === "boolean"
        ? booking.weekdays[day as keyof typeof DEFAULT_WEEKDAYS]
        : defaultValue,
    ]),
  ) as typeof DEFAULT_WEEKDAYS;
  const orderedDays = [
    ["monday", "Mon"],
    ["tuesday", "Tue"],
    ["wednesday", "Wed"],
    ["thursday", "Thu"],
    ["friday", "Fri"],
    ["saturday", "Sat"],
    ["sunday", "Sun"],
  ] as const;
  const activeDays = orderedDays.filter(([day]) => weekdays[day]).map(([, label]) => label);
  const daysLabel = activeDays.length === 0
    ? "By arrangement"
    : activeDays.join(", ") === "Mon, Tue, Wed, Thu, Fri"
      ? "Weekdays"
      : activeDays.join(", ") === "Mon, Tue, Wed, Thu, Fri, Sat, Sun"
        ? "Every day"
        : activeDays.join(" · ");

  return {
    enabled: booking.enabled,
    durationMinutes: booking.duration,
    windowDays: booking.windowDays,
    hoursLabel: booking.hours,
    startMinutes: hours.start,
    endMinutes: hours.end,
    daysLabel,
    weekdays,
  };
}
