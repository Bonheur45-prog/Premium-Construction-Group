import { getInsights, getJobs, getProjects, getServices } from "@/lib/cms/public";
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
  careers: "/careers",
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

  const [services, projects, insights, jobs] = await Promise.all([getServices(), getProjects(), getInsights(), getJobs()]);
  for (const service of services) add(`/services/${service.slug}`, { priority: 0.6, changeFrequency: "monthly" });
  for (const category of content.projects.categories) add(`/projects/${category.id}`, { priority: 0.6, changeFrequency: "monthly" });
  for (const project of projects) add(`/projects/${project.slug}`, { priority: 0.7, changeFrequency: "monthly" });
  for (const job of jobs) add(`/careers/${job.slug}`, { priority: 0.5, changeFrequency: "weekly" });
  for (const page of content.customPages) {
    if (page.status !== "published" || page.noIndex) continue;
    add(page.canonicalUrl || `/${page.slug}`, { priority: 0.5, changeFrequency: "monthly" });
  }
  for (const article of insights) {
    if (article.noIndex) continue;
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
