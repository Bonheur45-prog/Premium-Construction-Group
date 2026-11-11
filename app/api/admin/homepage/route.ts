import { hasValidAdminSession, isSameOriginRequest } from "@/lib/reservations/auth";
import { getHomePageContent, saveHomePageContent } from "@/lib/homepage/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await hasValidAdminSession(request))) {
    return Response.json({ error: "Sign in to edit the homepage." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ content: await getHomePageContent() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }
  if (!(await hasValidAdminSession(request))) {
    return Response.json({ error: "Sign in to edit the homepage." }, { status: 401 });
  }

  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > 200_000) {
    return Response.json({ error: "The homepage content is too large to save." }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return Response.json({ error: "Homepage content could not be read." }, { status: 400 });
  }
  if (new TextEncoder().encode(raw).byteLength > 200_000) {
    return Response.json({ error: "The homepage content is too large to save." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Homepage content was not valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Homepage content was not valid." }, { status: 400 });
  }
  const contentValue = (body as Record<string, unknown>).content;
  if (!contentValue || typeof contentValue !== "object" || Array.isArray(contentValue)) {
    return Response.json({ error: "Homepage content was not valid." }, { status: 400 });
  }

  try {
    const content = await saveHomePageContent(contentValue);
    return Response.json({ content }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Homepage changes could not be saved." }, { status: 500 });
  }
}
