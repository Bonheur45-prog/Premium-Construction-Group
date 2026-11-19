"use client";

/* eslint-disable @next/next/no-img-element -- previews of any media URL */
import { useCallback, useEffect, useState } from "react";
import { cmsFetch, timeAgo } from "@/components/admin/format";
import { MediaPicker } from "@/components/admin/media-library";

type Stage = "completed" | "ongoing" | "upcoming";
type Project = {
  id: string; slug: string; title: string; category: string; stage: Stage; location: string; year: string; client: string;
  summary: string; body: string; cover: string; coverAlt: string; gallery: Array<{ src: string; alt: string; caption: string }>;
  facts: Array<{ label: string; value: string }>; featured: boolean; published: boolean; sortOrder: number; createdAt: string; updatedAt: string;
};
type Draft = Omit<Project, "id" | "createdAt" | "updatedAt"> & { id?: string };

const STAGES: Record<Stage, string> = { completed: "Completed", ongoing: "In progress", upcoming: "Upcoming" };
const emptyDraft = (): Draft => ({
  slug: "", title: "", category: "", stage: "completed", location: "", year: String(new Date().getFullYear()), client: "", summary: "", body: "",
  cover: "", coverAlt: "", gallery: [], facts: [{ label: "Floor area", value: "" }, { label: "Duration", value: "" }], featured: false, published: false, sortOrder: 0,
});

function Field({ label, children, hint, wide }: { label: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  return <label className={`cms-field${wide ? " cms-field--wide" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Editor({ initial, categories, onSaved, onDeleted, onCancel }: {
  initial: Draft; categories: Array<{ id: string; label: string }>;
  onSaved: (project: Project) => void; onDeleted: (id: string) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [picker, setPicker] = useState<null | "cover" | "gallery">(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function save(publish?: boolean) {
    setSaving(true);
    setNotice(null);
    try {
      const body = JSON.stringify({ ...draft, published: publish ?? draft.published });
      const result = draft.id
        ? await cmsFetch<{ project: Project }>(`/api/admin/projects/${draft.id}`, { method: "PUT", body })
        : await cmsFetch<{ project: Project }>("/api/admin/projects", { method: "POST", body });
      setDraft(result.project);
      onSaved(result.project);
      setNotice({ tone: "ok", text: result.project.published ? "Saved and live on the website." : "Saved as a draft." });
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft.id) return onCancel();
    try {
      await cmsFetch(`/api/admin/projects/${draft.id}`, { method: "DELETE" });
      onDeleted(draft.id);
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not delete." });
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    const gallery = [...draft.gallery];
    const target = index + direction;
    if (target < 0 || target >= gallery.length) return;
    [gallery[index], gallery[target]] = [gallery[target], gallery[index]];
    set("gallery", gallery);
  }

  return (
    <div className="cms-project-editor">
      <div className="cms-project-editor__bar">
        <button type="button" className="cms-link" onClick={onCancel}>← All projects</button>
        <div className="cms-row">
          {draft.id && draft.published && <a className="cms-btn cms-btn--ghost cms-btn--small" href={`/projects/${draft.slug}`} target="_blank" rel="noreferrer">View on site ↗</a>}
          <button type="button" className="cms-btn cms-btn--ghost" disabled={saving} onClick={() => void save(false)}>{draft.published ? "Unpublish" : "Save draft"}</button>
          <button type="button" className="cms-btn cms-btn--primary" disabled={saving} onClick={() => void save(true)}>{saving ? "Saving…" : draft.published ? "Save changes" : "Publish"}</button>
        </div>
      </div>
      {notice && <p className={`cms-alert cms-alert--${notice.tone}`} role="status">{notice.text}</p>}

      <div className="cms-project-editor__grid">
        <section className="cms-card">
          <p className="cms-eyebrow">01 / The project</p>
          <div className="cms-form-grid">
            <Field label="Title" wide><input value={draft.title} maxLength={160} onChange={(event) => set("title", event.target.value)} placeholder="e.g. Kacyiru office pavilion" /></Field>
            <Field label="Web address" hint={`premium…/projects/${draft.slug || "auto-from-title"}`}><input value={draft.slug} maxLength={80} onChange={(event) => set("slug", event.target.value)} placeholder="auto from title" /></Field>
            <Field label="Category">
              <select value={draft.category} onChange={(event) => set("category", event.target.value)}>
                <option value="">No category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </Field>
            <Field label="Stage">
              <select value={draft.stage} onChange={(event) => set("stage", event.target.value as Stage)}>
                {Object.entries(STAGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Year"><input value={draft.year} maxLength={20} onChange={(event) => set("year", event.target.value)} placeholder="2025 or 2024–2026" /></Field>
            <Field label="Location"><input value={draft.location} maxLength={160} onChange={(event) => set("location", event.target.value)} placeholder="Kigali, Rwanda" /></Field>
            <Field label="Client (optional)"><input value={draft.client} maxLength={160} onChange={(event) => set("client", event.target.value)} placeholder="Leave blank to keep private" /></Field>
            <Field label="Short summary" wide hint="One or two sentences, shown on cards and in search results."><textarea rows={3} maxLength={600} value={draft.summary} onChange={(event) => set("summary", event.target.value)} /></Field>
            <Field label="The story" wide hint="Leave a blank line between paragraphs."><textarea rows={9} maxLength={20000} value={draft.body} onChange={(event) => set("body", event.target.value)} placeholder="The brief, the challenge, how the team delivered it, and the result." /></Field>
          </div>
        </section>

        <div className="cms-project-editor__side">
          <section className="cms-card">
            <p className="cms-eyebrow">02 / Cover image</p>
            <button type="button" className="cms-cover-slot" onClick={() => setPicker("cover")}>
              {draft.cover ? <img src={draft.cover} alt="" /> : <span>Choose a cover image</span>}
            </button>
            <Field label="Cover description (alt text)"><input value={draft.coverAlt} maxLength={300} onChange={(event) => set("coverAlt", event.target.value)} placeholder="What the image shows" /></Field>
          </section>
          <section className="cms-card">
            <p className="cms-eyebrow">03 / Visibility</p>
            <label className="cms-switch"><input type="checkbox" checked={draft.featured} onChange={(event) => set("featured", event.target.checked)} /><span>Feature this project at the top of the portfolio</span></label>
            <Field label="Order" hint="Lower numbers show first."><input type="number" value={draft.sortOrder} onChange={(event) => set("sortOrder", Number(event.target.value))} /></Field>
            <p className="cms-hint">{draft.published ? "● Live on the website" : "○ Draft — only visible here"}</p>
          </section>
          <section className="cms-card">
            <p className="cms-eyebrow">04 / Key facts</p>
            <div className="cms-facts">
              {draft.facts.map((fact, index) => (
                <div key={index} className="cms-facts__row">
                  <input aria-label="Fact label" value={fact.label} maxLength={60} placeholder="Label" onChange={(event) => set("facts", draft.facts.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))} />
                  <input aria-label="Fact value" value={fact.value} maxLength={160} placeholder="Value" onChange={(event) => set("facts", draft.facts.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))} />
                  <button type="button" aria-label="Remove fact" onClick={() => set("facts", draft.facts.filter((_, i) => i !== index))}>×</button>
                </div>
              ))}
            </div>
            {draft.facts.length < 12 && <button type="button" className="cms-link" onClick={() => set("facts", [...draft.facts, { label: "", value: "" }])}>+ Add a fact</button>}
          </section>
        </div>

        <section className="cms-card cms-project-editor__gallery">
          <div className="cms-card__head">
            <div><p className="cms-eyebrow">05 / Gallery</p><h2>{draft.gallery.length} image{draft.gallery.length === 1 ? "" : "s"}</h2></div>
            <button type="button" className="cms-btn cms-btn--ghost" onClick={() => setPicker("gallery")} disabled={draft.gallery.length >= 40}>+ Add images</button>
          </div>
          {draft.gallery.length ? (
            <ol className="cms-gallery-list">
              {draft.gallery.map((image, index) => (
                <li key={`${image.src}-${index}`}>
                  <img src={image.src} alt="" />
                  <div className="cms-gallery-list__fields">
                    <input value={image.alt} maxLength={300} placeholder="Description (alt text)" onChange={(event) => set("gallery", draft.gallery.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)))} />
                    <input value={image.caption} maxLength={300} placeholder="Caption (optional)" onChange={(event) => set("gallery", draft.gallery.map((item, i) => (i === index ? { ...item, caption: event.target.value } : item)))} />
                  </div>
                  <div className="cms-gallery-list__tools">
                    <button type="button" aria-label="Move up" onClick={() => moveImage(index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" aria-label="Move down" onClick={() => moveImage(index, 1)} disabled={index === draft.gallery.length - 1}>↓</button>
                    <button type="button" aria-label="Remove" onClick={() => set("gallery", draft.gallery.filter((_, i) => i !== index))}>×</button>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="cms-empty">Add progress shots, finished spaces and details. Drag order with the arrows.</p>}
        </section>
      </div>

      <div className="cms-danger-zone">
        {confirmDelete ? (
          <div className="cms-row"><span>Delete this project permanently?</span><button type="button" className="cms-btn cms-btn--danger cms-btn--small" onClick={() => void remove()}>Delete</button><button type="button" className="cms-btn cms-btn--ghost cms-btn--small" onClick={() => setConfirmDelete(false)}>Keep</button></div>
        ) : <button type="button" className="cms-link cms-link--danger" onClick={() => setConfirmDelete(true)}>{draft.id ? "Delete project…" : "Discard"}</button>}
      </div>

      {picker && (
        <MediaPicker
          kind="image"
          onClose={() => setPicker(null)}
          onSelect={(item) => {
            if (picker === "cover") { setDraft((current) => ({ ...current, cover: item.url, coverAlt: current.coverAlt || item.alt })); setPicker(null); }
            else setDraft((current) => ({ ...current, gallery: [...current.gallery, { src: item.url, alt: item.alt, caption: "" }].slice(0, 40) }));
          }}
        />
      )}
    </div>
  );
}

export function AdminProjectsEditor() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await cmsFetch<{ projects: Project[]; categories: Array<{ id: string; label: string }> }>("/api/admin/projects");
      setProjects(data.projects);
      setCategories(data.categories);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Projects could not be loaded.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (editing) {
    return (
      <Editor
        key={editing.id || "new"}
        initial={editing}
        categories={categories}
        onCancel={() => setEditing(null)}
        onSaved={(project) => setProjects((current) => [project, ...(current || []).filter((item) => item.id !== project.id)])}
        onDeleted={(id) => { setProjects((current) => (current || []).filter((item) => item.id !== id)); setEditing(null); }}
      />
    );
  }

  const visible = (projects || []).filter((project) => !filter || project.category === filter);
  const label = (id: string) => categories.find((category) => category.id === id)?.label || "Uncategorised";

  return (
    <div className="cms-projects">
      <div className="cms-toolbar">
        <div className="cms-segmented" role="group" aria-label="Filter by category">
          <button type="button" className={!filter ? "is-active" : ""} onClick={() => setFilter("")}>All</button>
          {categories.map((category) => <button key={category.id} type="button" className={filter === category.id ? "is-active" : ""} onClick={() => setFilter(category.id)}>{category.label}</button>)}
        </div>
        <button type="button" className="cms-btn cms-btn--amber" onClick={() => setEditing(emptyDraft())}>+ New project</button>
      </div>
      {error && <p className="cms-alert cms-alert--error">{error}</p>}
      <ul className="cms-project-grid">
        {visible.map((project) => (
          <li key={project.id}>
            <button type="button" onClick={() => setEditing(project)}>
              <span className="cms-project-grid__cover">{project.cover ? <img src={project.cover} alt="" /> : <span>No cover yet</span>}</span>
              <span className="cms-project-grid__body">
                <span className="cms-row">
                  <span className={`cms-pill cms-pill--${project.published ? "replied" : "archived"}`}>{project.published ? "Live" : "Draft"}</span>
                  {project.featured && <span className="cms-pill cms-pill--new">Featured</span>}
                  <span className="cms-pill">{STAGES[project.stage]}</span>
                </span>
                <strong>{project.title}</strong>
                <small>{[label(project.category), project.location, project.year].filter(Boolean).join(" · ")}</small>
                <small className="cms-muted">Edited {timeAgo(project.updatedAt)} · {project.gallery.length} photo{project.gallery.length === 1 ? "" : "s"}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {projects && !visible.length && <p className="cms-empty">{filter ? "No projects in this category yet." : "No projects yet. Add your first one to start the portfolio."}</p>}
    </div>
  );
}
