import { getInsights } from "@/lib/cms/public";
import { insightEmailDeliveryConfigured, subscribeToInsights } from "@/lib/insights/subscribers";
import { isSameOriginRequest } from "@/lib/reservations/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request could not be verified. Refresh the page and try again." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 4_000) {
    return Response.json({ error: "The form is too large." }, { status: 413 });
  }

  let raw: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 4_000) return Response.json({ error: "The form is too large." }, { status: 413 });
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return Response.json({ error: "Enter your email address and try again." }, { status: 400 });
    }
    raw = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Enter your email address and try again." }, { status: 400 });
  }

  if (clean(raw.website, 200)) return Response.json({ ok: true, status: "subscribed" }, { headers: { "Cache-Control": "no-store" } });

  const email = clean(raw.email, 254).toLowerCase();
  const sourceInsight = clean(raw.sourceInsight, 90);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !sourceInsight || raw.consent !== true) {
    return Response.json({ error: "Enter a valid email and agree to receive insight updates." }, { status: 400 });
  }

  const article = (await getInsights()).find((insight) => insight.slug === sourceInsight);
  if (!article) return Response.json({ error: "This insight is no longer available." }, { status: 404 });

  try {
    const status = await subscribeToInsights(email, sourceInsight);
    return Response.json({ ok: true, status, updatesEnabled: insightEmailDeliveryConfigured() }, { status: status === "subscribed" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "We could not save your subscription. Please try again." }, { status: 500 });
  }
}
