import { JOB_TYPES } from "@/lib/cms/collections";

/** “Full-time”, “Contract” … for a job's type value. */
export const jobTypeLabel = (value: string) => JOB_TYPES.find((option) => option.value === value)?.label || "";

/** A date such as 30 November 2026, or "" when empty or invalid. */
export function formatLongDate(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Kigali" });
}
