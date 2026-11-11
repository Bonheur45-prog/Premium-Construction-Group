import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type RssItem = {
  title: string;
  link: string;
  summary: string;
  publishedAt: string;
  image: string;
};

export type RssFeedResult = { url: string; title: string; items: RssItem[] };

function isPublicIp(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    const first = Number.parseInt(normalized.split(":")[0] || "0", 16);
    return first >= 0x2000 && first <= 0x3fff &&
      !normalized.startsWith("2001:db8") &&
      !normalized.startsWith("2001:0:") &&
      !normalized.startsWith("2002:");
  }
  return false;
}

async function validateFeedUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a valid RSS or Atom feed URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) {
    throw new Error("Feed URLs must use HTTP or HTTPS without credentials or a custom port.");
  }
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("That feed host is not allowed.");
  }
  const literalVersion = isIP(host);
  const addresses = literalVersion ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => !isPublicIp(entry.address))) {
    throw new Error("Feed URLs must point to a public internet host.");
  }
  return url;
}

function decodeXml(value: string) {
  return value
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/i, "$1")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_match, entity: string) => {
      const code = entity[0].toLowerCase() === "x" ? Number.parseInt(entity.slice(1), 16) : Number.parseInt(entity, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'");
}

function tagValue(block: string, tags: string[]) {
  for (const tag of tags) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = block.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}\\s*>`, "i"));
    if (match?.[1]) return match[1];
  }
  return "";
}

function tagAttribute(block: string, tags: string[], attribute: string) {
  for (const tag of tags) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = block.match(new RegExp(`<${escaped}\\b[^>]*\\b${attribute}=["']([^"']+)["'][^>]*\\/?\\s*>`, "i"));
    if (match?.[1]) return decodeXml(match[1]);
  }
  return "";
}

function plainText(value: string) {
  return decodeXml(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ").trim().slice(0, 2_000);
}

function parseItems(xml: string): RssItem[] {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>[\s\S]*?<\/\1\s*>/gi)].slice(0, 12);
  return blocks.map(([block]) => {
    const rawLink = tagValue(block, ["link"]).trim();
    const link = tagAttribute(block, ["link"], "href") || decodeXml(rawLink.replace(/<!\[CDATA\[|\]\]>/g, "").trim());
    const rawImage = tagAttribute(block, ["media:content", "media:thumbnail", "enclosure", "image"], "url") ||
      block.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || "";
    let safeImage = "";
    try {
      if (/^https:\/\//i.test(rawImage)) safeImage = new URL(rawImage).toString();
    } catch { /* Ignore malformed feed image URLs. */ }
    let safeLink = "";
    try {
      if (/^https?:\/\//i.test(link)) safeLink = new URL(link).toString();
    } catch { /* Ignore malformed feed links. */ }
    const summary = tagValue(block, ["content:encoded", "content", "summary", "description"]);
    return {
      title: plainText(tagValue(block, ["title"])) || "Untitled feed item",
      link: safeLink,
      summary: plainText(summary),
      publishedAt: plainText(tagValue(block, ["pubDate", "published", "updated", "dc:date"])).slice(0, 120),
      image: safeImage,
    };
  }).filter((item) => item.title && item.link);
}

async function readBody(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 2_000_000) throw new Error("The feed is too large to import.");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 2_000_000) {
      await reader.cancel();
      throw new Error("The feed is too large to import.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function fetchRssFeed(rawUrl: string): Promise<RssFeedResult> {
  const url = await validateFeedUrl(rawUrl);
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5", "User-Agent": "PremiumConstructionGroup/1.0 RSS importer" },
  });
  if (!response.ok) throw new Error(`Feed request returned ${response.status}.`);
  const xml = await readBody(response);
  if (!/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) throw new Error("The URL did not return a recognized RSS or Atom feed.");
  return { url: url.toString(), title: plainText(tagValue(xml, ["title"])) || url.hostname, items: parseItems(xml) };
}
