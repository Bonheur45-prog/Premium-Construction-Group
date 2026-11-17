import { isSameOriginRequest } from "@/lib/reservations/auth";
import { unsubscribeFromInsights, verifyInsightUnsubscribeToken } from "@/lib/insights/subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 2_000) return Response.json({ error: "The request is too large." }, { status: 413 });
    raw = JSON.parse(body);
  } catch {
    return Response.json({ error: "This unsubscribe link is not valid." }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return Response.json({ error: "This unsubscribe link is not valid." }, { status: 400 });
  const input = raw as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const token = typeof input.token === "string" ? input.token : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !verifyInsightUnsubscribeToken(email, token)) {
    return Response.json({ error: "This unsubscribe link is not valid or has expired." }, { status: 400 });
  }
  try {
    await unsubscribeFromInsights(email);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "We could not update your subscription. Please try again." }, { status: 500 });
  }
}
