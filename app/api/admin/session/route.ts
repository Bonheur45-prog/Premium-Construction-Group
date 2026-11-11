import {
  adminConfigurationReady,
  adminSessionCookie,
  clearAdminSessionCookie,
  createAdminSessionToken,
  isSameOriginRequest,
  verifyAdminPassword,
} from "@/lib/reservations/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }
  if (!adminConfigurationReady()) {
    return Response.json({ error: "The admin dashboard is not configured yet." }, { status: 503 });
  }

  let password = "";
  try {
    const body = await request.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "Enter the admin password." }, { status: 400 });
  }

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "That password was not accepted." }, { status: 401 });
  }

  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": adminSessionCookie(createAdminSessionToken()), "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearAdminSessionCookie(), "Cache-Control": "no-store" } });
}
