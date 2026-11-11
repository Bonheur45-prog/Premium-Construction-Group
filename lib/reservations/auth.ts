import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_DURATION_SECONDS = 12 * 60 * 60;
export const ADMIN_SESSION_COOKIE = "pcg_admin_session";

export function adminConfigurationReady() {
  return Boolean(process.env.ADMIN_DASHBOARD_PASSWORD && process.env.RESERVATION_SESSION_SECRET);
}

function sign(value: string) {
  return createHmac("sha256", process.env.RESERVATION_SESSION_SECRET || "")
    .update(value)
    .digest("base64url");
}

export function verifyAdminPassword(password: string) {
  const expectedPassword = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!expectedPassword) return false;
  const actual = Buffer.from(password);
  const expected = Buffer.from(expectedPassword);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createAdminSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = Buffer.from(String(expiresAt)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token || !adminConfigurationReady()) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

  const expiresAt = Number(Buffer.from(payload, "base64url").toString("utf8"));
  return Number.isFinite(expiresAt) && expiresAt > Math.floor(Date.now() / 1000);
}

export function getAdminSessionTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const prefix = `${ADMIN_SESSION_COOKIE}=`;
  const value = cookieHeader.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : undefined;
}

export function hasValidAdminSession(request: Request) {
  return verifyAdminSessionToken(getAdminSessionTokenFromRequest(request));
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
