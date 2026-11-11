import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getCmsUserById, hasCmsUsers, normalizeUsername, type CmsUserSummary } from "@/lib/admin/users";

const SESSION_DURATION_SECONDS = 12 * 60 * 60;
export const ADMIN_SESSION_COOKIE = "pcg_admin_session";

export function adminConfigurationReady() {
  const hasBootstrapCredentials = (process.env.ADMIN_DASHBOARD_PASSWORD?.length || 0) >= 12 &&
    Boolean(normalizeUsername(process.env.ADMIN_DASHBOARD_USERNAME || "admin"));
  return (process.env.RESERVATION_SESSION_SECRET?.length || 0) >= 32 && (hasCmsUsers() || hasBootstrapCredentials);
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

function sessionUserFromToken(token: string | undefined): CmsUserSummary | null {
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
    return getCmsUserById(session.userId);
  } catch {
    return null;
  }
}

export function getAdminSessionUserFromRequest(request: Request) {
  return sessionUserFromToken(getAdminSessionTokenFromRequest(request));
}

export function isAdminSession(request: Request) {
  return getAdminSessionUserFromRequest(request)?.role === "admin";
}

export function verifyAdminSessionToken(token: string | undefined) {
  return sessionUserFromToken(token) !== null;
}

export function getAdminSessionTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const prefix = `${ADMIN_SESSION_COOKIE}=`;
  const value = cookieHeader.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

export function hasValidAdminSession(request: Request) {
  return getAdminSessionUserFromRequest(request) !== null;
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
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
