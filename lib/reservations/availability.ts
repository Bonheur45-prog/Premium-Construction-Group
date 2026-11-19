import { getBookedTimes } from "@/lib/reservations/store";
import { getReservationSettings } from "@/lib/reservations/settings";

/** Rwanda (Central Africa Time, UTC+2 all year — no daylight saving). */
export const RESERVATION_TIME_ZONE = "Africa/Kigali";
export const RESERVATION_WINDOW_DAYS = 90;
export const CONSULTATION_DURATION_MINUTES = 60;

function toTimeLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timesFromSettings(settings: Awaited<ReturnType<typeof getReservationSettings>>) {
  const times: string[] = [];
  for (
    let time = settings.startMinutes;
    time + settings.durationMinutes <= settings.endMinutes;
    time += settings.durationMinutes
  ) {
    times.push(toTimeLabel(time));
  }
  return times;
}

export async function getReservationTimes() {
  return timesFromSettings(await getReservationSettings());
}

function datePartsInTimeZone(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RESERVATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function timePartsInTimeZone(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: RESERVATION_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function dateBounds(windowDays: number, now = new Date()) {
  const today = datePartsInTimeZone(now);
  const [year, month, day] = today.split("-").map(Number);
  const lastDate = new Date(Date.UTC(year, month - 1, day + windowDays));
  const max = [
    lastDate.getUTCFullYear(),
    String(lastDate.getUTCMonth() + 1).padStart(2, "0"),
    String(lastDate.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return { min: today, max };
}

export async function getReservationDateBounds(now = new Date()) {
  return dateBounds((await getReservationSettings()).windowDays, now);
}

export function isValidReservationDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export async function isBookableReservationTime(date: string, time: string, now = new Date()) {
  const settings = await getReservationSettings();
  if (!settings.enabled || !isValidReservationDate(date) || !timesFromSettings(settings).includes(time)) return false;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  if (!settings.weekdays[dayNames[day]]) return false;

  const { min, max } = dateBounds(settings.windowDays, now);
  if (date < min || date > max) return false;
  if (date === min && time <= timePartsInTimeZone(now)) return false;
  return true;
}

export async function getAvailableReservationTimes(date: string, excludeReservationId?: string) {
  if (!isValidReservationDate(date)) return [];
  const settings = await getReservationSettings();
  if (!settings.enabled) return [];
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  if (!settings.weekdays[dayNames[day]]) return [];
  const { min, max } = dateBounds(settings.windowDays);
  if (date < min || date > max) return [];
  const lastAllowedTimeToday = date === min ? timePartsInTimeZone(new Date()) : "";
  const booked = new Set(await getBookedTimes(date, excludeReservationId));
  return timesFromSettings(settings).filter((time) => time > lastAllowedTimeToday && !booked.has(time));
}

export function formatReservationDateTime(date: string, time: string) {
  const appointment = new Date(`${date}T${time}:00+02:00`);
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: RESERVATION_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(appointment);
}
