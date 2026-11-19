import { takeRateLimit } from "@/lib/security/rate-limit";
import { logActivity } from "@/lib/server/activity";
import { clientIp } from "@/lib/server/http";
import {
  adminConfigurationReady,
  adminSessionCookie,
  clearAdminSessionCookie,
  createAdminSessionToken,
  getAdminSessionUserFromRequest,
  isSameOriginRequest,
} from "@/lib/reservations/auth";
import { bootstrapCmsAdmin, findCmsUserByUsername, verifyCmsPassword } from "@/lib/admin/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAdminSessionUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in to open the admin dashboard." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ authenticated: true, user }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }
  if (!(await adminConfigurationReady())) {
    return Response.json({ error: "Create the first CMS account by setting ADMIN_DASHBOARD_USERNAME and an ADMIN_DASHBOARD_PASSWORD of at least 12 characters in .env.local, then restart the app." }, { status: 503 });
  }
  if (Number(request.headers.get("content-length") || 0) > 2_000) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  let username = "";
  let password = "";
  try {
    const raw: unknown = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return Response.json({ error: "Enter a username and password." }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;
    username = typeof body.username === "string" ? body.username.slice(0, 64) : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "Enter a username and password." }, { status: 400 });
  }
  if (!username.trim() || !password || password.length > 128) {
    return Response.json({ error: "Enter a valid username and password (maximum 128 characters)." }, { status: 400 });
  }

  const ip = clientIp(request);
  if (!(await takeRateLimit("admin-login-ip", ip, 12, 15 * 60)) || !(await takeRateLimit("admin-login-user", username.trim(), 8, 15 * 60))) {
    return Response.json({ error: "Too many sign-in attempts. Wait 15 minutes and try again." }, { status: 429 });
  }

  let user: Awaited<ReturnType<typeof findCmsUserByUsername>> = null;
  try {
    await bootstrapCmsAdmin();
    user = await findCmsUserByUsername(username);
    if (!user || !verifyCmsPassword(user, password)) {
      return Response.json({ error: "That username and password were not accepted." }, { status: 401 });
    }
  } catch {
    return Response.json({ error: "The CMS account store could not be read." }, { status: 500 });
  }

  if (!user) return Response.json({ error: "That username and password were not accepted." }, { status: 401 });
  await logActivity({ type: "staff", id: user.id, name: user.username }, "user.signin", "signed in to the workspace", { type: "user", id: user.id });
  return Response.json(
    { ok: true, user: { id: user.id, username: user.username, role: user.role } },
    { headers: { "Set-Cookie": adminSessionCookie(createAdminSessionToken(user.id)), "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearAdminSessionCookie(), "Cache-Control": "no-store" } });
}
