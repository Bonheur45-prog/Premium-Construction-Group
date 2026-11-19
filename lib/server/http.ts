import "server-only";

/** Small helpers shared by API routes. */

function firstHeader(request: Request, name: string) {
  return request.headers.get(name)?.split(",")[0]?.trim() || "";
}

/** The public https://… origin the visitor used (Caddy forwards it), for links in emails. */
export function publicOrigin(request: Request) {
  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    try { return new URL(configured).origin; } catch { /* fall through */ }
  }
  const host = firstHeader(request, "x-forwarded-host") || firstHeader(request, "host");
  const proto = firstHeader(request, "x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  if (host && proto) {
    try { return new URL(`${proto}://${host}`).origin; } catch { /* fall through */ }
  }
  return new URL(request.url).origin;
}

/** Visitor IP as seen by Caddy (used only for rate limiting and Turnstile). */
export function clientIp(request: Request) {
  return firstHeader(request, "x-forwarded-for") || firstHeader(request, "x-real-ip") || "unknown";
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Reads a JSON body with a hard size limit. Throws HttpError with a friendly message. */
export async function readJsonBody<T = Record<string, unknown>>(request: Request, maxBytes = 64_000): Promise<T> {
  if (Number(request.headers.get("content-length") || 0) > maxBytes) throw new HttpError(413, "That request is too large.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new HttpError(413, "That request is too large.");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as T;
  } catch {
    throw new HttpError(400, "The request was not valid.");
  }
}

export function errorResponse(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: fallback }, { status: 500 });
}

export function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}

export function cleanEmail(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : "";
}

export const noStore = { "Cache-Control": "no-store" };
