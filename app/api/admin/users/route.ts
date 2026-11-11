import { createCmsUser, listCmsUsers, type CmsUserRole } from "@/lib/admin/users";
import { hasValidAdminSession, isAdminSession, isSameOriginRequest } from "@/lib/reservations/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireManager(request: Request) {
  if (!hasValidAdminSession(request)) return Response.json({ error: "Sign in to manage CMS users." }, { status: 401 });
  if (!isAdminSession(request)) return Response.json({ error: "Only an administrator can manage CMS users." }, { status: 403 });
  return null;
}

export async function GET(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;
  try {
    return Response.json({ users: listCmsUsers() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The CMS account store could not be read." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  const denied = requireManager(request);
  if (denied) return denied;
  if (Number(request.headers.get("content-length") || 0) > 6_000) return Response.json({ error: "Request is too large." }, { status: 413 });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Enter the new account details." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Enter the new account details." }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (typeof data.username !== "string" || typeof data.password !== "string") {
    return Response.json({ error: "A username and password are required." }, { status: 400 });
  }
  const role = data.role === undefined ? "editor" : data.role;
  if (role !== "admin" && role !== "editor") return Response.json({ error: "Choose a valid account role." }, { status: 400 });

  try {
    const user = createCmsUser(data.username, data.password, role as CmsUserRole);
    return Response.json({ user }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "The account could not be created.";
    const duplicate = message.includes("already in use");
    const invalidInput = duplicate || message.startsWith("Use 3–32") || message.startsWith("Passwords must") || message.startsWith("Choose a valid");
    return Response.json({ error: message }, { status: duplicate ? 409 : invalidInput ? 400 : 500 });
  }
}
