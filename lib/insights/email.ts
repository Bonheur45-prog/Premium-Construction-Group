import "server-only";

import { createHash } from "node:crypto";
import type { SiteInsight } from "@/lib/site-content/content";
import { createInsightUnsubscribeToken, getActiveInsightSubscribers, insightEmailDeliveryConfigured } from "@/lib/insights/subscribers";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function emailFrame(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f2f5f3;font-family:Arial,sans-serif;color:#183746"><div style="max-width:620px;margin:32px auto;background:#fffefa"><div style="height:8px;background:#efa94f"></div><div style="padding:38px 42px"><p style="margin:0 0 18px;color:#1b5b7c;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Premium Construction Group · Insights</p><h1 style="margin:0 0 20px;color:#102d3d;font:normal 34px/1.15 Georgia,serif">${escapeHtml(title)}</h1>${body}<p style="margin:30px 0 0;color:#6e7c80;font-size:12px;line-height:1.7">Thoughtful construction. Clear communication. Made to last.</p></div></div></body></html>`;
}

export async function sendInsightPublication(article: SiteInsight, origin: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESERVATION_FROM_EMAIL;
  if (!apiKey || !from || !insightEmailDeliveryConfigured()) return { enabled: false, total: 0, sent: 0 };

  const subscribers = await getActiveInsightSubscribers();
  const results: boolean[] = [];
  for (let start = 0; start < subscribers.length; start += 8) {
    const batch = subscribers.slice(start, start + 8);
    results.push(...await Promise.all(batch.map(async (subscriber) => {
      const token = createInsightUnsubscribeToken(subscriber.email);
      if (!token) return false;
      const unsubscribeUrl = new URL("/insights/unsubscribe", origin);
      unsubscribeUrl.searchParams.set("email", subscriber.email);
      unsubscribeUrl.searchParams.set("token", token);
      const articleUrl = new URL(`/insights/${encodeURIComponent(article.slug)}`, origin).toString();
      const body = `<p style="color:#49616a;font-size:15px;line-height:1.8">A new perspective from Premium Construction Group is ready to read.</p><p style="color:#49616a;font-size:15px;line-height:1.8">${escapeHtml(article.excerpt)}</p><p style="margin:25px 0"><a href="${escapeHtml(articleUrl)}" style="display:inline-block;padding:14px 19px;background:#102d3d;color:#fffefa;text-decoration:none;font-size:13px;font-weight:bold">Read the insight ↗</a></p><p style="color:#6e7c80;font-size:12px;line-height:1.7">You received this email because you subscribed to PCG insights. <a href="${escapeHtml(unsubscribeUrl.toString())}" style="color:#1b5b7c">Unsubscribe from future updates</a>.</p>`;
      const idempotencyKey = createHash("sha256").update(`${article.slug}:${subscriber.email}`).digest("hex");
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `pcg-insight-${idempotencyKey}`,
          },
          body: JSON.stringify({
            from,
            to: [subscriber.email],
            subject: `New PCG insight: ${article.title}`,
            text: `A new perspective from Premium Construction Group is ready to read.\n\n${article.title}\n\n${article.excerpt}\n\nRead the insight: ${articleUrl}\n\nUnsubscribe from future updates: ${unsubscribeUrl.toString()}`,
            html: emailFrame(article.title, body),
          }),
          cache: "no-store",
        });
        return response.ok;
      } catch {
        return false;
      }
    })));
  }
  return { enabled: true, total: subscribers.length, sent: results.filter(Boolean).length };
}
