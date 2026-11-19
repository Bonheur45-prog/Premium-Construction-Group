import "server-only";

import { cache } from "react";
import { pgQuery, postgresEnabled } from "@/lib/db/postgres";
import { ensureCollectionsSeeded } from "@/lib/cms/seed";
import { docFromParagraphs, renderDoc } from "@/lib/cms/richtext";
import type { CollectionId } from "@/lib/cms/collections";
import { getSiteContent } from "@/lib/site-content/store";
import { findRedirect } from "@/lib/cms/entries";
import { notFound, permanentRedirect } from "next/navigation";

/**
 * What the public website reads: published items only (never unsaved drafts), in the editor's order.
 * Without a database (local preview) services and insights fall back to the page content.
 */

type Row = { id: string; slug: string; title: string; sortOrder: number; showOnHome: boolean; publishedAt: string; updatedAt: string; data: Record<string, unknown> };

const str = (value: unknown) => (typeof value === "string" ? value : "");
const arr = <T,>(value: unknown) => (Array.isArray(value) ? (value as T[]) : []);

const published = cache(async (collection: CollectionId): Promise<Row[]> => {
  if (!postgresEnabled()) return [];
  await ensureCollectionsSeeded();
  const result = await pgQuery(
    "SELECT id, slug, title, sort_order, show_on_home, published_at, updated_at, data FROM pcg_entries WHERE collection = $1 AND status = 'published' AND deleted_at IS NULL ORDER BY sort_order ASC, published_at DESC",
    [collection],
  );
  return result.rows.map((row) => ({
    id: String(row.id), slug: String(row.slug), title: String(row.title), sortOrder: Number(row.sort_order), showOnHome: Boolean(row.show_on_home),
    publishedAt: new Date(row.published_at || row.updated_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(), data: row.data || {},
  }));
});

export type Seo = { seoTitle: string; metaDescription: string; socialImage: string };
const seo = (data: Record<string, unknown>): Seo => ({ seoTitle: str(data.seoTitle), metaDescription: str(data.metaDescription), socialImage: str(data.socialImage) });

/* ---------- Services ---------- */
export type PublicService = Seo & {
  id: string; slug: string; number: string; title: string; category: string; headline: string; description: string; accent: string;
  image: string; imageAlt: string; imageCaption: string; tone: string; showOnHome: boolean;
  points: Array<{ title: string; text: string }>; sections: Array<{ title: string; body: string }>; focus: Array<{ title: string; text: string }>;
};

export const getServices = cache(async (): Promise<PublicService[]> => {
  if (!postgresEnabled()) {
    const content = await getSiteContent();
    return content.services.services.map((service) => {
      const detail = content.detailPages.services[service.id];
      return {
        id: service.id, slug: service.id, number: service.number, title: service.title, category: service.category, headline: service.headline,
        description: service.description, accent: detail?.accent || "", image: service.image, imageAlt: service.imageAlt, imageCaption: detail?.imageLabel || service.imageCaption,
        tone: service.tone, showOnHome: true, points: service.points, sections: detail?.sections || [], focus: detail?.focus || [], seoTitle: "", metaDescription: "", socialImage: "",
      };
    });
  }
  return (await published("services")).map((row, index) => ({
    id: row.slug, slug: row.slug, number: String(index + 1).padStart(2, "0"), title: row.title, category: str(row.data.category), headline: str(row.data.headline),
    description: str(row.data.description), accent: str(row.data.accent), image: str(row.data.image), imageAlt: str(row.data.imageAlt), imageCaption: str(row.data.imageCaption),
    tone: str(row.data.tone) || "light", showOnHome: row.showOnHome, points: arr(row.data.points), sections: arr(row.data.sections), focus: arr(row.data.focus), ...seo(row.data),
  }));
});

/* ---------- Insights (blog) ---------- */
export type PublicInsight = Seo & {
  id: string; slug: string; number: string; title: string; excerpt: string; topic: string; author: string; image: string; imageAlt: string;
  bodyHtml: string; toc: Array<{ id: string; text: string; level: 2 | 3 }>; readTime: string; takeaway: string; questions: string[];
  publishedAt: string; updatedAt: string; sourceUrl: string; keywords: string[]; canonicalUrl: string; noIndex: boolean; showOnHome: boolean;
};

export const getInsights = cache(async (): Promise<PublicInsight[]> => {
  if (!postgresEnabled()) {
    const content = await getSiteContent();
    return content.insights.articles.filter((article) => article.status === "published").map((article, index) => {
      const rendered = renderDoc(docFromParagraphs(article.paragraphs.map((text, i) => ({ heading: article.sectionTitles[i] || "", text }))));
      return {
        id: article.slug, slug: article.slug, number: String(index + 1).padStart(2, "0"), title: article.title, excerpt: article.excerpt, topic: article.topic, author: article.author,
        image: article.image, imageAlt: article.imageAlt, bodyHtml: rendered.html, toc: rendered.toc, readTime: article.readTime, takeaway: article.takeaway, questions: article.questions,
        publishedAt: article.publishedAt, updatedAt: article.updatedAt, sourceUrl: article.sourceUrl, keywords: article.keywords, canonicalUrl: article.canonicalUrl, noIndex: article.noIndex,
        showOnHome: true, seoTitle: article.seoTitle, metaDescription: article.metaDescription, socialImage: article.socialImage,
      };
    });
  }
  const rows = (await published("insights")).sort((a, b) => (str(b.data.publishedAt) || b.publishedAt).localeCompare(str(a.data.publishedAt) || a.publishedAt));
  return rows.map((row, index) => ({
    id: row.id, slug: row.slug, number: String(index + 1).padStart(2, "0"), title: row.title, excerpt: str(row.data.excerpt), topic: str(row.data.topic) || "Insight",
    author: str(row.data.author) || "Premium Construction Group", image: str(row.data.image), imageAlt: str(row.data.imageAlt), bodyHtml: str(row.data.bodyHtml),
    toc: arr(row.data.toc), readTime: `${Number(row.data.readingMinutes) || 3} min read`, takeaway: str(row.data.takeaway), questions: arr<string>(row.data.questions),
    publishedAt: str(row.data.publishedAt) ? new Date(str(row.data.publishedAt)).toISOString() : row.publishedAt, updatedAt: row.updatedAt, sourceUrl: str(row.data.sourceUrl),
    keywords: arr<string>(row.data.keywords), canonicalUrl: str(row.data.canonicalUrl), noIndex: row.data.noIndex === true, showOnHome: row.showOnHome, ...seo(row.data),
  }));
});

/* ---------- Projects ---------- */
export type PublicProject = Seo & {
  id: string; slug: string; title: string; summary: string; bodyHtml: string; category: string; stage: "completed" | "ongoing" | "upcoming"; location: string; year: string; client: string;
  cover: string; coverAlt: string; gallery: Array<{ src: string; alt: string; caption: string }>; facts: Array<{ label: string; value: string }>; featured: boolean; publishedAt: string;
};

export const getProjects = cache(async (): Promise<PublicProject[]> => {
  const rows = await published("projects");
  return rows.filter((row) => str(row.data.cover)).map((row) => ({
    id: row.id, slug: row.slug, title: row.title, summary: str(row.data.summary), bodyHtml: str(row.data.bodyHtml), category: str(row.data.category),
    stage: (["completed", "ongoing", "upcoming"].includes(str(row.data.stage)) ? str(row.data.stage) : "completed") as PublicProject["stage"],
    location: str(row.data.location), year: str(row.data.year), client: str(row.data.client), cover: str(row.data.cover), coverAlt: str(row.data.coverAlt),
    gallery: arr<PublicProject["gallery"][number]>(row.data.gallery), facts: arr<PublicProject["facts"][number]>(row.data.facts), featured: row.showOnHome, publishedAt: row.publishedAt, ...seo(row.data),
  })).sort((a, b) => Number(b.featured) - Number(a.featured));
});

/* ---------- Testimonials, partners, team ---------- */
export type PublicTestimonial = { id: string; quote: string; name: string; role: string; company: string; photo: string; photoAlt: string; showOnHome: boolean };
export const getTestimonials = cache(async (): Promise<PublicTestimonial[]> => (await published("testimonials")).filter((row) => str(row.data.quote)).map((row) => ({
  id: row.id, quote: str(row.data.quote), name: row.title, role: str(row.data.role), company: str(row.data.company), photo: str(row.data.photo), photoAlt: str(row.data.photoAlt), showOnHome: row.showOnHome,
})));

export type PublicPartner = { id: string; name: string; logo: string; website: string; showOnHome: boolean };
export const getPartners = cache(async (): Promise<PublicPartner[]> => (await published("partners")).filter((row) => str(row.data.logo)).map((row) => ({
  id: row.id, name: row.title, logo: str(row.data.logo), website: str(row.data.website), showOnHome: row.showOnHome,
})));

export type PublicTeamMember = { id: string; name: string; role: string; bio: string; photo: string; photoAlt: string; linkedin: string; email: string };
export const getTeam = cache(async (): Promise<PublicTeamMember[]> => (await published("team")).map((row) => ({
  id: row.id, name: row.title, role: str(row.data.role), bio: str(row.data.bio), photo: str(row.data.photo), photoAlt: str(row.data.photoAlt), linkedin: str(row.data.linkedin), email: str(row.data.email),
})));

/* ---------- Careers ---------- */
export type PublicJob = Seo & {
  id: string; slug: string; title: string; summary: string; bodyHtml: string; location: string; type: string; department: string; deadline: string;
  applyEmail: string; applyUrl: string; publishedAt: string;
};

export const getJobs = cache(async (): Promise<PublicJob[]> => {
  const today = new Date().toISOString().slice(0, 10);
  return (await published("jobs")).filter((row) => !str(row.data.deadline) || str(row.data.deadline) >= today).map((row) => ({
    id: row.id, slug: row.slug, title: row.title, summary: str(row.data.summary), bodyHtml: str(row.data.bodyHtml), location: str(row.data.location), type: str(row.data.type),
    department: str(row.data.department), deadline: str(row.data.deadline), applyEmail: str(row.data.applyEmail), applyUrl: str(row.data.applyUrl), publishedAt: row.publishedAt, ...seo(row.data),
  }));
});

/**
 * For a detail page whose item was not found: if its address was renamed, send visitors (and Google)
 * to the new address with a permanent redirect; otherwise show the 404 page.
 */
export async function redirectOrNotFound(path: string): Promise<never> {
  const target = await findRedirect(path).catch(() => null);
  if (target && target !== path) permanentRedirect(target);
  notFound();
}
