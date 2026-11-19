"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cmsFetch, formatDate, timeAgo } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/cms/collection-list";
import { Field, SearchPreview, type Options, type Values } from "@/components/admin/cms/fields";
import { COLLECTIONS, SEO_FIELDSET, allFields, type CollectionId } from "@/lib/cms/collections";

type Entry = {
  id: string; collection: CollectionId; slug: string; title: string; status: "draft" | "published"; sortOrder: number; showOnHome: boolean;
  data: Values; hasUnpublishedChanges: boolean; publishedAt: string | null; updatedBy: string; updatedAt: string; deletedAt: string | null; pendingSlug: string | null;
};
type Version = { id: string; title: string; note: string; createdBy: string; createdAt: string };
type Payload = { entry: Entry; versions: Version[]; options: Options; notified?: { enabled: boolean; total: number; sent: number } | null };
type Snapshot = { values: Values; slug: string; sortOrder: number; showOnHome: boolean };

function isEmptyValue(value: unknown) {
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === "object") return !JSON.stringify(value).includes('"text"') && !JSON.stringify(value).includes('"image"');
  return !value;
}

/** The editor of any collection item, with the publish box, version history and unsaved-changes guard. */
export function EntryEditor({ id }: { id: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<Snapshot | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [busy, setBusy] = useState<"" | "draft" | "publish" | "unpublish" | "other">("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const adopt = useCallback((data: Payload) => {
    const snapshot = { values: data.entry.data, slug: data.entry.pendingSlug || data.entry.slug, sortOrder: data.entry.sortOrder, showOnHome: data.entry.showOnHome };
    setPayload(data);
    setForm(snapshot);
    setSaved(JSON.stringify(snapshot));
  }, []);

  useEffect(() => {
    cmsFetch<Payload>(`/api/admin/cms/entry/${id}`).then(adopt).catch((reason: Error) => setNotice({ tone: "error", text: reason.message }));
    if (new URLSearchParams(window.location.search).get("new")) setNotice({ tone: "info", text: "Added as a draft. Fill in the boxes below, then press Publish when it's ready. Nothing shows on the website until then." });
  }, [id, adopt]);

  const dirty = Boolean(form) && JSON.stringify(form) !== saved;

  // Warn before leaving with unsaved changes (closing the tab, or clicking a link in the CMS).
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.href.startsWith(`${window.location.href.split("#")[0]}#`)) return;
      if (!window.confirm("You have changes that aren't saved. Leave without saving?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onClick, true); };
  }, [dirty]);

  const save = useCallback(async (mode: "draft" | "publish" | "unpublish") => {
    if (!form) return;
    setBusy(mode);
    setNotice(null);
    try {
      const result = await cmsFetch<Payload>(`/api/admin/cms/entry/${id}`, { method: "PUT", body: JSON.stringify({ ...form, mode }) });
      adopt(result);
      const live = result.entry.status === "published";
      setNotice({
        tone: "ok",
        text: mode === "publish"
          ? `Published — it's live on the website now.${result.notified?.enabled ? ` ${result.notified.sent} subscriber${result.notified.sent === 1 ? " was" : "s were"} emailed.` : ""}`
          : mode === "unpublish" ? "Taken off the website. It's kept here as a draft."
          : live ? "Changes saved. The website still shows the published version until you press “Update website”." : "Draft saved.",
      });
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not save." });
    } finally {
      setBusy("");
    }
  }, [form, id, adopt]);

  // Ctrl + S saves a draft.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); if (dirty && !busy) void save("draft"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, busy, save]);

  async function action(name: "discard" | "trash" | "restore") {
    setBusy("other");
    try {
      const result = await cmsFetch<Payload & { collection?: string }>(`/api/admin/cms/entry/${id}`, { method: "POST", body: JSON.stringify({ action: name }) });
      if (name === "trash") { setSaved(JSON.stringify(form)); window.location.assign(`/admin/${payload?.entry.collection}?trashed=1`); return; }
      if (name === "discard") { adopt(result); setEditorKey((key) => key + 1); setNotice({ tone: "ok", text: "Unpublished changes thrown away. The form shows what's live." }); }
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "That didn't work." });
    } finally {
      setBusy("");
    }
  }

  async function loadVersion(version: Version) {
    try {
      const result = await cmsFetch<{ data: Values & { __slug?: string } }>(`/api/admin/cms/entry/${id}`, { method: "POST", body: JSON.stringify({ action: "load-version", versionId: version.id }) });
      const { __slug, ...values } = result.data;
      setForm((current) => current && { ...current, values, slug: __slug || current.slug });
      setEditorKey((key) => key + 1);
      setNotice({ tone: "info", text: `Loaded the version from ${formatDate(version.createdAt, true)}. Check it, then save or publish to keep it.` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "That version couldn't be loaded." });
    }
  }

  const def = payload ? COLLECTIONS[payload.entry.collection] : null;
  const missing = useMemo(() => (def && form ? allFields(def).filter((field) => field.requiredToPublish && isEmptyValue(form.values[field.key])).map((field) => field.label) : []), [def, form]);

  if (!payload || !form || !def) return notice ? <p className={`cms-alert cms-alert--${notice.tone}`}>{notice.text}</p> : <div className="cms-skeleton" style={{ height: 400 }} />;

  const { entry } = payload;
  const set = (key: string, value: unknown) => setForm((current) => current && { ...current, values: { ...current.values, [key]: value } });
  const live = entry.status === "published";
  const url = def.publicPath ? def.publicPath(form.slug) : "";
  const title = String(form.values.title || entry.title);
  const summary = String(form.values.excerpt || form.values.summary || form.values.description || "");

  return (
    <div className="cmse">
      <div className="cmse-top">
        <Link className="cms-link" href={`/admin/${entry.collection}`}>← Back to {def.label}</Link>
        <div className="cms-row">
          <StatusBadge status={entry.status} changes={entry.hasUnpublishedChanges} />
          {dirty && <span className="cmse-unsaved">● Unsaved changes</span>}
          {live && def.publicPath && <a className="cms-btn cms-btn--ghost cms-btn--small" href={def.publicPath(entry.slug)} target="_blank" rel="noreferrer">View on website ↗</a>}
        </div>
      </div>
      <h2 className="cmse-title">{title || `Untitled ${def.singular}`}</h2>
      {notice && <p className={`cms-alert cms-alert--${notice.tone}`} role="status">{notice.text}</p>}

      <div className="cmse-grid">
        <div className="cmse-main" key={editorKey}>
          {def.fieldsets.map((set_, index) => (
            <fieldset className="cmse-box" key={set_.legend}>
              <legend><span>{String(index + 1).padStart(2, "0")}</span>{set_.legend}</legend>
              {set_.description && <p className="cmse-box__intro">{set_.description}</p>}
              <div className="cmse-fields">
                {set_.fields.map((field) => <Field key={field.key} field={field} values={form.values} set={set} options={payload.options} />)}
              </div>
            </fieldset>
          ))}
          {def.seo && (
            <fieldset className="cmse-box">
              <legend><span>{String(def.fieldsets.length + 1).padStart(2, "0")}</span>{SEO_FIELDSET.legend}</legend>
              <p className="cmse-box__intro">{SEO_FIELDSET.description}</p>
              <SearchPreview title={String(form.values.seoTitle || title)} description={String(form.values.metaDescription || summary)} url={`${typeof window !== "undefined" ? window.location.host : ""}${url}`} />
              <div className="cmse-fields">
                {SEO_FIELDSET.fields.map((field) => <Field key={field.key} field={field} values={form.values} set={set} options={payload.options} />)}
              </div>
            </fieldset>
          )}
        </div>

        <aside className="cmse-side">
          <section className="cmse-box cmse-publish">
            <p className="cms-eyebrow">Publish</p>
            <p className="cmse-publish__state">
              {live ? (entry.hasUnpublishedChanges ? "Live, with saved changes waiting to be published." : `Live since ${entry.publishedAt ? formatDate(entry.publishedAt) : "today"}.`) : "Draft — not on the website yet."}
            </p>
            {missing.length > 0 && (
              <div className="cmse-missing">
                <strong>Before publishing, fill in:</strong>
                <ul>{missing.map((label) => <li key={label}>{label}</li>)}</ul>
              </div>
            )}
            <div className="cmse-publish__buttons">
              <button type="button" className="cms-btn cms-btn--primary cms-btn--block" disabled={Boolean(busy) || missing.length > 0 || (live && !dirty && !entry.hasUnpublishedChanges)} onClick={() => void save("publish")}>
                {busy === "publish" ? "Publishing…" : live ? "Update website" : "Publish"}
              </button>
              <button type="button" className="cms-btn cms-btn--ghost cms-btn--block" disabled={Boolean(busy) || !dirty} onClick={() => void save("draft")}>
                {busy === "draft" ? "Saving…" : live ? "Save without publishing" : "Save draft"}
              </button>
            </div>
            <p className="cmse-hint">Tip: <kbd>Ctrl</kbd> + <kbd>S</kbd> saves.</p>
            {entry.hasUnpublishedChanges && <button type="button" className="cms-link" disabled={Boolean(busy)} onClick={() => void action("discard")}>Throw away unpublished changes</button>}
            {live && <button type="button" className="cms-link cmse-unpublish" disabled={Boolean(busy)} onClick={() => void save("unpublish")}>Take off the website</button>}
          </section>

          <section className="cmse-box">
            <p className="cms-eyebrow">Settings</p>
            {def.publicPath && (
              <label className="cmsf">
                <span className="cmsf-label"><span>Page address</span></span>
                <span className="cmse-slug"><span>{def.publicPath("").replace(/\/$/, "/")}</span><input value={form.slug} maxLength={80} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} /></span>
                <small className="cmsf-hint">{live ? "Changing it keeps old links working — visitors are sent to the new address." : "Made from the title. Letters, numbers and dashes."}</small>
              </label>
            )}
            {def.homeToggle && (
              <label className="cms-switch"><input type="checkbox" checked={form.showOnHome} onChange={(event) => setForm({ ...form, showOnHome: event.target.checked })} /><span>{def.homeToggle}</span></label>
            )}
            <label className="cmsf">
              <span className="cmsf-label"><span>Order</span></span>
              <input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
              <small className="cmsf-hint">Lower numbers come first. You can also drag items in the list.</small>
            </label>
          </section>

          <section className="cmse-box cmse-history">
            <p className="cms-eyebrow">Version history</p>
            {payload.versions.length ? (
              <ol>
                {payload.versions.slice(0, 12).map((version) => (
                  <li key={version.id}>
                    <span><strong>{version.note}</strong><small>{timeAgo(version.createdAt)}{version.createdBy && version.createdBy !== "migration" ? ` · ${version.createdBy}` : ""}</small></span>
                    <button type="button" className="cms-link" onClick={() => void loadVersion(version)}>Load</button>
                  </li>
                ))}
              </ol>
            ) : <p className="cms-muted">Every save is kept here, so you can go back to an earlier version.</p>}
          </section>

          <section className="cmse-box cmse-danger">
            {confirmTrash ? (
              <>
                <p>Move “{entry.title}” to the trash? {live ? "It disappears from the website. " : ""}You can restore it from Trash.</p>
                <div className="cms-row">
                  <button type="button" className="cms-btn cms-btn--danger cms-btn--small" onClick={() => void action("trash")}>Move to trash</button>
                  <button type="button" className="cms-btn cms-btn--ghost cms-btn--small" onClick={() => setConfirmTrash(false)}>Keep it</button>
                </div>
              </>
            ) : <button type="button" className="cms-link cms-link--danger" onClick={() => setConfirmTrash(true)}>Move to trash…</button>}
          </section>
        </aside>
      </div>

      {dirty && (
        <div className="cmse-bar" role="region" aria-label="Unsaved changes">
          <span>You have unsaved changes</span>
          <button type="button" className="cms-btn cms-btn--ghost cms-btn--small" disabled={Boolean(busy)} onClick={() => void save("draft")}>Save</button>
          {missing.length === 0 && <button type="button" className="cms-btn cms-btn--amber cms-btn--small" disabled={Boolean(busy)} onClick={() => void save("publish")}>{live ? "Update website" : "Publish"}</button>}
        </div>
      )}
    </div>
  );
}
