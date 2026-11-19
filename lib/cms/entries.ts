import "server-only";

import { randomUUID } from "node:crypto";
import { pgQuery, pgTransaction, postgresEnabled } from "@/lib/db/postgres";
import { COLLECTIONS, type CollectionId } from "@/lib/cms/collections";
import { missingForPublish, sanitizeEntryData } from "@/lib/cms/sanitize";
import { ensureCollectionsSeeded } from "@/lib/cms/seed";
import { HttpError } from "@/lib/server/http";
import { getSiteContent } from "@/lib/site-content/store";

/** Storage for every CMS collection: drafts, publishing, version history, trash, ordering and redirects. */

export type EntryStatus = "draft" | "published";
export type Entry = {
  id: string;
  collection: CollectionId;
  slug: string;
  title: string;
  status: EntryStatus;
  sortOrder: number;
  showOnHome: boolean;
  /** What the editor should show: unpublished changes when there are any, otherwise the live data. */
  data: Record<string, unknown>;
  /** True when a published item has saved changes that aren't live yet. */
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
export type EntryVersion = { id: string; title: string; note: string; createdBy: string; createdAt: string };

const RESERVED_SLUGS = new Set(["new", "admin", "api", "feed", "feed-xml", "page", "category"]);

export function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function requireDatabase() {
  if (!postgresEnabled()) throw new HttpError(503, "The CMS needs its database. Set DATABASE_URL on the server.");
}

const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : null);

function fromRow(row: Record<string, unknown>): Entry {
  const draft = row.draft as Record<string, unknown> | null;
  return {
    id: String(row.id),
    collection: row.collection as CollectionId,
    slug: String(row.slug),
    title: String(row.title),
    status: row.status === "published" ? "published" : "draft",
    sortOrder: Number(row.sort_order || 0),
    showOnHome: Boolean(row.show_on_home),
    data: draft || (row.data as Record<string, unknown>) || {},
    hasUnpublishedChanges: row.status === "published" && Boolean(draft),
    publishedAt: iso(row.published_at),
    updatedBy: String(row.updated_by || ""),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
    deletedAt: iso(row.deleted_at),
  };
}

/** Options for select fields that come from site content (project categories). */
export async function fieldOptions() {
  const content = await getSiteContent();
  return new Map<string, string[]>([["projectCategories", content.projects.categories.map((category) => category.id)]]);
}

export async function selectOptionLabels() {
  const content = await getSiteContent();
  return { projectCategories: content.projects.categories.map((category) => ({ value: category.id, label: category.type })) };
}

async function forbiddenSlugs(collection: CollectionId) {
  if (collection !== "projects") return RESERVED_SLUGS;
  const content = await getSiteContent();
  return new Set([...RESERVED_SLUGS, ...content.projects.categories.map((category) => category.id)]);
}

async function uniqueSlug(collection: CollectionId, wanted: string, exceptId?: string) {
  const base = slugify(wanted) || "item";
  const forbidden = await forbiddenSlugs(collection);
  for (let index = 1; index < 200; index++) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    if (forbidden.has(candidate)) continue;
    const taken = await pgQuery("SELECT 1 FROM pcg_entries WHERE collection = $1 AND slug = $2 AND deleted_at IS NULL AND id <> $3", [collection, candidate, exceptId || ""]);
    if (!taken.rowCount) return candidate;
  }
  return `${base}-${randomUUID().slice(0, 6)}`;
}

export type ListFilter = { status?: "draft" | "published" | ""; search?: string; trash?: boolean };

export async function listEntries(collection: CollectionId, filter: ListFilter = {}) {
  requireDatabase();
  await ensureCollectionsSeeded();
  const values: unknown[] = [collection];
  const where = ["collection = $1", filter.trash ? "deleted_at IS NOT NULL" : "deleted_at IS NULL"];
  if (filter.status) { values.push(filter.status); where.push(`status = $${values.length}`); }
  if (filter.search) { values.push(`%${filter.search.toLowerCase().slice(0, 80)}%`); where.push(`(lower(title) LIKE $${values.length} OR slug LIKE $${values.length})`); }
  const rows = await pgQuery(`SELECT * FROM pcg_entries WHERE ${where.join(" AND ")} ORDER BY sort_order ASC, created_at DESC LIMIT 500`, values);
  const counts = await pgQuery<{ status: string; count: string }>("SELECT status, COUNT(*)::text AS count FROM pcg_entries WHERE collection = $1 AND deleted_at IS NULL GROUP BY status", [collection]);
  return {
    entries: rows.rows.map(fromRow),
    counts: { draft: 0, published: 0, ...Object.fromEntries(counts.rows.map((row) => [row.status, Number(row.count)])) } as Record<EntryStatus, number>,
  };
}

export async function getEntry(id: string) {
  requireDatabase();
  const result = await pgQuery("SELECT * FROM pcg_entries WHERE id = $1", [id]);
  return result.rowCount ? fromRow(result.rows[0]) : null;
}

export async function createEntry(collection: CollectionId, title: string, user: string) {
  requireDatabase();
  await ensureCollectionsSeeded();
  const def = COLLECTIONS[collection];
  const cleanTitle = title.trim().slice(0, 160);
  if (cleanTitle.length < 2) throw new HttpError(400, `Type the ${def.titleLabel.toLowerCase()} first.`);
  const slug = await uniqueSlug(collection, cleanTitle);
  const order = await pgQuery<{ next: number }>("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM pcg_entries WHERE collection = $1 AND deleted_at IS NULL", [collection]);
  const data: Record<string, unknown> = { title: cleanTitle };
  if (collection === "projects") data.stage = "completed";
  if (collection === "jobs") data.type = "full-time";
  if (collection === "services") data.tone = "light";
  const result = await pgQuery(
    "INSERT INTO pcg_entries (id, collection, slug, title, sort_order, show_on_home, data, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8) RETURNING *",
    [randomUUID(), collection, slug, cleanTitle, order.rows[0].next, Boolean(def.homeDefault), JSON.stringify(data), user],
  );
  return fromRow(result.rows[0]);
}

export type SaveMode = "draft" | "publish" | "unpublish";
export type SaveInput = { values: Record<string, unknown>; slug?: string; sortOrder?: number; showOnHome?: boolean; mode: SaveMode };

/**
 * Saves the editor. "draft" keeps the website unchanged (for a published item the changes wait in `draft`);
 * "publish" makes them live; "unpublish" takes the item off the website. Every save is kept in the history.
 */
export async function saveEntry(id: string, input: SaveInput, user: string) {
  requireDatabase();
  const current = await getEntry(id);
  if (!current || current.deletedAt) throw new HttpError(404, "This item no longer exists. It may have been moved to the trash.");
  const def = COLLECTIONS[current.collection];
  const data = sanitizeEntryData(def, input.values, await fieldOptions());
  const title = String(data.title || "").trim() || current.title;
  data.title = title;

  if (input.mode === "publish") {
    const missing = missingForPublish(def, data);
    if (missing.length) throw new HttpError(400, `Fill in ${missing.join(", ")} before publishing.`);
  }

  const wantedSlug = input.slug !== undefined ? slugify(input.slug) || slugify(title) : current.slug;
  const slug = wantedSlug === current.slug ? current.slug : await uniqueSlug(current.collection, wantedSlug, id);
  const sortOrder = Number.isFinite(input.sortOrder) ? Math.max(-9999, Math.min(9999, Math.round(input.sortOrder!))) : current.sortOrder;
  const showOnHome = typeof input.showOnHome === "boolean" ? input.showOnHome : current.showOnHome;

  return pgTransaction(async (client) => {
    const row = (await client.query("SELECT status, slug, published_at FROM pcg_entries WHERE id = $1 FOR UPDATE", [id])).rows[0] as { status: EntryStatus; slug: string; published_at: string | null };
    const wasPublished = row.status === "published";
    const firstPublish = input.mode === "publish" && !row.published_at;
    let status: EntryStatus = row.status;
    let sql: string;
    if (input.mode === "publish") {
      status = "published";
      sql = "data = $2::jsonb, draft = NULL, status = 'published', published_at = COALESCE(published_at, NOW())";
    } else if (input.mode === "unpublish") {
      status = "draft";
      sql = "data = $2::jsonb, draft = NULL, status = 'draft'";
    } else if (wasPublished) {
      sql = "draft = $2::jsonb";
    } else {
      sql = "data = $2::jsonb, draft = NULL";
    }
    // Published items keep their live address until the change is published.
    const slugNow = wasPublished && input.mode === "draft" ? row.slug : slug;
    await client.query(
      `UPDATE pcg_entries SET ${sql}, title = $3, slug = $4, sort_order = $5, show_on_home = $6, updated_by = $7, updated_at = NOW() WHERE id = $1`,
      [id, JSON.stringify({ ...data, ...(wasPublished && input.mode === "draft" ? { __slug: slug } : {}) }), title, slugNow, sortOrder, showOnHome, user],
    );
    if (status === "published" && row.slug !== slugNow && def.publicPath) {
      await client.query("INSERT INTO pcg_redirects (from_path, to_path) VALUES ($1, $2) ON CONFLICT (from_path) DO UPDATE SET to_path = EXCLUDED.to_path", [def.publicPath(row.slug), def.publicPath(slugNow)]);
      await client.query("DELETE FROM pcg_redirects WHERE from_path = $1", [def.publicPath(slugNow)]);
    }
    await client.query("INSERT INTO pcg_entry_versions (entry_id, title, data, note, created_by) VALUES ($1,$2,$3::jsonb,$4,$5)", [
      id, title, JSON.stringify({ ...data, __slug: slug }), input.mode === "publish" ? "Published" : input.mode === "unpublish" ? "Unpublished" : "Saved draft", user,
    ]);
    await client.query("DELETE FROM pcg_entry_versions WHERE entry_id = $1 AND id NOT IN (SELECT id FROM pcg_entry_versions WHERE entry_id = $1 ORDER BY created_at DESC LIMIT 40)", [id]);
    const saved = fromRow((await client.query("SELECT * FROM pcg_entries WHERE id = $1", [id])).rows[0]);
    return { entry: saved, firstPublish };
  });
}

/** Throws away saved-but-unpublished changes of a published item. */
export async function discardChanges(id: string) {
  await pgQuery("UPDATE pcg_entries SET draft = NULL, updated_at = NOW() WHERE id = $1", [id]);
  return getEntry(id);
}

export async function listVersions(id: string): Promise<EntryVersion[]> {
  const result = await pgQuery("SELECT id, title, note, created_by, created_at FROM pcg_entry_versions WHERE entry_id = $1 ORDER BY created_at DESC LIMIT 40", [id]);
  return result.rows.map((row) => ({ id: String(row.id), title: String(row.title), note: String(row.note), createdBy: String(row.created_by), createdAt: iso(row.created_at)! }));
}

/** Loads an older version into the editor. Nothing changes on the website until it's published. */
export async function versionData(entryId: string, versionId: string) {
  const result = await pgQuery("SELECT data FROM pcg_entry_versions WHERE entry_id = $1 AND id = $2", [entryId, versionId]);
  if (!result.rowCount) throw new HttpError(404, "That version no longer exists.");
  return result.rows[0].data as Record<string, unknown>;
}

export async function trashEntry(id: string, user: string) {
  const result = await pgQuery("UPDATE pcg_entries SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING *", [id, user]);
  if (!result.rowCount) throw new HttpError(404, "This item no longer exists.");
  return fromRow(result.rows[0]);
}

export async function restoreEntry(id: string) {
  const entry = await getEntry(id);
  if (!entry?.deletedAt) throw new HttpError(404, "This item isn't in the trash.");
  const slug = await uniqueSlug(entry.collection, entry.slug, id);
  const result = await pgQuery("UPDATE pcg_entries SET deleted_at = NULL, deleted_by = '', slug = $2, updated_at = NOW() WHERE id = $1 RETURNING *", [id, slug]);
  return fromRow(result.rows[0]);
}

export async function deleteForever(id: string) {
  const result = await pgQuery("DELETE FROM pcg_entries WHERE id = $1 AND deleted_at IS NOT NULL RETURNING title", [id]);
  if (!result.rowCount) throw new HttpError(400, "Only items in the trash can be deleted for good.");
  return String(result.rows[0].title);
}

export async function listTrash() {
  requireDatabase();
  const result = await pgQuery("SELECT * FROM pcg_entries WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 500");
  return result.rows.map((row) => ({ ...fromRow(row), deletedBy: String(row.deleted_by || "") }));
}

/** Saves a new order from drag-and-drop in the list. */
export async function reorderEntries(collection: CollectionId, ids: string[]) {
  await pgTransaction(async (client) => {
    for (const [index, id] of ids.slice(0, 500).entries()) {
      await client.query("UPDATE pcg_entries SET sort_order = $3 WHERE id = $1 AND collection = $2", [id, collection, index + 1]);
    }
  });
}

/** Old address → new address after a slug change. */
export async function findRedirect(path: string) {
  if (!postgresEnabled()) return null;
  const result = await pgQuery<{ to_path: string }>("SELECT to_path FROM pcg_redirects WHERE from_path = $1", [path]);
  return result.rows[0]?.to_path || null;
}

export async function collectionCounts() {
  if (!postgresEnabled()) return {} as Record<string, { draft: number; published: number }>;
  await ensureCollectionsSeeded();
  const result = await pgQuery<{ collection: string; status: string; count: string }>("SELECT collection, status, COUNT(*)::text AS count FROM pcg_entries WHERE deleted_at IS NULL GROUP BY collection, status");
  const counts: Record<string, { draft: number; published: number }> = {};
  for (const row of result.rows) {
    counts[row.collection] ??= { draft: 0, published: 0 };
    counts[row.collection][row.status as EntryStatus] = Number(row.count);
  }
  return counts;
}
