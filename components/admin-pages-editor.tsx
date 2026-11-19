"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaPicker } from "@/components/admin/media-library";
import { customSitePageTemplate, defaultSiteContent, type SiteContent, type SiteInsight } from "@/lib/site-content/content";

type SitePage = "about" | "approach" | "services" | "projects" | "insights" | "contact" | "reservations" | "detailPages" | "siteSettings" | "custom-pages";
type FeedItem = { title: string; link: string; summary: string; publishedAt: string; image: string };
type FeedResult = { url: string; title: string; items: FeedItem[]; error?: string };

const pageLabels: { id: SitePage; label: string; hint: string }[] = [
  { id: "about", label: "About", hint: "Story, purpose, values, and strengths" },
  { id: "approach", label: "Our approach", hint: "Approach introduction, process, principles, and closing message" },
  { id: "services", label: "Services", hint: "Capabilities, service details, and process" },
  { id: "projects", label: "Projects", hint: "Portfolio categories and page introduction" },
  { id: "insights", label: "Insights", hint: "Write articles, optimize search previews, and manage publication" },
  { id: "contact", label: "Contact", hint: "Enquiry and meeting reservation page copy" },
  { id: "reservations", label: "Reservations", hint: "Booking page copy, opening hours, and meeting availability" },
  { id: "detailPages", label: "Detail pages", hint: "Service and project-category detail pages, closing message, and project page wording" },
  { id: "siteSettings", label: "Site settings", hint: "Brand, navigation, footer, search previews, crawl controls, and verification" },
  { id: "custom-pages", label: "Custom pages", hint: "Create and publish additional website pages" },
];

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

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

function ArticleField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="admin-home-field admin-article-field">
      <span>{label}</span>
      {multiline
        ? <textarea value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        : <input type="text" value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}

function ArticleStudio({
  articles,
  selectedId,
  onSelect,
  onCreate,
  onRemove,
  onUpdate,
}: {
  articles: SiteInsight[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<SiteInsight>) => void;
}) {
  const article = articles.find((item) => item.id === selectedId) || articles[0];
  const wordCount = article?.paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length || 0;
  const estimatedReadTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

  function updateSection(index: number, key: "sectionTitles" | "paragraphs", value: string) {
    if (!article) return;
    const next = [...article[key]];
    next[index] = value;
    onUpdate(article.id, key === "paragraphs" ? {
      paragraphs: next,
      readTime: `${Math.max(1, Math.ceil(next.join(" ").trim().split(/\s+/).filter(Boolean).length / 200))} min read`,
    } : { sectionTitles: next });
  }

  if (!article) {
    return (
      <section className="admin-article-studio" aria-labelledby="admin-article-studio-title">
        <header className="admin-article-studio__heading">
          <div><p className="admin-kicker">Editorial studio</p><h2 id="admin-article-studio-title">Write and publish articles</h2><p>Create original articles, preview the search listing, and publish when the content is ready.</p></div>
          <button className="button button--dark" type="button" onClick={onCreate}>+ New article</button>
        </header>
        <div className="admin-article-empty"><strong>No articles yet</strong><p>Create the first article and build it section by section.</p></div>
      </section>
    );
  }

  return (
    <section className="admin-article-studio" aria-labelledby="admin-article-studio-title">
      <header className="admin-article-studio__heading">
        <div>
          <p className="admin-kicker">Editorial studio</p>
          <h2 id="admin-article-studio-title">Write and publish articles</h2>
          <p>Create original articles, preview the search listing, and publish when the content is ready.</p>
        </div>
        <button className="button button--dark" type="button" onClick={onCreate}>+ New article</button>
      </header>
      <div className="admin-article-studio__layout">
        <aside className="admin-article-list" aria-label="Articles">
          <div className="admin-article-list__heading"><strong>Articles</strong><span>{articles.length}</span></div>
          {articles.map((item) => (
            <button key={item.id} className={item.id === article.id ? "is-active" : ""} type="button" aria-pressed={item.id === article.id} onClick={() => onSelect(item.id)}>
              <span className="admin-article-list__status">{item.status === "published" ? "Published" : "Draft"}</span>
              <strong>{item.title || "Untitled article"}</strong>
              <small>{item.topic} · {item.readTime}</small>
            </button>
          ))}
        </aside>

        <div className="admin-article-editor">
          <div className="admin-article-editor__topline">
            <div><span className={`admin-rss-status${article.status === "published" ? " is-ready" : ""}`}>{article.status}</span><span className="admin-article-editor__wordcount">{wordCount.toLocaleString()} words · {estimatedReadTime}</span></div>
            <button type="button" className="admin-article-remove" onClick={() => onRemove(article.id)}>Delete article</button>
          </div>
          <div className="admin-article-fields">
            <ArticleField label="Article title" value={article.title} maxLength={180} placeholder="Write a clear, specific headline" onChange={(title) => onUpdate(article.id, {
              title,
              ...(article.slug === slugify(article.title) || article.title === "Untitled article" ? { slug: slugify(title) || "new-article" } : {}),
            })} />
            <ArticleField label="URL slug" value={article.slug} maxLength={90} placeholder="your-article-url" onChange={(slug) => onUpdate(article.id, { slug: slugify(slug) })} />
            <label className="admin-home-field">
              <span>Topic</span>
              <select value={article.topic} onChange={(event) => onUpdate(article.id, { topic: event.target.value as SiteInsight["topic"] })}>
                <option>Planning</option><option>Project delivery</option><option>Long-term value</option>
              </select>
            </label>
            <ArticleField label="Author" value={article.author} maxLength={120} placeholder="Author or organization name" onChange={(author) => onUpdate(article.id, { author })} />
            <ArticleField label="Short introduction" value={article.excerpt} multiline maxLength={500} placeholder="Summarize the value of this article in a few sentences." onChange={(excerpt) => onUpdate(article.id, { excerpt })} />
            <div className="admin-article-field admin-home-field">
              <span>Featured image</span>
              <MediaInput label="Featured image URL" value={article.image} onChange={(image) => onUpdate(article.id, { image })} />
            </div>
            <ArticleField label="Image description (alt text)" value={article.imageAlt} maxLength={300} placeholder="Describe the image for screen readers" onChange={(imageAlt) => onUpdate(article.id, { imageAlt })} />
            <ArticleField label="Key takeaway" value={article.takeaway} multiline maxLength={500} placeholder="The central idea readers should remember" onChange={(takeaway) => onUpdate(article.id, { takeaway })} />
          </div>

          <div className="admin-article-body">
            <div className="admin-article-body__heading"><div><h3>Article body</h3><p>Use clear section headings and one focused idea in each section.</p></div><button className="admin-home-add" type="button" disabled={article.paragraphs.length >= 12} onClick={() => onUpdate(article.id, { sectionTitles: [...article.sectionTitles, ""], paragraphs: [...article.paragraphs, ""] })}>+ Add section</button></div>
            {article.paragraphs.map((paragraph, index) => (
              <section className="admin-article-section" key={`${article.id}-section-${index}`}>
                <div className="admin-article-section__topline"><strong>Section {String(index + 1).padStart(2, "0")}</strong>{article.paragraphs.length > 1 && <button type="button" onClick={() => onUpdate(article.id, { sectionTitles: article.sectionTitles.filter((_item, itemIndex) => itemIndex !== index), paragraphs: article.paragraphs.filter((_item, itemIndex) => itemIndex !== index) })}>Remove section</button>}</div>
                <ArticleField label="Section heading" value={article.sectionTitles[index] || ""} maxLength={140} placeholder="Add a helpful subheading" onChange={(value) => updateSection(index, "sectionTitles", value)} />
                <ArticleField label="Section text" value={paragraph} multiline maxLength={12_000} placeholder="Write the article section here…" onChange={(value) => updateSection(index, "paragraphs", value)} />
              </section>
            ))}
            <ArticleField label="Questions for the reader (optional)" value={article.questions.join("\n")} multiline maxLength={2_000} placeholder="Add one question per line" onChange={(value) => onUpdate(article.id, { questions: value.split("\n").map((item) => item.trim()).filter(Boolean) })} />
          </div>

          <details className="admin-article-seo" open>
            <summary><span><strong>Search and social preview</strong><small>SEO title, description, keywords, canonical URL, and share image</small></span></summary>
            <div className="admin-article-seo__body">
              <p className="admin-article-seo__hint">Leave optional fields blank to use the article title, introduction, and featured image. Aim for a 50–60 character title and a 150–160 character description.</p>
              <div className="admin-article-fields">
                <ArticleField label="SEO title · up to 70 characters" value={article.seoTitle} maxLength={70} placeholder={article.title || "Search result title"} onChange={(seoTitle) => onUpdate(article.id, { seoTitle })} />
                <ArticleField label="Canonical URL · optional" value={article.canonicalUrl} maxLength={500} placeholder="https://example.com/insights/article-slug" onChange={(canonicalUrl) => onUpdate(article.id, { canonicalUrl })} />
                <ArticleField label="Meta description · up to 320 characters" value={article.metaDescription} multiline maxLength={320} placeholder={article.excerpt || "A concise summary for search results and social sharing."} onChange={(metaDescription) => onUpdate(article.id, { metaDescription })} />
                <ArticleField label="SEO keywords · comma separated" value={article.keywords.join(", ")} multiline maxLength={1_000} placeholder="construction planning, project delivery" onChange={(value) => onUpdate(article.id, { keywords: value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30) })} />
                <div className="admin-article-field admin-home-field admin-article-field--wide">
                  <span>Social share image (optional)</span>
                  <MediaInput label="Social share image URL" value={article.socialImage} onChange={(socialImage) => onUpdate(article.id, { socialImage })} />
                </div>
              </div>
              <div className="admin-search-preview">
                <span>Google search preview</span>
                <strong>{article.seoTitle || article.title || "Article title"}</strong>
                <small>{article.canonicalUrl || `/insights/${article.slug}`}</small>
                <p>{article.metaDescription || article.excerpt || "Your article description will appear here."}</p>
              </div>
            </div>
          </details>

          <div className="admin-article-publish">
            <label className="admin-home-field"><span>Publication status</span><select value={article.status} onChange={(event) => onUpdate(article.id, {
              status: event.target.value as SiteInsight["status"],
              ...(event.target.value === "published" && !article.publishedAt ? { publishedAt: new Date().toISOString().slice(0, 10) } : {}),
            })}><option value="draft">Draft · hidden from the site</option><option value="published">Published · visible on the site</option></select></label>
            <label className="admin-home-field"><span>Publish date</span><input type="date" value={article.publishedAt.slice(0, 10)} onChange={(event) => onUpdate(article.id, { publishedAt: event.target.value })} /></label>
            <label className="admin-home-field"><span>Search indexing</span><span className="admin-home-switch"><input type="checkbox" checked={article.noIndex} onChange={(event) => onUpdate(article.id, { noIndex: event.target.checked })} />Do not show this article in search results</span></label>
          </div>
        </div>
      </div>
    </section>
  );
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

export function AdminPagesEditor() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [selectedPage, setSelectedPage] = useState<SitePage>("about");
  const [selectedCustomPageId, setSelectedCustomPageId] = useState("");
  const [selectedInsightId, setSelectedInsightId] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [feeds, setFeeds] = useState<FeedResult[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [draftingLink, setDraftingLink] = useState("");

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
      setAiConfigured(Boolean(result.aiConfigured));
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

  function createInsightArticle() {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const article: SiteInsight = {
      id: `article-${suffix}`,
      slug: `new-article-${suffix}`,
      number: String((content?.insights.articles.length || 0) + 1).padStart(2, "0"),
      topic: "Planning",
      title: "Untitled article",
      excerpt: "",
      readTime: "1 min read",
      image: defaultSiteContent.insights.articles[0].image,
      imageAlt: "",
      paragraphs: [""],
      sectionTitles: [""],
      questions: [],
      takeaway: "",
      author: "Premium Construction Group",
      publishedAt: "",
      updatedAt: "",
      seoTitle: "",
      metaDescription: "",
      keywords: [],
      canonicalUrl: "",
      socialImage: "",
      noIndex: false,
      status: "draft",
      sourceUrl: "",
    };
    updatePath(["insights", "articles"], [article, ...(content?.insights.articles || [])]);
    setSelectedInsightId(article.id);
    setStatusIsError(false);
    setStatus("New article created as a draft. Write it, add its search details, and save when ready.");
  }

  function updateInsightArticle(id: string, patch: Partial<SiteInsight>) {
    if (!content) return;
    updatePath(["insights", "articles"], content.insights.articles.map((article) => article.id === id
      ? { ...article, ...patch, updatedAt: new Date().toISOString() }
      : article));
  }

  function removeInsightArticle(id: string) {
    const article = content?.insights.articles.find((item) => item.id === id);
    if (!content || !article || !window.confirm(`Delete “${article.title || "Untitled article"}”? Save your changes to confirm.`)) return;
    const articles = content.insights.articles.filter((item) => item.id !== id);
    updatePath(["insights", "articles"], articles);
    setSelectedInsightId(articles[0]?.id || "");
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
    const seenSlugs = new Set<string>();
    const duplicateSlug = content.insights.articles.find((article) => {
      const slug = article.slug.trim();
      if (seenSlugs.has(slug)) return true;
      seenSlugs.add(slug);
      return false;
    });
    if (duplicateSlug) {
      setStatusIsError(true);
      setStatus(`The article URL “${duplicateSlug.slug}” is used more than once. Give each article a unique URL slug before saving.`);
      return;
    }
    const incompleteArticle = content.insights.articles.find((article) => article.status === "published" && (
      !article.title.trim() || !article.slug.trim() || !article.excerpt.trim() || !article.image.trim() ||
      !article.imageAlt.trim() || !article.takeaway.trim() || !article.paragraphs.some((paragraph) => paragraph.trim())
    ));
    if (incompleteArticle) {
      setStatusIsError(true);
      setStatus(`“${incompleteArticle.title || "Untitled article"}” needs a title, URL, introduction, image description, takeaway, and at least one body section before it can be published.`);
      return;
    }
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

  async function loadFeeds() {
    const urls = content?.insights.feedUrls.map((url) => url.trim()).filter(Boolean) || [];
    if (!urls.length) {
      setStatusIsError(true);
      setStatus("Add at least one RSS or Atom URL before loading feeds.");
      return;
    }
    setLoadingFeeds(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/insights/rss", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls }) });
      const result = await response.json();
      if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
      if (!response.ok) throw new Error(result.error || "RSS feeds could not be loaded.");
      setFeeds(result.feeds as FeedResult[]);
    } catch (reason) {
      setStatusIsError(true);
      setStatus(reason instanceof Error ? reason.message : "RSS feeds could not be loaded.");
    } finally {
      setLoadingFeeds(false);
    }
  }

  async function generateDraft(item: FeedItem) {
    setDraftingLink(item.link);
    setStatus("");
    try {
      const response = await fetch("/api/admin/insights/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title, summary: item.summary || item.title, sourceUrl: item.link, image: item.image }),
      });
      const result = await response.json();
      if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
      if (!response.ok) throw new Error(result.error || "AI could not generate a draft.");
      const draft = result.article as SiteContent["insights"]["articles"][number];
      setContent((current) => current ? { ...current, insights: { ...current.insights, articles: [draft, ...current.insights.articles] } } : current);
      setSelectedInsightId(draft.id);
      setStatusIsError(false);
      setStatus(`Draft created from “${item.title}”. Edit the article and search preview above, then save when ready.`);
    } catch (reason) {
      setStatusIsError(true);
      setStatus(reason instanceof Error ? reason.message : "AI could not generate a draft.");
    } finally {
      setDraftingLink("");
    }
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
        <p>Edit page copy, buttons, imagery, and repeatable content here. Shared colors are in Website; headings use Roboto Bold and paragraphs use Ubuntu across the site. Create custom pages and review article drafts before publishing.</p>
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

      {selectedPage === "insights" && (
        <ArticleStudio
          articles={content.insights.articles}
          selectedId={selectedInsightId}
          onSelect={setSelectedInsightId}
          onCreate={createInsightArticle}
          onRemove={removeInsightArticle}
          onUpdate={updateInsightArticle}
        />
      )}

      {selectedPage === "insights" && (
        <details className="admin-rss-panel admin-rss-panel--optional">
          <summary className="admin-rss-panel__summary"><span><strong>Optional article sources</strong><small>Import an RSS item to help start an AI-assisted draft.</small></span><span className="admin-rss-panel__summary-action">Open tools</span></summary>
          <div className="admin-rss-panel__content">
          <div className="admin-rss-panel__heading">
            <div><p className="admin-kicker">Optional workflow</p><h2>RSS and AI drafts</h2><p>Feed imports are optional. Create and write articles directly in the editorial studio above.</p></div>
            <span className={`admin-rss-status${aiConfigured ? " is-ready" : ""}`}>{aiConfigured ? "AI connected" : "Add OPENAI_API_KEY to enable AI"}</span>
          </div>
          <div className="admin-rss-sources">
            {content.insights.feedUrls.map((url, index) => (
              <div className="admin-rss-source" key={`feed-${index}`}>
                <label className="admin-home-field"><span>Feed URL {index + 1}</span><input type="url" inputMode="url" value={url} onChange={(event) => updatePath(["insights", "feedUrls"], content.insights.feedUrls.map((item, currentIndex) => currentIndex === index ? event.target.value : item))} placeholder="https://example.com/feed.xml" /></label>
                <button type="button" className="is-destructive" aria-label={`Remove feed ${index + 1}`} onClick={() => updatePath(["insights", "feedUrls"], content.insights.feedUrls.filter((_item, currentIndex) => currentIndex !== index))}>Remove</button>
              </div>
            ))}
            <button className="admin-home-add" type="button" disabled={content.insights.feedUrls.length >= 12} onClick={() => updatePath(["insights", "feedUrls"], [...content.insights.feedUrls, ""])}>+ Add RSS source</button>
          </div>
          <button className="button button--dark" type="button" disabled={loadingFeeds || !content.insights.feedUrls.some((url) => url.trim())} onClick={() => void loadFeeds()}>{loadingFeeds ? "Loading feeds…" : "Load RSS items"}</button>
          {feeds.map((feed) => (
            <div className="admin-rss-feed" key={feed.url}>
              <div className="admin-rss-feed__heading"><strong>{feed.title}</strong><span>{feed.error || `${feed.items.length} recent items`}</span></div>
              {!feed.error && feed.items.map((item) => (
                <article className="admin-rss-item" key={`${feed.url}-${item.link}`}>
                  <div><h3>{item.title}</h3>{item.publishedAt && <small>{item.publishedAt}</small>}<p>{item.summary || "This feed item has no summary; the AI draft will use its title as context."}</p><a href={item.link} target="_blank" rel="noreferrer">Open source ↗</a></div>
                  <button type="button" disabled={!aiConfigured || draftingLink === item.link || content.insights.articles.some((article) => article.sourceUrl === item.link)} onClick={() => void generateDraft(item)}>{draftingLink === item.link ? "Drafting…" : content.insights.articles.some((article) => article.sourceUrl === item.link) ? "Already drafted" : "Create AI draft"}</button>
                </article>
              ))}
            </div>
          ))}
          </div>
        </details>
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
          if (selectedPage === "insights" && (key === "feedUrls" || key === "articles")) return null;
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
