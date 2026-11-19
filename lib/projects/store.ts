import "server-only";

import { randomUUID } from "node:crypto";
import { pgQuery, postgresEnabled } from "@/lib/db/postgres";
import { HttpError } from "@/lib/server/http";

/** Portfolio projects (CMS → Projects portfolio), shown on /projects and /projects/<slug>. */
export const PROJECT_STAGES = { completed: "Completed", ongoing: "In progress", upcoming: "Upcoming" } as const;
export type ProjectStage = keyof typeof PROJECT_STAGES;
export type GalleryImage = { src: string; alt: string; caption: string };
export type ProjectFact = { label: string; value: string };

export type Project = {
  id: string;
  slug: string;
  title: string;
  category: string;
  stage: ProjectStage;
  location: string;
  year: string;
  client: string;
  summary: string;
  body: string;
  cover: string;
  coverAlt: string;
  gallery: GalleryImage[];
  facts: ProjectFact[];
  featured: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const RESERVED = new Set(["commercial", "residential", "infrastructure", "new", "admin"]);

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}

function safeMedia(value: unknown) {
  const url = text(value, 1000);
  return (url.startsWith("/") && !url.startsWith("//")) || /^https:\/\//i.test(url) ? url : "";
}

export function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function fromRow(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    category: String(row.category || ""),
    stage: (row.stage as ProjectStage) in PROJECT_STAGES ? (row.stage as ProjectStage) : "completed",
    location: String(row.location || ""),
    year: String(row.year || ""),
    client: String(row.client || ""),
    summary: String(row.summary || ""),
    body: String(row.body || ""),
    cover: String(row.cover || ""),
    coverAlt: String(row.cover_alt || ""),
    gallery: Array.isArray(row.gallery) ? (row.gallery as GalleryImage[]) : [],
    facts: Array.isArray(row.facts) ? (row.facts as ProjectFact[]) : [],
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    sortOrder: Number(row.sort_order || 0),
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

/** Cleans and validates editor input. Throws HttpError with a message the editor can show. */
export function sanitizeProject(input: Record<string, unknown>, categoryIds: string[]) {
  const title = text(input.title, 160);
  if (!title) throw new HttpError(400, "Give the project a title.");
  const slug = slugify(text(input.slug, 120) || title);
  if (!slug) throw new HttpError(400, "The web address needs letters or numbers.");
  if (RESERVED.has(slug) || categoryIds.includes(slug)) throw new HttpError(400, `“${slug}” is already used by a project category. Choose another web address.`);
  const stage = String(input.stage) in PROJECT_STAGES ? (String(input.stage) as ProjectStage) : "completed";
  const category = categoryIds.includes(String(input.category)) ? String(input.category) : "";
  const gallery = (Array.isArray(input.gallery) ? input.gallery : []).slice(0, 40).map((item) => {
    const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return { src: safeMedia(record.src), alt: text(record.alt, 300), caption: text(record.caption, 300) };
  }).filter((item) => item.src);
  const facts = (Array.isArray(input.facts) ? input.facts : []).slice(0, 12).map((item) => {
    const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return { label: text(record.label, 60), value: text(record.value, 160) };
  }).filter((fact) => fact.label && fact.value);
  const published = input.published === true;
  const cover = safeMedia(input.cover);
  const summary = text(input.summary, 600);
  if (published && (!cover || !summary)) throw new HttpError(400, "Add a cover image and a short summary before publishing.");
  return {
    slug, title, category, stage,
    location: text(input.location, 160),
    year: text(input.year, 20),
    client: text(input.client, 160),
    summary,
    body: text(input.body, 20_000),
    cover,
    coverAlt: text(input.coverAlt, 300),
    gallery, facts,
    featured: input.featured === true,
    published,
    sortOrder: Math.max(-9999, Math.min(9999, Math.round(Number(input.sortOrder) || 0))),
  };
}

export async function listProjects({ publishedOnly = false } = {}): Promise<Project[]> {
  if (!postgresEnabled()) return [];
  const result = await pgQuery(`SELECT * FROM pcg_projects ${publishedOnly ? "WHERE published" : ""} ORDER BY featured DESC, sort_order ASC, created_at DESC LIMIT 500`);
  return result.rows.map(fromRow);
}

export async function getProjectBySlug(slug: string, { publishedOnly = true } = {}) {
  if (!postgresEnabled()) return null;
  const result = await pgQuery(`SELECT * FROM pcg_projects WHERE slug = $1 ${publishedOnly ? "AND published" : ""}`, [slug]);
  return result.rowCount ? fromRow(result.rows[0]) : null;
}

export async function saveProject(id: string | null, data: ReturnType<typeof sanitizeProject>) {
  if (!postgresEnabled()) throw new HttpError(503, "Projects need the database. Set DATABASE_URL on the server.");
  const values = [data.slug, data.title, data.category, data.stage, data.location, data.year, data.client, data.summary, data.body, data.cover, data.coverAlt, JSON.stringify(data.gallery), JSON.stringify(data.facts), data.featured, data.published, data.sortOrder];
  try {
    const result = id
      ? await pgQuery(
          `UPDATE pcg_projects SET slug=$2, title=$3, category=$4, stage=$5, location=$6, year=$7, client=$8, summary=$9, body=$10, cover=$11, cover_alt=$12, gallery=$13::jsonb, facts=$14::jsonb, featured=$15, published=$16, sort_order=$17, updated_at=NOW() WHERE id=$1 RETURNING *`,
          [id, ...values],
        )
      : await pgQuery(
          `INSERT INTO pcg_projects (id, slug, title, category, stage, location, year, client, summary, body, cover, cover_alt, gallery, facts, featured, published, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16,$17) RETURNING *`,
          [randomUUID(), ...values],
        );
    if (!result.rowCount) throw new HttpError(404, "This project no longer exists.");
    return fromRow(result.rows[0]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") throw new HttpError(409, "Another project already uses that web address.");
    throw error;
  }
}

export async function deleteProject(id: string) {
  await pgQuery("DELETE FROM pcg_projects WHERE id = $1", [id]);
}

/** Splits the body into paragraphs at blank lines. */
export function projectParagraphs(body: string) {
  return body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}
