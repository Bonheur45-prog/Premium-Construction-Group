import { getAdminSessionUserFromRequest } from "@/lib/reservations/auth";
import { logActivity } from "@/lib/server/activity";
import { publicOrigin } from "@/lib/server/http";
import { hasValidAdminSession, isSameOriginRequest } from "@/lib/reservations/auth";
import { saveSiteContent, getSiteContent } from "@/lib/site-content/store";
import { sendInsightPublication } from "@/lib/insights/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasValidAdminSession(request))) {
    return Response.json({ error: "Sign in to edit site pages." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ content: await getSiteContent(), aiConfigured: Boolean(process.env.OPENAI_API_KEY) }, { headers: { "Cache-Control": "no-store" } });
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
    const previous = await getSiteContent();
    const previouslyPublished = new Set(previous.insights.articles.filter((article) => article.status === "published").map((article) => article.slug));
    const content = await saveSiteContent((body as { content: unknown }).content);
    const newlyPublished = content.insights.articles.filter((article) => article.status === "published" && !previouslyPublished.has(article.slug));
    const insightNotifications = await Promise.all(newlyPublished.map(async (article) => ({
      slug: article.slug,
      ...(await sendInsightPublication(article, publicOrigin(request))),
    })));
    const editor = await getAdminSessionUserFromRequest(request);
    if (editor) await logActivity({ type: "staff", id: editor.id, name: editor.username }, "page.update", newlyPublished.length ? `published “${newlyPublished[0].title}”${newlyPublished.length > 1 ? ` and ${newlyPublished.length - 1} more` : ""}` : "updated the website pages", { type: "page" });
    return Response.json({ content, insightNotifications }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Site content could not be saved." }, { status: 500 });
  }
}
