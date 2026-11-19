"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaPicker } from "@/components/admin/media-library";
import { customSitePageTemplate, defaultSiteContent, type SiteContent } from "@/lib/site-content/content";

export type SitePage = "about" | "approach" | "services" | "projects" | "insights" | "careers" | "contact" | "reservations" | "detailPages" | "custom-pages";

const pageLabels: { id: SitePage; label: string; hint: string }[] = [
  { id: "about", label: "About", hint: "Story, purpose, values, and strengths" },
  { id: "approach", label: "Our approach", hint: "Approach introduction, process, principles, and closing message" },
  { id: "services", label: "Services page", hint: "The words around your services: page introduction, process and closing message" },
  { id: "projects", label: "Projects page", hint: "Page introduction and the project categories (Commercial, Residential …)" },
  { id: "insights", label: "Blog page", hint: "The introduction and newsletter wording on the blog page" },
  { id: "careers", label: "Careers page", hint: "The introduction on the careers page, and what shows when no job is open" },
  { id: "contact", label: "Contact", hint: "Enquiry and meeting reservation page copy" },
  { id: "reservations", label: "Reservations", hint: "Booking page copy, opening hours, and meeting availability" },
  { id: "detailPages", label: "Project page wording", hint: "The fixed wording on every project page: data sheet, gallery and closing message" },
  { id: "custom-pages", label: "Custom pages", hint: "Create and publish additional website pages" },
];

/** Lists that now have their own section in the CMS (add / publish / reorder there). */
const HIDDEN_KEYS: Partial<Record<SitePage, string[]>> = {
  services: ["services"],
  insights: ["articles", "feedUrls"],
  detailPages: ["services"],
};
const MANAGED_ELSEWHERE: Partial<Record<SitePage, { text: string; href: string; action: string }>> = {
  services: { text: "Each service (its card and its own page) is edited under Services.", href: "/admin/services", action: "Open Services" },
  projects: { text: "Projects themselves are added under Projects.", href: "/admin/projects", action: "Open Projects" },
  insights: { text: "Articles are written and published under Blog.", href: "/admin/insights", action: "Open Blog" },
  careers: { text: "Job openings are added under Careers.", href: "/admin/jobs", action: "Open Careers" },
};

function fieldLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getAtPath(value: unknown, path: string[]) {
  return path.reduce<unknown>((current, part) => isRecord(current) ? current[part] : Array.isArray(current) ? current[Number(part)] : undefined, value);
}

function setAtPath(value: SiteContent, path: string[], nextValue: unknown) {
  const copy = structuredClone(value) as unknown as Record<string, unknown>;
  let parent: unknown = copy;
  for (const part of path.slice(0, -1)) {
    parent = isRecord(parent) ? parent[part] : Array.isArray(parent) ? parent[Number(part)] : undefined;
  }
  const key = path[path.length - 1];
  if (isRecord(parent)) parent[key] = nextValue;
  else if (Array.isArray(parent)) parent[Number(key)] = nextValue;
  return copy as SiteContent;
}

function entryLabel(value: unknown, index: number, label: string) {
  if (isRecord(value)) {
    const name = [value.title, value.name, value.label, value.slug, value.id].find((candidate) => typeof candidate === "string" && candidate.trim());
    if (typeof name === "string") return `${label} ${index + 1} · ${name.slice(0, 54)}`;
  }
  return `${label} ${index + 1}`;
}

function freshEntry(template: unknown, arrayPath: string, index: number): unknown {
  if (typeof template === "string") return "";
  if (typeof template === "boolean") return false;
  if (!isRecord(template)) return template;
  const entry = structuredClone(template);
  const suffix = `${Date.now().toString(36)}-${index + 1}`;
  if (typeof entry.id === "string") entry.id = `${entry.id}-${suffix}`;
  if (typeof entry.slug === "string") entry.slug = `new-insight-${suffix}`;
  if (typeof entry.number === "string") entry.number = "NEW";
  if (arrayPath.endsWith("articles")) entry.status = "draft";
  return entry;
}

function MediaInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/homepage/media", { method: "POST", body });
      const result = await response.json();
      if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
      if (!response.ok) throw new Error(result.error || "The media upload failed.");
      onChange(result.src as string);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The media upload failed.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <>
      <div className="admin-content-media-row">
        <input aria-label={label} type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste a media URL or upload an image" />
        <label className="admin-content-upload">{uploading ? "Uploading…" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={uploading} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
        <button type="button" className="admin-content-upload admin-content-library" onClick={() => setPicking(true)}>Library</button>
      </div>
      {picking && <MediaPicker kind="image" onClose={() => setPicking(false)} onSelect={(item) => { onChange(item.url); setPicking(false); }} />}
      {value && <img className="admin-content-media-preview" src={value} alt="" />}
      {error && <small className="admin-content-error">{error}</small>}
    </>
  );
}

function ContentNode({
  label, value, template, path, onChange, onRemove, onMove,
}: {
  label: string;
  value: unknown;
  template: unknown;
  path: string[];
  onChange: (value: unknown) => void;
  onRemove?: (index: number) => void;
  onMove?: (index: number, direction: -1 | 1) => void;
}) {
  const pathName = path.join(".");
  if (typeof value === "string") {
    const lowerLabel = label.toLowerCase();
    const useTextarea = value.length > 110 || /paragraph|intro|summary|description|body|takeaway|image alt|image caption|text|note/i.test(lowerLabel);
    const isMedia = /(?:^|\.)(?:image|src|logo)$|image$/i.test(pathName);
    const isFeedUrl = pathName.includes("feedUrls");
    const isSiteOrigin = pathName.endsWith(".siteUrl");
    return (
      <label className="admin-home-field admin-content-field">
        <span>{label}</span>
        {isMedia ? <MediaInput label={label} value={value} onChange={onChange} /> : isFeedUrl
          ? <><input type="url" inputMode="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://example.com/feed.xml" /><small>Paste an HTTP or HTTPS RSS/Atom feed URL.</small></> : useTextarea
          ? <textarea value={value} onChange={(event) => onChange(event.target.value)} />
          : isSiteOrigin
            ? <input type="url" inputMode="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://www.example.co.za" />
          : pathName.endsWith(".status")
            ? <select value={value} onChange={(event) => onChange(event.target.value)}><option value="draft">Draft · hidden from site</option><option value="published">Published</option></select>
            : pathName.endsWith(".topic")
              ? <select value={value} onChange={(event) => onChange(event.target.value)}><option>Planning</option><option>Project delivery</option><option>Long-term value</option></select>
              : <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />}
        {(isSiteOrigin || /(?:href|url)$/i.test(pathName) || isMedia) && <small>{isMedia ? "Use an https:// image URL or upload an image." : isSiteOrigin ? "Use the full public site origin. It powers canonical links, the sitemap, and structured data." : "Use a site path such as /contact or an https:// URL."}</small>}
      </label>
    );
  }
  if (typeof value === "boolean") {
    return <label className="admin-home-switch admin-content-switch"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
  }
  if (typeof value === "number") {
    if (pathName.endsWith(".duration")) {
      return <label className="admin-home-field admin-content-field"><span>{label}</span><select value={value} onChange={(event) => onChange(Number(event.target.value))}><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option><option value={120}>120 minutes</option></select></label>;
    }
    if (pathName.endsWith(".windowDays")) {
      return <label className="admin-home-field admin-content-field"><span>{label}</span><input type="number" min={1} max={90} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} /><small>Choose from 1 to 90 days ahead.</small></label>;
    }
    return <label className="admin-home-field admin-content-field"><span>{label}</span><input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
  }
  if (Array.isArray(value)) {
    if (/\.(keywords|sectionTitles|questions)$/.test(pathName) && value.every((item) => typeof item === "string")) {
      return (
        <label className="admin-home-field admin-content-field">
          <span>{label}</span>
          <textarea value={value.join("\n")} placeholder="One item per line" onChange={(event) => onChange(event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} />
          <small>Enter one item per line.</small>
        </label>
      );
    }
    const templateArray = Array.isArray(template) ? template : [];
    const itemTemplate = templateArray[0] ?? (pathName.endsWith("feedUrls") ? "" : {});
    return (
      <details className="admin-content-group" open={path.length < 2 || undefined}>
        <summary><span><strong>{label}</strong><small>{value.length} {value.length === 1 ? "item" : "items"}</small></span></summary>
        <div className="admin-content-group__body">
          {value.map((item, index) => (
            <div className="admin-content-array-item" key={`${pathName}-${index}`}>
              <div className="admin-content-array-item__heading">
                <strong>{entryLabel(item, index, label.replace(/s$/, ""))}</strong>
                <div>
                  <button type="button" disabled={index === 0} aria-label={`Move ${label} item up`} onClick={() => onMove && onMove(index, -1)}>↑</button>
                  <button type="button" disabled={index === value.length - 1} aria-label={`Move ${label} item down`} onClick={() => onMove && onMove(index, 1)}>↓</button>
                  <button type="button" className="is-destructive" onClick={() => onRemove && onRemove(index)}>Remove</button>
                </div>
              </div>
              <ContentNode
                label={typeof item === "string" ? `${label.replace(/s$/, "")} ${index + 1}` : "Details"}
                value={item}
                template={itemTemplate}
                path={[...path, String(index)]}
                onChange={(nextValue) => onChange(value.map((current, currentIndex) => currentIndex === index ? nextValue : current))}
                onRemove={undefined}
                onMove={undefined}
              />
            </div>
          ))}
          <button className="admin-home-add" type="button" onClick={() => onChange([...value, freshEntry(itemTemplate, pathName, value.length)])}>+ Add {label.replace(/s$/, "").toLowerCase()}</button>
        </div>
      </details>
    );
  }
  if (isRecord(value)) {
    return (
      <details className="admin-content-group" open={path.length < 2 || undefined}>
        <summary><span><strong>{label}</strong><small>{Object.keys(value).length} fields</small></span></summary>
        <div className="admin-content-group__body admin-content-fields">
          {Object.entries(value).map(([key, child]) => (
            <ContentNode
              key={key}
              label={fieldLabel(key)}
              value={child}
              template={isRecord(template) ? template[key] : undefined}
              path={[...path, key]}
              onChange={(nextValue) => onChange({ ...value, [key]: nextValue })}
              onRemove={(index) => Array.isArray(child) && onChange({ ...value, [key]: child.filter((_item, childIndex) => childIndex !== index) })}
              onMove={(index, direction) => {
                if (!Array.isArray(child)) return;
                const next = [...child];
                const nextIndex = index + direction;
                if (nextIndex < 0 || nextIndex >= next.length) return;
                [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
                onChange({ ...value, [key]: next });
              }}
            />
          ))}
        </div>
      </details>
    );
  }
  return null;
}

function getNested(value: unknown, key: string) {
  return isRecord(value) ? value[key] : undefined;
}

export function AdminPagesEditor({ initialPage = "about" }: { initialPage?: SitePage } = {}) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [selectedPage, setSelectedPage] = useState<SitePage>(initialPage);
  const [selectedCustomPageId, setSelectedCustomPageId] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);

  const loadContent = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/admin/pages", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) {
        window.dispatchEvent(new Event("admin-session-expired"));
        return;
      }
      if (!response.ok) throw new Error(result.error || "Site content could not be loaded.");
      setContent(result.content as SiteContent);
      setSavedSnapshot(JSON.stringify(result.content));
      setStatus("");
    } catch (reason) {
      setStatusIsError(true);
      setStatus(reason instanceof Error ? reason.message : "Site content could not be loaded.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void loadContent(); }, [loadContent]);

  function updatePath(path: string[], value: unknown) {
    setContent((current) => current ? setAtPath(current, path, value) : current);
    setStatus("");
  }

  function moveArrayItem(path: string[], index: number, direction: -1 | 1) {
    const current = getAtPath(content, path);
    if (!Array.isArray(current)) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updatePath(path, next);
  }

  async function saveChanges() {
    if (!content) return;
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/pages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const result = await response.json();
      if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
      if (!response.ok) throw new Error(result.error || "Could not save site content.");
      setContent(result.content as SiteContent);
      setSavedSnapshot(JSON.stringify(result.content));
      setStatusIsError(false);
      setStatus("Page content saved. Refresh the public page to see the changes.");
    } catch (reason) {
      setStatusIsError(true);
      setStatus(reason instanceof Error ? reason.message : "Could not save site content.");
    } finally {
      setSaving(false);
    }
  }

  function addCustomPage() {
    const suffix = Date.now().toString(36);
    const slug = `new-page-${suffix}`;
    const page = { ...structuredClone(customSitePageTemplate), id: `page-${suffix}`, slug };
    updatePath(["customPages"], [...(content?.customPages || []), page]);
    setSelectedCustomPageId(page.id);
    setStatusIsError(false);
    setStatus("New draft created. Add the page content, save it, then publish it when ready.");
  }

  function removeCustomPage(id: string) {
    if (!content) return;
    const page = content.customPages.find((item) => item.id === id);
    if (!page || !window.confirm(`Remove “${page.title}” from the site? Save your changes to confirm removal.`)) return;
    const remaining = content.customPages.filter((item) => item.id !== id);
    updatePath(["customPages"], remaining);
    setSelectedCustomPageId(remaining[0]?.id || "");
    setStatusIsError(false);
    setStatus("Page removed from the draft. Save your changes to publish the removal.");
  }

  const isDirty = Boolean(content && JSON.stringify(content) !== savedSnapshot);
  const pageContent = selectedPage === "custom-pages"
    ? content?.customPages.find((page) => page.id === selectedCustomPageId) || content?.customPages[0]
    : content?.[selectedPage] as unknown;
  const pageTemplate = selectedPage === "custom-pages"
    ? customSitePageTemplate
    : defaultSiteContent[selectedPage] as unknown;

  if (checking || !content) {
    return <div className="admin-embedded-status">{checking ? "Loading page content…" : status || "Page content could not be loaded."}</div>;
  }

  return (
    <main className="admin-dashboard shell admin-pages-dashboard">
      <div className="admin-home-heading">
        <div><p className="admin-kicker">Site content</p><h1>Page<br /><em>editor.</em></h1></div>
        <p>Edit page copy, buttons, imagery, and repeatable content here. Shared colors are in Website; headings use Roboto Bold and paragraphs use Ubuntu across the site. Services, projects, blog articles and the other lists each have their own section in the menu.</p>
      </div>
      <div className="admin-pages-tabs" role="group" aria-label="Choose a page to edit">
        {pageLabels.map((page) => <button type="button" key={page.id} className={selectedPage === page.id ? "is-active" : ""} aria-pressed={selectedPage === page.id} onClick={() => setSelectedPage(page.id)}>{page.label}</button>)}
      </div>
      {status && <p className={`admin-home-status${statusIsError ? " is-error" : ""}`} role={statusIsError ? "alert" : "status"}>{status}</p>}
      <div className="admin-home-actions">
        <span>{isDirty ? "You have unsaved changes." : "All changes are saved."}</span>
        <div className="admin-home-actions__buttons">
          {isDirty && <button className="button button--outline" type="button" onClick={() => { setContent(JSON.parse(savedSnapshot) as SiteContent); setStatus(""); }}>Revert changes</button>}
          <button className="button button--dark" type="button" disabled={!isDirty || saving} onClick={() => void saveChanges()}>{saving ? "Saving…" : "Save page content"}</button>
        </div>
      </div>
      <div className="admin-pages-editor__intro"><span>{pageLabels.find((page) => page.id === selectedPage)?.hint}</span></div>

      {MANAGED_ELSEWHERE[selectedPage] && (
        <p className="admin-pages-managed">
          {MANAGED_ELSEWHERE[selectedPage]!.text} <a href={MANAGED_ELSEWHERE[selectedPage]!.href}>{MANAGED_ELSEWHERE[selectedPage]!.action} →</a>
        </p>
      )}

      {selectedPage === "custom-pages" && (
        <section className="admin-custom-pages">
          <div className="admin-custom-pages__heading">
            <div><p className="admin-kicker">Flexible page builder</p><h2>Your pages</h2><p>Create a page as a draft, edit its sections, then publish it at its own URL.</p></div>
            <button className="button button--dark" type="button" onClick={addCustomPage}>+ Create page</button>
          </div>
          {content.customPages.length > 0 ? (
            <div className="admin-custom-pages__list" role="group" aria-label="Your custom pages">
              {content.customPages.map((page) => (
                <button type="button" key={page.id} className={page.id === (selectedCustomPageId || content.customPages[0]?.id) ? "is-active" : ""} aria-pressed={page.id === (selectedCustomPageId || content.customPages[0]?.id)} onClick={() => setSelectedCustomPageId(page.id)}>
                  <span>{page.title || "Untitled page"}</span><small>/{page.slug} · {page.status}</small>
                </button>
              ))}
            </div>
          ) : <div className="admin-custom-pages__empty"><h3>No custom pages yet.</h3><p>Create one to add a new page to the website.</p></div>}
          {pageContent !== null && pageContent !== undefined && (
            <div className="admin-custom-pages__editor">
              <div className="admin-custom-pages__editor-heading"><span>Editing /{(pageContent as SiteContent["customPages"][number]).slug}</span><button className="is-destructive" type="button" onClick={() => removeCustomPage((pageContent as SiteContent["customPages"][number]).id)}>Remove page</button></div>
              <ContentNode
                label="Page content"
                value={pageContent}
                template={customSitePageTemplate}
                path={["customPages", String(content.customPages.findIndex((page) => page.id === (pageContent as SiteContent["customPages"][number]).id))]}
                onChange={(nextValue) => updatePath(["customPages"], content.customPages.map((page) => page.id === (pageContent as SiteContent["customPages"][number]).id ? nextValue : page))}
              />
              <p className="admin-custom-pages__hint">Use a short, unique URL slug without spaces. Draft pages are hidden from visitors.</p>
            </div>
          )}
        </section>
      )}

      {selectedPage !== "custom-pages" && <div className="admin-pages-fields">
        {isRecord(pageContent) && Object.entries(pageContent).map(([key, value]) => {
          if (HIDDEN_KEYS[selectedPage]?.includes(key)) return null;
          return (
            <ContentNode
              key={key}
              label={fieldLabel(key)}
              value={value}
              template={getNested(pageTemplate, key)}
              path={[selectedPage, key]}
              onChange={(nextValue) => updatePath([selectedPage, key], nextValue)}
              onRemove={(index) => updatePath([selectedPage, key], (value as unknown[]).filter((_item, currentIndex) => currentIndex !== index))}
              onMove={(index, direction) => moveArrayItem([selectedPage, key], index, direction)}
            />
          );
        })}
      </div>}
    </main>
  );
}
