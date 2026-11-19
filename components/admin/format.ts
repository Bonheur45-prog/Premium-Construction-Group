/** Formatting helpers shared by CMS screens. */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: days > 300 ? "numeric" : undefined });
}

export function formatDate(iso: string, withTime = false) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

export function formatMeeting(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  return {
    day: value.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: value.toLocaleDateString("en-GB", { month: "short" }),
    weekday: value.toLocaleDateString("en-GB", { weekday: "long" }),
    time,
  };
}

/** Wraps fetch for CMS calls: JSON in/out, friendly errors, and signals an expired session to the workspace. */
export async function cmsFetch<T = Record<string, unknown>>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { cache: "no-store", ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Try again.");
  return data as T;
}
