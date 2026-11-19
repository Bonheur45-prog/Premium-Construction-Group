import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pgQuery, pgTransaction, postgresEnabled } from "@/lib/db/postgres";
import { docFromParagraphs, renderDoc, type DocNode } from "@/lib/cms/richtext";
import { getSiteContent } from "@/lib/site-content/store";

/**
 * One-time move of existing content into the CMS collections:
 *  - services and insights from the page content (Pages editor),
 *  - projects from the old pcg_projects table.
 * Each collection is moved once (recorded in pcg_cms_meta), so deleting everything later doesn't bring it back.
 */
let seeded: Promise<void> | null = null;


/** Headings and questions the original three articles showed on the website (they were not stored in the content). */
const STARTER_HEADINGS: Record<string, string[]> = {
  "a-better-build-starts-before-site": ["Set the brief around outcomes", "Bring priorities and constraints together", "Let the plan guide the next decision"],
  "clear-communication-is-part-of-the-build": ["Make the work visible to everyone", "Give every update a clear purpose", "Keep decisions and ownership connected"],
  "designing-for-the-life-of-a-place": ["Start with everyday use", "Consider the care a place needs", "Leave room for change"],
};

const STARTER_QUESTIONS: Record<string, string[]> = {
  "a-better-build-starts-before-site": [
    "What must the finished place make possible?",
    "Which needs are fixed, and which choices are still open?",
    "Who will use the space and what will they need from it?",
  ],
  "clear-communication-is-part-of-the-build": [
    "What changed since the last update?",
    "Which decision is needed next, and who owns it?",
    "Where should the team record the agreed outcome?",
  ],
  "designing-for-the-life-of-a-place": [
    "How will people move through and use the space day to day?",
    "What will need regular attention or maintenance?",
    "Could the place adapt if the people or routines change?",
  ],
};

export function ensureCollectionsSeeded() {
  if (!postgresEnabled()) return Promise.resolve();
  seeded ??= runSeed().catch((error) => {
    seeded = null;
    throw error;
  });
  return seeded;
}

const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

async function insert(client: PoolClient, row: { collection: string; slug: string; title: string; published: boolean; order: number; home: boolean; data: Record<string, unknown>; publishedAt?: string | null }) {
  await client.query(
    `INSERT INTO pcg_entries (id, collection, slug, title, status, sort_order, show_on_home, data, published_at, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'migration','migration') ON CONFLICT DO NOTHING`,
    [randomUUID(), row.collection, row.slug, row.title, row.published ? "published" : "draft", row.order, row.home, JSON.stringify(row.data), row.published ? row.publishedAt || new Date().toISOString() : null],
  );
}

function withBody(data: Record<string, unknown>, doc: DocNode) {
  const rendered = renderDoc(doc);
  return { ...data, body: doc, bodyHtml: rendered.html, readingMinutes: rendered.readingMinutes, toc: rendered.toc };
}

async function runSeed() {
  const content = await getSiteContent();
  await pgTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(424242)");
    const done = new Set((await client.query("SELECT key FROM pcg_cms_meta WHERE key LIKE 'seeded:%'")).rows.map((row) => String(row.key)));
    const mark = (collection: string) => client.query("INSERT INTO pcg_cms_meta (key, value) VALUES ($1, 'yes') ON CONFLICT DO NOTHING", [`seeded:${collection}`]);

    if (!done.has("seeded:services")) {
      for (const [index, service] of content.services.services.entries()) {
        const detail = content.detailPages.services[service.id];
        await insert(client, {
          collection: "services", slug: slugify(service.id) || `service-${index + 1}`, title: service.title, published: true, order: index + 1, home: true,
          data: {
            title: service.title, category: service.category, headline: service.headline, description: service.description,
            accent: detail?.accent || "", points: service.points, sections: detail?.sections || [], focus: detail?.focus || [],
            image: service.image, imageAlt: service.imageAlt, imageCaption: detail?.imageLabel || service.imageCaption, tone: service.tone || "light",
            seoTitle: "", metaDescription: "", socialImage: "",
          },
        });
      }
      await mark("services");
    }

    if (!done.has("seeded:insights")) {
      for (const [index, article] of content.insights.articles.entries()) {
        const doc = docFromParagraphs(article.paragraphs.map((text, i) => ({ heading: article.sectionTitles[i]?.trim() || STARTER_HEADINGS[article.slug]?.[i] || "", text })));
        await insert(client, {
          collection: "insights", slug: slugify(article.slug) || `article-${index + 1}`, title: article.title, published: article.status === "published",
          order: index + 1, home: true, publishedAt: article.publishedAt || null,
          data: withBody({
            title: article.title, excerpt: article.excerpt, takeaway: article.takeaway, questions: article.questions.length ? article.questions : STARTER_QUESTIONS[article.slug] || [], topic: article.topic, author: article.author,
            publishedAt: (article.publishedAt || "").slice(0, 10), sourceUrl: article.sourceUrl || "", image: article.image, imageAlt: article.imageAlt,
            seoTitle: article.seoTitle, metaDescription: article.metaDescription, socialImage: article.socialImage,
            keywords: article.keywords, canonicalUrl: article.canonicalUrl, noIndex: article.noIndex,
          }, doc),
        });
      }
      await mark("insights");
    }

    if (!done.has("seeded:projects")) {
      const old = await client.query("SELECT * FROM pcg_projects ORDER BY featured DESC, sort_order ASC, created_at DESC");
      for (const [index, project] of old.rows.entries()) {
        const doc = docFromParagraphs([{ text: String(project.body || "") }]);
        await insert(client, {
          collection: "projects", slug: String(project.slug), title: String(project.title), published: Boolean(project.published), order: index + 1, home: Boolean(project.featured),
          publishedAt: project.published ? new Date(project.created_at).toISOString() : null,
          data: withBody({
            title: project.title, summary: project.summary, category: project.category, stage: project.stage, location: project.location, year: project.year,
            client: project.client, facts: project.facts, cover: project.cover, coverAlt: project.cover_alt, gallery: project.gallery,
            seoTitle: "", metaDescription: "", socialImage: "",
          }, doc),
        });
      }
      await mark("projects");
    }
  });
}
