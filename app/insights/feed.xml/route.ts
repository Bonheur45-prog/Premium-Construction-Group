import { connection } from "next/server";
import { publicOrigin } from "@/lib/server/http";
import { getSiteContent } from "@/lib/site-content/store";
import { getInsights } from "@/lib/cms/public";

export const runtime = "nodejs";

function xml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character]!);
}

function absolute(url: string, origin: string) {
  try { return new URL(url, origin).toString(); } catch { return ""; }
}

/**
 * GET /insights/feed.xml — RSS 2.0 feed of published insights, each with a large image
 * (enclosure + media:content), ready for automations such as Zapier → LinkedIn company page.
 */
export async function GET(request: Request) {
  await connection();
  const content = await getSiteContent();
  const origin = content.siteSettings.seo.siteUrl || publicOrigin(request);
  const brand = content.siteSettings.brand;
  const articles = (await getInsights())
    .filter((article) => !article.noIndex)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, 30);

  const items = articles.map((article) => {
    const link = absolute(`/insights/${encodeURIComponent(article.slug)}`, origin);
    const image = absolute(article.socialImage || article.image, origin);
    const date = article.publishedAt ? new Date(article.publishedAt) : null;
    const type = /\.png(\?|$)/i.test(image) ? "image/png" : /\.webp(\?|$)/i.test(image) ? "image/webp" : "image/jpeg";
    return `    <item>
      <title>${xml(article.seoTitle || article.title)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>
      ${date && !Number.isNaN(date.getTime()) ? `<pubDate>${date.toUTCString()}</pubDate>` : ""}
      <description>${xml(article.metaDescription || article.excerpt)}</description>
      ${article.author ? `<dc:creator>${xml(article.author)}</dc:creator>` : ""}
      ${image ? `<enclosure url="${xml(image)}" type="${type}" length="0" />
      <media:content url="${xml(image)}" medium="image" type="${type}" width="1200">
        ${article.imageAlt ? `<media:description>${xml(article.imageAlt)}</media:description>` : ""}
      </media:content>
      <media:thumbnail url="${xml(image)}" />` : ""}
    </item>`;
  }).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(`${brand.primaryName} ${brand.secondaryName} · Insights`)}</title>
    <link>${xml(absolute("/insights", origin))}</link>
    <atom:link href="${xml(absolute("/insights/feed.xml", origin))}" rel="self" type="application/rss+xml" />
    <description>${xml(content.siteSettings.seo.pages.insights.description)}</description>
    <language>en</language>
    <image><url>${xml(absolute(brand.logo, origin))}</url><title>${xml(brand.legalName)}</title><link>${xml(origin)}</link></image>
${items}
  </channel>
</rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
