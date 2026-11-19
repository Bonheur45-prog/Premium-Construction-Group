"use client";

/* eslint-disable @next/next/no-img-element -- thumbnails from the media library (any URL) */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { cmsFetch, timeAgo } from "@/components/admin/format";
import { COLLECTIONS, type CollectionId } from "@/lib/cms/collections";

type Row = {
  id: string; slug: string; title: string; status: "draft" | "published"; sortOrder: number; showOnHome: boolean;
  data: Record<string, unknown>; hasUnpublishedChanges: boolean; updatedAt: string; updatedBy: string;
};
type ListResponse = { entries: Row[]; counts: { draft: number; published: number } };

export function StatusBadge({ status, changes }: { status: "draft" | "published"; changes?: boolean }) {
  if (status === "draft") return <span className="cms-pill cms-pill--archived">Draft</span>;
  return changes ? <span className="cms-pill cms-pill--new" title="Saved changes are waiting to be published">Live · changes waiting</span> : <span className="cms-pill cms-pill--replied">Live</span>;
}

/** The list screen of any collection: add, find, filter, reorder and open items. */
export function CollectionList({ collection }: { collection: CollectionId }) {
  const def = COLLECTIONS[collection];
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"" | "published" | "draft">("");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [orderNotice, setOrderNotice] = useState("");
  const dragged = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (query.trim()) params.set("q", query.trim());
      setData(await cmsFetch<ListResponse>(`/api/admin/cms/${collection}?${params}`));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This list could not be loaded.");
    }
  }, [collection, filter, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const result = await cmsFetch<{ entry: Row }>(`/api/admin/cms/${collection}`, { method: "POST", body: JSON.stringify({ title }) });
      window.location.assign(`/admin/${collection}/${result.entry.id}?new=1`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add it.");
      setCreating(false);
    }
  }

  async function drop(targetId: string) {
    const sourceId = dragged.current;
    dragged.current = null;
    if (!data || !sourceId || sourceId === targetId) return;
    const rows = [...data.entries];
    const from = rows.findIndex((row) => row.id === sourceId);
    const to = rows.findIndex((row) => row.id === targetId);
    const [moved] = rows.splice(from, 1);
    rows.splice(to, 0, moved);
    setData({ ...data, entries: rows });
    try {
      await cmsFetch(`/api/admin/cms/${collection}/reorder`, { method: "POST", body: JSON.stringify({ ids: rows.map((row) => row.id) }) });
      setOrderNotice("New order saved — the website uses it straight away.");
      window.setTimeout(() => setOrderNotice(""), 3500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The order couldn't be saved.");
      void load();
    }
  }

  const canReorder = !filter && !query.trim();
  const total = (data?.counts.draft || 0) + (data?.counts.published || 0);

  return (
    <div className="cmsl">
      <div className="cmsl-intro">
        <p>{def.description}</p>
        <a className="cms-btn cms-btn--ghost cms-btn--small" href={def.sitePath} target="_blank" rel="noreferrer">See it on the website ↗</a>
      </div>

      <form className="cmsl-create" onSubmit={create}>
        <span className="cmsl-create__plus" aria-hidden="true">+</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={def.createPlaceholder} maxLength={160} aria-label={`New ${def.singular}`} />
        <button type="submit" className="cms-btn cms-btn--amber" disabled={creating || title.trim().length < 2}>{creating ? "Adding…" : `Add ${def.singular}`}</button>
      </form>

      <div className="cms-toolbar">
        <div className="cms-segmented" role="group" aria-label="Show">
          <button type="button" className={!filter ? "is-active" : ""} onClick={() => setFilter("")}>All <em className="cmsl-num">{total}</em></button>
          <button type="button" className={filter === "published" ? "is-active" : ""} onClick={() => setFilter("published")}>Live <em className="cmsl-num">{data?.counts.published || 0}</em></button>
          <button type="button" className={filter === "draft" ? "is-active" : ""} onClick={() => setFilter("draft")}>Drafts <em className="cmsl-num">{data?.counts.draft || 0}</em></button>
        </div>
        <input className="cms-search" type="search" placeholder={`Search ${def.label.toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)} />
        {canReorder && (data?.entries.length || 0) > 1 && <span className="cms-muted cmsl-drag-hint">Drag <span aria-hidden="true">⠿</span> to change the order on the website</span>}
      </div>
      {error && <p className="cms-alert cms-alert--error">{error}</p>}
      {orderNotice && <p className="cms-alert cms-alert--ok" role="status">{orderNotice}</p>}

      {data && data.entries.length > 0 && (
        <ul className="cmsl-rows">
          {data.entries.map((row) => {
            const thumb = def.thumbKey ? String(row.data[def.thumbKey] || "") : "";
            return (
              <li key={row.id} draggable={canReorder} onDragStart={() => { dragged.current = row.id; }} onDragOver={(event) => { if (canReorder) event.preventDefault(); }} onDrop={() => void drop(row.id)}>
                {canReorder && <span className="cmsl-handle" aria-hidden="true" title="Drag to reorder">⠿</span>}
                <Link href={`/admin/${collection}/${row.id}`} className="cmsl-row">
                  {def.thumbKey && <span className="cmsl-thumb">{thumb ? <img src={thumb} alt="" loading="lazy" /> : <span aria-hidden="true">{row.title.slice(0, 1).toUpperCase()}</span>}</span>}
                  <span className="cmsl-main">
                    <strong>{row.title}</strong>
                    <small>{[def.subtitle(row.data), def.publicPath ? def.publicPath(row.slug) : ""].filter(Boolean).join("  ·  ")}</small>
                  </span>
                  <span className="cmsl-meta">
                    <StatusBadge status={row.status} changes={row.hasUnpublishedChanges} />
                    {def.homeToggle && row.showOnHome && <span className="cms-pill">{collection === "projects" ? "Featured" : "On home"}</span>}
                    <time dateTime={row.updatedAt}>{timeAgo(row.updatedAt)}{row.updatedBy && row.updatedBy !== "migration" ? ` · ${row.updatedBy}` : ""}</time>
                  </span>
                  <span className="cmsl-go" aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {data && !data.entries.length && (
        <div className="cmsl-empty">
          <strong>{query || filter ? "Nothing matches." : `No ${def.label.toLowerCase()} yet.`}</strong>
          <p>{query || filter ? "Try another search or show all." : def.emptyHint}</p>
        </div>
      )}
      {!data && !error && <div className="cms-skeleton" style={{ height: 240 }} />}
    </div>
  );
}
