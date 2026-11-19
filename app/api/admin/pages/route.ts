import { getAdminSessionUserFromRequest } from "@/lib/reservations/auth";
import { logActivity } from "@/lib/server/activity";
import { hasValidAdminSession, isSameOriginRequest } from "@/lib/reservations/auth";
import { saveSiteContent, getSiteContent } from "@/lib/site-content/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasValidAdminSession(request))) {
    return Response.json({ error: "Sign in to edit site pages." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ content: await getSiteContent() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  if (!(await hasValidAdminSession(request))) return Response.json({ error: "Sign in to edit site pages." }, { status: 401 });
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > 1_000_000) return Response.json({ error: "Site content is too large to save." }, { status: 413 });

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 1_000_000) return Response.json({ error: "Site content is too large to save." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Site content was not valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("content" in body)) {
    return Response.json({ error: "Site content was not valid." }, { status: 400 });
  }
  try {
    const content = await saveSiteContent((body as { content: unknown }).content);
    const editor = await getAdminSessionUserFromRequest(request);
    if (editor) await logActivity({ type: "staff", id: editor.id, name: editor.username }, "page.update", "updated the website pages and settings", { type: "page" });
    return Response.json({ content }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Site content could not be saved." }, { status: 500 });
  }
}
