import { hasValidAdminSession, isSameOriginRequest } from "@/lib/reservations/auth";
import { fetchRssFeed } from "@/lib/site-content/rss";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  if (!(await hasValidAdminSession(request))) return Response.json({ error: "Sign in to import feeds." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 30_000) return Response.json({ error: "Too many feed URLs." }, { status: 413 });

  let urls: unknown;
  try {
    const body: unknown = await request.json();
    urls = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).urls : null;
  } catch {
    return Response.json({ error: "Enter one or more feed URLs." }, { status: 400 });
  }
  if (!Array.isArray(urls) || urls.length === 0 || urls.length > 12 || urls.some((url) => typeof url !== "string" || url.length > 2_000)) {
    return Response.json({ error: "Add between one and twelve valid feed URLs." }, { status: 400 });
  }

  const feeds = await Promise.all(urls.map(async (url) => {
    try {
      return await fetchRssFeed(url as string);
    } catch (reason) {
      return { url, title: "Feed unavailable", error: reason instanceof Error ? reason.message : "This feed could not be loaded.", items: [] };
    }
  }));
  return Response.json({ feeds }, { headers: { "Cache-Control": "no-store" } });
}
