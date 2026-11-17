import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSiteOrigin } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

export const runtime = "nodejs";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const content = await getSiteContent();
  const origin = getSiteOrigin(content);
  const allowIndexing = content.siteSettings.seo.robots.index;
  return {
    rules: {
      userAgent: "*",
      ...(allowIndexing ? { allow: "/" } : {}),
      disallow: allowIndexing ? ["/admin", "/api"] : ["/"],
    },
    ...(origin && allowIndexing ? { sitemap: new URL("/sitemap.xml", origin).toString() } : {}),
  };
}
