import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getCmsUserById, hasCmsUsers, normalizeUsername, type CmsUserSummary } from "@/lib/admin/users";

const SESSION_DURATION_SECONDS = 12 * 60 * 60;
export const ADMIN_SESSION_COOKIE = "pcg_admin_session";

export async function adminConfigurationReady() {
  const hasBootstrapCredentials = (process.env.ADMIN_DASHBOARD_PASSWORD?.length || 0) >= 12 &&
    Boolean(normalizeUsername(process.env.ADMIN_DASHBOARD_USERNAME || "admin"));
  return (process.env.RESERVATION_SESSION_SECRET?.length || 0) >= 32 && (await hasCmsUsers() || hasBootstrapCredentials);
}

function sign(value: string) {
  return createHmac("sha256", process.env.RESERVATION_SESSION_SECRET || "")
    .update(value)
    .digest("base64url");
}

export function createAdminSessionToken(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

async function sessionUserFromToken(token: string | undefined): Promise<CmsUserSummary | null> {
  if (!token || (process.env.RESERVATION_SESSION_SECRET?.length || 0) < 32) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const data: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data || typeof data !== "object" || !("userId" in data) || !("expiresAt" in data)) return null;
    const session = data as { userId: unknown; expiresAt: unknown };
    if (typeof session.userId !== "string" || typeof session.expiresAt !== "number" || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return await getCmsUserById(session.userId);
  } catch {
    return null;
  }
}

export async function getAdminSessionUserFromRequest(request: Request) {
  return sessionUserFromToken(getAdminSessionTokenFromRequest(request));
}

export async function isAdminSession(request: Request) {
  return (await getAdminSessionUserFromRequest(request))?.role === "admin";
}

export async function verifyAdminSessionToken(token: string | undefined) {
  return (await sessionUserFromToken(token)) !== null;
}

export function getAdminSessionTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const prefix = `${ADMIN_SESSION_COOKIE}=`;
  const value = cookieHeader.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

export async function hasValidAdminSession(request: Request) {
  return (await getAdminSessionUserFromRequest(request)) !== null;
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const browserOrigin = new URL(origin).origin;
    if (browserOrigin === new URL(request.url).origin) return true;

    // Behind a reverse proxy (Caddy on the VPS) the app itself is reached over plain http on 127.0.0.1,
    // so also accept the public address the proxy forwards in X-Forwarded-Proto / X-Forwarded-Host.
    const first = (value: string | null) => value?.split(",")[0]?.trim() || "";
    const host = first(request.headers.get("x-forwarded-host")) || first(request.headers.get("host"));
    const proto = first(request.headers.get("x-forwarded-proto")) || new URL(request.url).protocol.replace(":", "");
    if (!host || !proto) return false;
    return browserOrigin === new URL(`${proto}://${host}`).origin;
  } catch {
    return false;
  }
}

export function adminSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}${secure}`;
}

export function clearAdminSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
