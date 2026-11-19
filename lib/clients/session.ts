import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getClientById, type Client } from "@/lib/clients/store";

/**
 * Client portal sessions: an HMAC-signed cookie, separate from the CMS cookie, that carries the account's
 * session version — changing the password or suspending the account signs out every device.
 */
export const CLIENT_SESSION_COOKIE = "pcg_client_session";
const SESSION_DAYS = 30;

function key() {
  const base = process.env.RESERVATION_SESSION_SECRET || "";
  return base.length >= 32 ? createHmac("sha256", base).update("pcg-client-portal-v1").digest() : null;
}

function sign(payload: string) {
  const secret = key();
  return secret ? createHmac("sha256", secret).update(payload).digest("base64url") : "";
}

export function createClientSessionToken(client: Pick<Client, "id" | "sessionVersion">) {
  const payload = Buffer.from(JSON.stringify({ c: client.id, v: client.sessionVersion, e: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

async function clientFromToken(token: string | undefined): Promise<Client | null> {
  if (!token || !key()) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { c?: unknown; v?: unknown; e?: unknown };
    if (typeof data.c !== "string" || typeof data.v !== "number" || typeof data.e !== "number" || data.e < Date.now() / 1000) return null;
    const client = await getClientById(data.c);
    if (!client || client.status !== "active" || client.sessionVersion !== data.v) return null;
    return client;
  } catch {
    return null;
  }
}

export async function getClientFromRequest(request: Request) {
  const cookie = (request.headers.get("cookie") || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${CLIENT_SESSION_COOKIE}=`));
  return clientFromToken(cookie ? decodeURIComponent(cookie.slice(CLIENT_SESSION_COOKIE.length + 1)) : undefined);
}

/** For server components (pages under /account). */
export async function getCurrentClient() {
  return clientFromToken((await cookies()).get(CLIENT_SESSION_COOKIE)?.value);
}

export function clientSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CLIENT_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}

export function clearClientSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CLIENT_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
