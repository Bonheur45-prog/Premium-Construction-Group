/** fetch wrapper for portal pages: JSON in/out, friendly errors, sends people to sign in when their session ends. */
export async function portalFetch<T = Record<string, unknown>>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { cache: "no-store", ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && typeof window !== "undefined" && !url.includes("/session")) {
    window.location.assign(`/account/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatWhen(iso: string) {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (days < 1 && date.getDate() === new Date().getDate()) return `Today, ${time}`;
  if (days < 2) return `Yesterday, ${time}`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: days > 300 ? "numeric" : undefined }) + `, ${time}`;
}
