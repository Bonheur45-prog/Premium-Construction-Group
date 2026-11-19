import { clearClientSessionCookie, clientSessionCookie, createClientSessionToken, getClientFromRequest } from "@/lib/clients/session";
import { checkPassword, getClientRowByEmail, publicClient, recordLogin } from "@/lib/clients/store";
import { isSameOriginRequest } from "@/lib/reservations/auth";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { cleanEmail, clientIp, errorResponse, HttpError, noStore, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const client = await getClientFromRequest(request);
  if (!client) return Response.json({ error: "Not signed in." }, { status: 401, headers: noStore });
  return Response.json({ client }, { headers: noStore });
}

/** Sign in with email + password. Failed attempts are limited per connection and per email. */
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) throw new HttpError(403, "Request could not be verified. Refresh the page and try again.");
    const body = await readJsonBody(request, 4_000);
    const email = cleanEmail(body.email);
    const password = typeof body.password === "string" ? body.password.slice(0, 128) : "";
    if (!email || !password) throw new HttpError(400, "Enter your email and password.");
    if (!(await takeRateLimit("client-login-ip", clientIp(request), 15, 900)) || !(await takeRateLimit("client-login-email", email, 8, 900))) {
      throw new HttpError(429, "Too many sign-in attempts. Wait 15 minutes, or reset your password.");
    }
    const row = await getClientRowByEmail(email);
    if (!checkPassword(row, password) || !row) throw new HttpError(401, "That email and password didn't match. Check them, or reset your password.");
    if (row.status !== "active") throw new HttpError(403, "This account is paused. Please contact us.");
    await recordLogin(row.id);
    const client = publicClient(row);
    return Response.json({ client }, { headers: { "Set-Cookie": clientSessionCookie(createClientSessionToken(client)), "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "You couldn't be signed in. Please try again.");
  }
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearClientSessionCookie(), "Cache-Control": "no-store" } });
}
