"use client";

/* eslint-disable @next/next/no-img-element -- library thumbnails come from any storage URL */
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { cmsFetch, formatBytes, formatDate } from "@/components/admin/format";

export type LibraryItem = {
  id: string; url: string; kind: "image" | "video"; mime: string; sizeBytes: number; filename: string; alt: string; storage: "r2" | "local"; uploadedBy: string; createdAt: string;
};
type ListResponse = { items: LibraryItem[]; total: number; storage: "r2" | "local" };

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm";

function useLibrary(kind: string, query: string) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [storage, setStorage] = useState<"r2" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ offset: String(offset) });
      if (kind) params.set("kind", kind);
      if (query.trim()) params.set("q", query.trim());
      const data = await cmsFetch<ListResponse>(`/api/admin/media?${params}`);
      setItems((current) => (offset ? [...current, ...data.items] : data.items));
      setTotal(data.total);
      setStorage(data.storage);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The library could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [kind, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(0), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  return { items, setItems, total, setTotal, storage, loading, error, load };
}

function Uploader({ onUploaded, accept = ACCEPT }: { onUploaded: (item: LibraryItem) => void; accept?: string }) {
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<Array<{ name: string; state: "uploading" | "done" | "error"; message?: string }>>([]);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    for (const file of Array.from(files).slice(0, 20)) {
      setQueue((current) => [{ name: file.name, state: "uploading" as const }, ...current].slice(0, 6));
      try {
        const form = new FormData();
        form.set("file", file);
        const result = await cmsFetch<{ item: LibraryItem }>("/api/admin/media", { method: "POST", body: form });
        onUploaded(result.item);
        setQueue((current) => current.map((entry) => (entry.name === file.name && entry.state === "uploading" ? { ...entry, state: "done" as const } : entry)));
      } catch (reason) {
        setQueue((current) => current.map((entry) => (entry.name === file.name && entry.state === "uploading" ? { ...entry, state: "error" as const, message: reason instanceof Error ? reason.message : "Upload failed" } : entry)));
      }
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) void upload(event.dataTransfer.files);
  }

  return (
    <div
      className={`cms-dropzone${dragging ? " is-dragging" : ""}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 15.5V4.5m0 0-4 4m4-4 4 4M5 15v3.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V15" /></svg>
      <p><strong>Drop images or videos here</strong> or <button type="button" className="cms-link" onClick={() => input.current?.click()}>browse your computer</button></p>
      <small>JPG, PNG, WebP, AVIF, GIF up to 20 MB · MP4, WebM up to 200 MB</small>
      <input ref={input} type="file" accept={accept} multiple hidden onChange={(event) => { if (event.target.files?.length) void upload(event.target.files); event.target.value = ""; }} />
      {queue.length > 0 && (
        <ul className="cms-upload-queue">
          {queue.map((entry, index) => (
            <li key={`${entry.name}-${index}`} className={`is-${entry.state}`}>
              <span>{entry.name}</span>
              <em>{entry.state === "uploading" ? "Uploading…" : entry.state === "done" ? "Added" : entry.message}</em>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thumb({ item }: { item: LibraryItem }) {
  return item.kind === "video"
    ? <video src={item.url} muted playsInline preload="metadata" />
    : <img src={item.url} alt={item.alt} loading="lazy" />;
}

function Details({ item, onChange, onDelete }: { item: LibraryItem; onChange: (item: LibraryItem) => void; onDelete: (id: string) => void }) {
  const [alt, setAlt] = useState(item.alt);
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { setAlt(item.alt); setStatus(""); setConfirming(false); }, [item]);

  async function saveAlt() {
    try {
      const result = await cmsFetch<{ item: LibraryItem }>(`/api/admin/media/${item.id}`, { method: "PATCH", body: JSON.stringify({ alt }) });
      onChange(result.item);
      setStatus("Description saved.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Could not save.");
    }
  }

  async function remove() {
    try {
      await cmsFetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
      onDelete(item.id);
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Could not delete.");
    }
  }

  const absolute = item.url.startsWith("http") ? item.url : `${window.location.origin}${item.url}`;

  return (
    <aside className="cms-media-details">
      <div className="cms-media-details__preview">{item.kind === "video" ? <video src={item.url} controls playsInline /> : <img src={item.url} alt={item.alt} />}</div>
      <dl>
        <div><dt>File</dt><dd title={item.filename}>{item.filename}</dd></div>
        <div><dt>Size</dt><dd>{formatBytes(item.sizeBytes)} · {item.mime.split("/")[1]?.toUpperCase()}</dd></div>
        <div><dt>Added</dt><dd>{formatDate(item.createdAt)}{item.uploadedBy ? ` by ${item.uploadedBy}` : ""}</dd></div>
        <div><dt>Stored on</dt><dd>{item.storage === "r2" ? "Cloudflare R2" : "This server"}</dd></div>
      </dl>
      <label className="cms-field">
        <span>Description (alt text)</span>
        <textarea rows={3} maxLength={300} value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Describe what the image shows, for screen readers and search engines" />
      </label>
      <div className="cms-row">
        <button type="button" className="cms-btn cms-btn--primary" onClick={() => void saveAlt()} disabled={alt === item.alt}>Save description</button>
        <button type="button" className="cms-btn cms-btn--ghost" onClick={() => { void navigator.clipboard.writeText(absolute); setStatus("Link copied."); }}>Copy link</button>
      </div>
      {status && <p className="cms-hint" role="status">{status}</p>}
      <div className="cms-danger-zone">
        {confirming ? (
          <>
            <p>Delete this file? Any page still using it will show a missing image.</p>
            <div className="cms-row">
              <button type="button" className="cms-btn cms-btn--danger" onClick={() => void remove()}>Yes, delete</button>
              <button type="button" className="cms-btn cms-btn--ghost" onClick={() => setConfirming(false)}>Keep it</button>
            </div>
          </>
        ) : <button type="button" className="cms-link cms-link--danger" onClick={() => setConfirming(true)}>Delete file…</button>}
      </div>
    </aside>
  );
}

/** Full-page media library (CMS → Media library). */
export function AdminMediaLibrary() {
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const library = useLibrary(kind, query);

  return (
    <div className="cms-media">
      <Uploader onUploaded={(item) => { library.setItems((current) => [item, ...current]); library.setTotal((count) => count + 1); setSelected(item); }} />
      <div className="cms-toolbar">
        <div className="cms-segmented" role="group" aria-label="Filter by type">
          {[["", "All"], ["image", "Images"], ["video", "Videos"]].map(([value, label]) => (
            <button key={value} type="button" className={kind === value ? "is-active" : ""} onClick={() => setKind(value)}>{label}</button>
          ))}
        </div>
        <input className="cms-search" type="search" placeholder="Search by file name or description" value={query} onChange={(event) => setQuery(event.target.value)} />
        <span className="cms-muted">{library.total} file{library.total === 1 ? "" : "s"} · {library.storage === "r2" ? "Cloudflare R2" : "stored on this server"}</span>
      </div>
      {library.error && <p className="cms-alert cms-alert--error">{library.error}</p>}
      <div className={`cms-media__layout${selected ? " has-details" : ""}`}>
        <ul className="cms-media-grid">
          {library.items.map((item) => (
            <li key={item.id}>
              <button type="button" className={selected?.id === item.id ? "is-selected" : ""} onClick={() => setSelected(item)} title={item.filename}>
                <Thumb item={item} />
                {item.kind === "video" && <span className="cms-media-grid__tag">Video</span>}
                {!item.alt && item.kind === "image" && <span className="cms-media-grid__warn" title="No description yet">Alt</span>}
              </button>
            </li>
          ))}
        </ul>
        {selected && (
          <Details
            item={selected}
            onChange={(item) => { setSelected(item); library.setItems((current) => current.map((entry) => (entry.id === item.id ? item : entry))); }}
            onDelete={(id) => { setSelected(null); library.setItems((current) => current.filter((entry) => entry.id !== id)); library.setTotal((count) => count - 1); }}
          />
        )}
      </div>
      {!library.loading && !library.items.length && <p className="cms-empty">{query || kind ? "Nothing matches these filters." : "The library is empty. Drop your first images above."}</p>}
      {library.items.length < library.total && (
        <button type="button" className="cms-btn cms-btn--ghost cms-btn--center" onClick={() => void library.load(library.items.length)} disabled={library.loading}>{library.loading ? "Loading…" : "Load more"}</button>
      )}
    </div>
  );
}

/** Modal picker used by every image/video field in the editors. */
export function MediaPicker({ kind = "image", onSelect, onClose }: { kind?: "image" | "video" | ""; onSelect: (item: LibraryItem) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const library = useLibrary(kind, query);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="cms-modal" role="dialog" aria-modal="true" aria-label="Choose from the media library" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="cms-modal__panel cms-modal__panel--wide">
        <header className="cms-modal__head">
          <div><p className="cms-eyebrow">Media library</p><h2>Choose {kind === "video" ? "a video" : kind === "image" ? "an image" : "a file"}</h2></div>
          <button type="button" className="cms-modal__close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <Uploader accept={kind === "video" ? "video/mp4,video/webm" : kind === "image" ? "image/jpeg,image/png,image/webp,image/avif,image/gif" : ACCEPT} onUploaded={(item) => onSelect(item)} />
        <input className="cms-search" type="search" placeholder="Search the library" value={query} onChange={(event) => setQuery(event.target.value)} />
        {library.error && <p className="cms-alert cms-alert--error">{library.error}</p>}
        <ul className="cms-media-grid cms-media-grid--picker">
          {library.items.map((item) => (
            <li key={item.id}><button type="button" onClick={() => onSelect(item)} title={item.filename}><Thumb item={item} /></button></li>
          ))}
        </ul>
        {!library.loading && !library.items.length && <p className="cms-empty">No files yet — upload one above.</p>}
        {library.items.length < library.total && <button type="button" className="cms-btn cms-btn--ghost cms-btn--center" onClick={() => void library.load(library.items.length)}>Load more</button>}
      </div>
    </div>
  );
}
