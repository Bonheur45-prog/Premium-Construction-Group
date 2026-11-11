import { getBookedTimes } from "@/lib/reservations/store";

export const RESERVATION_TIME_ZONE = "Africa/Johannesburg";
export const RESERVATION_WINDOW_DAYS = 90;
export const CONSULTATION_DURATION_MINUTES = 60;

export const RESERVATION_TIMES = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

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

export function getReservationDateBounds(now = new Date()) {
  const today = datePartsInTimeZone(now);
  const [year, month, day] = today.split("-").map(Number);
  const lastDate = new Date(Date.UTC(year, month - 1, day + RESERVATION_WINDOW_DAYS));
  const max = [
    lastDate.getUTCFullYear(),
    String(lastDate.getUTCMonth() + 1).padStart(2, "0"),
    String(lastDate.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return { min: today, max };
}

export function isValidReservationDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function isBookableReservationTime(date: string, time: string, now = new Date()) {
  if (!isValidReservationDate(date) || !RESERVATION_TIMES.includes(time)) return false;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (day === 0 || day === 6) return false;

  const { min, max } = getReservationDateBounds(now);
  if (date < min || date > max) return false;
  if (date === min && time <= timePartsInTimeZone(now)) return false;
  return true;
}

export function getAvailableReservationTimes(date: string, excludeReservationId?: string) {
  if (!isValidReservationDate(date)) return [];
  const booked = new Set(getBookedTimes(date, excludeReservationId));
  return RESERVATION_TIMES.filter((time) => isBookableReservationTime(date, time) && !booked.has(time));
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
