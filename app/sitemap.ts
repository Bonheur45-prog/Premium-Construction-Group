import type { MetadataRoute } from "next";
import { connection } from "next/server";
import type { ManagedPageKey } from "@/lib/site-content/metadata";
import { getSiteOrigin } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";

export const runtime = "nodejs";

const pagePaths: Record<ManagedPageKey, string> = {
  home: "/",
  about: "/about",
  approach: "/approach",
  services: "/services",
  projects: "/projects",
  insights: "/insights",
  contact: "/contact",
  reservations: "/reservations",
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const content = await getSiteContent();
  const origin = getSiteOrigin(content);
  if (!origin || !content.siteSettings.seo.robots.index) return [];

  const entries: MetadataRoute.Sitemap = [];
  const add = (path: string, options: { lastModified?: Date; priority?: number; changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"] } = {}) => {
    try {
      const url = new URL(path, origin);
      if (url.origin !== origin.origin) return;
      entries.push({ url: url.toString(), ...options });
    } catch {
      // Skip malformed canonical paths instead of returning invalid sitemap URLs.
    }
  };

  for (const [pageKey, page] of Object.entries(content.siteSettings.seo.pages) as [ManagedPageKey, SiteSeoPage][]) {
    if (page.noIndex) continue;
    add(page.canonicalUrl || pagePaths[pageKey], {
      priority: pageKey === "home" ? 1 : 0.7,
      changeFrequency: pageKey === "home" ? "weekly" : "monthly",
    });
  }

  for (const service of content.services.services) add(`/services/${service.id}`, { priority: 0.6, changeFrequency: "monthly" });
  for (const category of content.projects.categories) add(`/projects/${category.id}`, { priority: 0.6, changeFrequency: "monthly" });
  for (const page of content.customPages) {
    if (page.status !== "published" || page.noIndex) continue;
    add(page.canonicalUrl || `/${page.slug}`, { priority: 0.5, changeFrequency: "monthly" });
  }
  for (const article of content.insights.articles) {
    if (article.status !== "published" || article.noIndex) continue;
    const lastModified = article.updatedAt || article.publishedAt;
    add(article.canonicalUrl || `/insights/${article.slug}`, {
      ...(lastModified && !Number.isNaN(Date.parse(lastModified)) ? { lastModified: new Date(lastModified) } : {}),
      priority: 0.6,
      changeFrequency: "monthly",
    });
  }

  return entries;
}

type SiteSeoPage = import("@/lib/site-content/content").SiteContent["siteSettings"]["seo"]["pages"][ManagedPageKey];
