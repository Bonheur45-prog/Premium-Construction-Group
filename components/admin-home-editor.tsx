"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  bodyFontOptions,
  defaultHomePageContent,
  headingFontOptions,
  type HomePageContent,
} from "@/lib/homepage/content";

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  help?: string;
};

function Field({ label, value, onChange, wide, help }: FieldProps) {
  return (
    <label className={`admin-home-field${wide ? " admin-home-field--wide" : ""}`}>
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      {help && <small>{help}</small>}
    </label>
  );
}

function TextAreaField({ label, value, onChange, wide = true, help }: FieldProps) {
  return (
    <label className={`admin-home-field${wide ? " admin-home-field--wide" : ""}`}>
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      {help && <small>{help}</small>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  wide?: boolean;
}) {
  return (
    <label className={`admin-home-field${wide ? " admin-home-field--wide" : ""}`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function MediaField({
  label,
  value,
  onChange,
  kind = "image",
  onError,
}: {
  label: string;
  value: string;
  onChange: (value: string, uploadedKind?: "image" | "video") => void;
  kind?: "image" | "video" | "either";
  onError: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isVideoPreview = kind === "video";
  const accept = kind === "video"
    ? "video/mp4,video/webm"
    : kind === "image"
      ? "image/jpeg,image/png,image/webp,image/avif,image/gif"
      : "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm";

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/admin/homepage/media", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The media upload failed.");
      onChange(result.src as string, result.kind as "image" | "video");
      onError("");
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "The media upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="admin-home-field admin-home-field--wide">
      <span>{label}</span>
      <div className="admin-home-media">
        <input aria-label={`${label} URL`} type="text" inputMode="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste a media URL or upload a file" />
        <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading…" : "Upload file"}</button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          hidden
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
      </div>
      <small>Images: JPG, PNG, WebP, AVIF, or GIF up to 20 MB. Videos: MP4 or WebM up to 200 MB.</small>
      {value && (
        isVideoPreview
          ? <video className="admin-home-media-preview" src={value} controls muted />
          : <img className="admin-home-media-preview" src={value} alt="" />
      )}
    </div>
  );
}

function ActionFields({
  label,
  href,
  onLabelChange,
  onHrefChange,
}: {
  label: string;
  href: string;
  onLabelChange: (value: string) => void;
  onHrefChange: (value: string) => void;
}) {
  return (
    <div className="admin-home-fields admin-home-fields--three admin-home-field--wide">
      <Field label="Button / link label" value={label} onChange={onLabelChange} />
      <Field label="Button / link destination" value={href} onChange={onHrefChange} help="Use a page such as /contact or a section such as #projects." />
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  defaultOpen = false,
  enabled,
  onEnabledChange,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  defaultOpen?: boolean;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details className="admin-home-panel" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span className="admin-home-panel__title"><strong>{title}</strong><span>{subtitle}</span></span>
      </summary>
      <div className="admin-home-panel__body">
        {enabled !== undefined && onEnabledChange && (
          <label className="admin-home-switch"><input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} /><span>Show this section on the homepage</span></label>
        )}
        {children}
      </div>
    </details>
  );
}

function CardHeading({
  label,
  index,
  count,
  onMove,
  onRemove,
}: {
  label: string;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="admin-home-card__heading">
      <span>{label} {index + 1}</span>
      <div>
        <button type="button" aria-label={`Move ${label.toLowerCase()} up`} disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
        <button type="button" aria-label={`Move ${label.toLowerCase()} down`} disabled={index === count - 1} onClick={() => onMove(1)}>↓</button>
        <button type="button" className="is-destructive" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AdminHomeEditor({ embedded = false }: { embedded?: boolean } = {}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [content, setContent] = useState<HomePageContent | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadContent() {
    setCheckingSession(true);
    try {
      const response = await fetch("/api/admin/homepage", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setContent(null);
        window.dispatchEvent(new Event("admin-session-expired"));
        return;
      }
      if (!response.ok) throw new Error(result.error || "The homepage editor could not be loaded.");
      const next = result.content as HomePageContent;
      setContent(next);
      setSavedSnapshot(JSON.stringify(next));
      setAuthenticated(true);
      setStatus("");
    } catch (reason) {
      setStatusIsError(true);
      setStatus(reason instanceof Error ? reason.message : "The homepage editor could not be loaded.");
    } finally {
      setCheckingSession(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  function updateContent(mutator: (draft: HomePageContent) => void) {
    setContent((current) => {
      if (!current) return current;
      const draft = structuredClone(current);
      mutator(draft);
      return draft;
    });
    setStatus("");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      setPassword("");
      await loadContent();
    } catch (reason) {
      setLoginError(reason instanceof Error ? reason.message : "Could not sign in.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setContent(null);
    setSavedSnapshot("");
  }

  async function saveChanges() {
    if (!content) return;
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save homepage changes.");
      const next = result.content as HomePageContent;
      setContent(next);
      setSavedSnapshot(JSON.stringify(next));
      setStatusIsError(false);
      setStatus("Homepage changes saved. Open the live page to preview them.");
    } catch (reason) {
      setStatusIsError(true);
      setStatus(reason instanceof Error ? reason.message : "Could not save homepage changes.");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = Boolean(content && JSON.stringify(content) !== savedSnapshot);

  if (checkingSession) {
    if (embedded) return <div className="admin-embedded-status">Loading website settings…</div>;
    return <div className="admin-screen"><p className="admin-loading">Loading homepage editor…</p></div>;
  }

  if (!authenticated || !content) {
    if (embedded) return <div className="admin-embedded-status" role="alert">Your admin session could not be verified. Sign in again to continue.</div>;
    return (
      <div className="admin-screen">
        <div className="admin-login-card">
          <Link className="admin-brand" href="/" aria-label="Premium Construction Group home"><span>PCG</span><i>.</i></Link>
          <p className="admin-kicker">Private workspace</p>
          <h1>Homepage<br /><em>editor.</em></h1>
          <p className="admin-login-card__intro">Sign in to update the homepage copy, images, video slides, buttons, and visual theme.</p>
          <form onSubmit={handleLogin} className="admin-login-form">
            <label htmlFor="admin-home-password">Dashboard password</label>
            <input id="admin-home-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {loginError && <p className="admin-error" role="alert">{loginError}</p>}
            <button className="button button--dark" type="submit">Sign in <span aria-hidden="true">↗</span></button>
          </form>
          <Link className="admin-back-link" href="/admin">← Admin dashboard</Link>
          <br />
          <Link className="admin-back-link" href="/">← Back to website</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "admin-home-embedded" : "admin-screen admin-screen--dashboard"}>
      {!embedded && <header className="admin-topbar">
        <Link className="admin-brand" href="/" aria-label="Premium Construction Group home"><span>PCG</span><i>.</i></Link>
        <div className="admin-home-top-actions">
          <Link href="/admin">Admin dashboard</Link>
          <Link href="/" target="_blank" rel="noreferrer">View live homepage ↗</Link>
          <button type="button" onClick={handleLogout}>Sign out <span aria-hidden="true">↗</span></button>
        </div>
      </header>}

      <main className="admin-dashboard admin-home-dashboard">
        <div className="admin-home-heading">
          <div>
            <p className="admin-kicker">Site content</p>
            <h1>Homepage<br /><em>editor.</em></h1>
          </div>
          <p>Change each homepage section, its imagery, text, links, and the site colors and fonts. Save your changes, then preview the live page.</p>
        </div>

        {status && <p className={`admin-home-status${statusIsError ? " is-error" : ""}`} role={statusIsError ? "alert" : "status"}>{status}</p>}

        <div className="admin-home-actions">
          <span>{isDirty ? "You have unsaved changes." : "All changes are saved."}</span>
          <div className="admin-home-actions__buttons">
            {isDirty && <button className="button button--outline" type="button" onClick={() => { setContent(JSON.parse(savedSnapshot) as HomePageContent); setStatus(""); }}>Revert changes</button>}
            <button className="button button--dark" type="button" disabled={!isDirty || saving} onClick={() => void saveChanges()}>{saving ? "Saving…" : "Save homepage"}</button>
          </div>
        </div>

        <Panel title="Colors & fonts" subtitle="Set the homepage palette and type styles" defaultOpen>
          <div className="admin-home-panel__intro">These settings apply across the homepage, including its header and footer. Color changes use the site's existing design palette.</div>
          <div className="admin-home-fields">
            <SelectField label="Body font" value={content.theme.bodyFont} onChange={(value) => updateContent((draft) => { draft.theme.bodyFont = value; })} options={bodyFontOptions} />
            <SelectField label="Heading font" value={content.theme.headingFont} onChange={(value) => updateContent((draft) => { draft.theme.headingFont = value; })} options={headingFontOptions} />
          </div>
          <h3 className="admin-home-subsection">Theme colors</h3>
          <div className="admin-home-color">
            {Object.entries(content.theme.colors).map(([key, value]) => (
              <label className="admin-home-field" key={key}>
                <span>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</span>
                <input aria-label={`${key} color`} type="color" value={value} onChange={(event) => updateContent((draft) => { draft.theme.colors[key as keyof HomePageContent["theme"]["colors"]] = event.target.value; })} />
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Hero slideshow" subtitle={`${content.hero.slides.length} slides · text, buttons, photos, or video`} enabled={content.hero.enabled} onEnabledChange={(enabled) => updateContent((draft) => { draft.hero.enabled = enabled; })}>
          <div className="admin-home-fields">
            <Field label="Scroll prompt" value={content.hero.scrollLabel} onChange={(value) => updateContent((draft) => { draft.hero.scrollLabel = value; })} />
            <Field label="Scroll destination" value={content.hero.scrollHref} onChange={(value) => updateContent((draft) => { draft.hero.scrollHref = value; })} help="Use a homepage section such as #about." />
          </div>
          <h3 className="admin-home-subsection">Slides</h3>
          <div className="admin-home-card-list">
            {content.hero.slides.map((slide, index) => (
              <div className="admin-home-card" key={slide.id}>
                <CardHeading label="Slide" index={index} count={content.hero.slides.length}
                  onMove={(direction) => updateContent((draft) => moveItem(draft.hero.slides, index, direction))}
                  onRemove={() => updateContent((draft) => { if (draft.hero.slides.length > 1) draft.hero.slides.splice(index, 1); })} />
                <div className="admin-home-fields">
                  <Field label="Small heading" value={slide.eyebrow} onChange={(value) => updateContent((draft) => { draft.hero.slides[index].eyebrow = value; })} />
                  <Field label="Image caption" value={slide.caption} onChange={(value) => updateContent((draft) => { draft.hero.slides[index].caption = value; })} />
                  <Field label="Main heading" value={slide.headline.lead} onChange={(value) => updateContent((draft) => { draft.hero.slides[index].headline.lead = value; })} />
                  <Field label="Highlighted heading" value={slide.headline.accent} onChange={(value) => updateContent((draft) => { draft.hero.slides[index].headline.accent = value; })} />
                  <TextAreaField label="Supporting text" value={slide.intro} onChange={(value) => updateContent((draft) => { draft.hero.slides[index].intro = value; })} />
                  <ActionFields label={slide.primaryAction.label} href={slide.primaryAction.href}
                    onLabelChange={(value) => updateContent((draft) => { draft.hero.slides[index].primaryAction.label = value; })}
                    onHrefChange={(value) => updateContent((draft) => { draft.hero.slides[index].primaryAction.href = value; })} />
                  <ActionFields label={slide.secondaryAction.label} href={slide.secondaryAction.href}
                    onLabelChange={(value) => updateContent((draft) => { draft.hero.slides[index].secondaryAction.label = value; })}
                    onHrefChange={(value) => updateContent((draft) => { draft.hero.slides[index].secondaryAction.href = value; })} />
                  <SelectField label="Media type" value={slide.media.type} onChange={(value) => updateContent((draft) => {
                    const current = draft.hero.slides[index].media;
                    if (value === "video" && current.type === "image") {
                      draft.hero.slides[index].media = { type: "video", src: current.src, poster: current.src, alt: current.alt };
                    } else if (value === "image" && current.type === "video") {
                      draft.hero.slides[index].media = { type: "image", src: current.src, alt: current.alt };
                    }
                  })} options={[{ label: "Image", value: "image" }, { label: "Video", value: "video" }]} />
                  <MediaField label={slide.media.type === "video" ? "Video source" : "Hero image"} value={slide.media.src}
                    kind={slide.media.type === "video" ? "video" : "either"}
                    onError={(message) => { setStatusIsError(Boolean(message)); setStatus(message); }}
                    onChange={(value, uploadedKind) => updateContent((draft) => {
                      const current = draft.hero.slides[index].media;
                      if (uploadedKind === "video") {
                        draft.hero.slides[index].media = {
                          type: "video",
                          src: value,
                          poster: current.type === "video" ? current.poster : current.src,
                          alt: current.alt,
                        };
                      } else if (uploadedKind === "image") {
                        draft.hero.slides[index].media = { type: "image", src: value, alt: current.alt };
                      } else {
                        current.src = value;
                      }
                    })} />
                  {slide.media.type === "video" && (
                    <MediaField label="Video poster image" value={slide.media.poster} kind="image"
                      onError={(message) => { setStatusIsError(Boolean(message)); setStatus(message); }}
                      onChange={(value) => updateContent((draft) => { const media = draft.hero.slides[index].media; if (media.type === "video") media.poster = value; })} />
                  )}
                  <Field label="Media description (alt text)" value={slide.media.alt} onChange={(value) => updateContent((draft) => { draft.hero.slides[index].media.alt = value; })} wide />
                </div>
              </div>
            ))}
          </div>
          <button className="admin-home-add" type="button" disabled={content.hero.slides.length >= 8} onClick={() => updateContent((draft) => {
            const slide = structuredClone(draft.hero.slides[0] || defaultHomePageContent.hero.slides[0]);
            slide.id = newId("slide");
            slide.eyebrow = "New story";
            slide.headline = { lead: "Your headline", accent: "goes here." };
            slide.caption = "A short image caption";
            draft.hero.slides.push(slide);
          })}>+ Add slideshow slide</button>
        </Panel>

        <Panel title="Promise banner" subtitle="The short statement below the slideshow" enabled={content.belief.enabled} onEnabledChange={(enabled) => updateContent((draft) => { draft.belief.enabled = enabled; })}>
          <div className="admin-home-fields">
            <Field label="Statement" value={content.belief.statement} onChange={(value) => updateContent((draft) => { draft.belief.statement = value; })} wide />
          </div>
          <h3 className="admin-home-subsection">Short details</h3>
          <div className="admin-home-card-list">
            {content.belief.details.map((detail, index) => (
              <div className="admin-home-card" key={`${index}-${detail}`}>
                <CardHeading label="Detail" index={index} count={content.belief.details.length}
                  onMove={(direction) => updateContent((draft) => moveItem(draft.belief.details, index, direction))}
                  onRemove={() => updateContent((draft) => { draft.belief.details.splice(index, 1); })} />
                <Field label="Text" value={detail} onChange={(value) => updateContent((draft) => { draft.belief.details[index] = value; })} />
              </div>
            ))}
          </div>
          <button className="admin-home-add" type="button" disabled={content.belief.details.length >= 6} onClick={() => updateContent((draft) => { draft.belief.details.push("New detail"); })}>+ Add detail</button>
        </Panel>

        <Panel title="Introduction" subtitle="About text and its feature image" enabled={content.intro.enabled} onEnabledChange={(enabled) => updateContent((draft) => { draft.intro.enabled = enabled; })}>
          <div className="admin-home-fields">
            <Field label="Section label" value={content.intro.kicker} onChange={(value) => updateContent((draft) => { draft.intro.kicker = value; })} wide />
            <Field label="Main heading" value={content.intro.headline.lead} onChange={(value) => updateContent((draft) => { draft.intro.headline.lead = value; })} />
            <Field label="Highlighted heading" value={content.intro.headline.accent} onChange={(value) => updateContent((draft) => { draft.intro.headline.accent = value; })} />
            <TextAreaField label="Paragraph" value={content.intro.paragraph} onChange={(value) => updateContent((draft) => { draft.intro.paragraph = value; })} />
            <ActionFields label={content.intro.action.label} href={content.intro.action.href}
              onLabelChange={(value) => updateContent((draft) => { draft.intro.action.label = value; })}
              onHrefChange={(value) => updateContent((draft) => { draft.intro.action.href = value; })} />
          </div>
          <h3 className="admin-home-subsection">Feature photo</h3>
          <div className="admin-home-fields">
            <MediaField label="Image" value={content.intro.image.src} kind="image" onError={(message) => { setStatusIsError(Boolean(message)); setStatus(message); }} onChange={(value) => updateContent((draft) => { draft.intro.image.src = value; })} />
            <Field label="Image description (alt text)" value={content.intro.image.alt} onChange={(value) => updateContent((draft) => { draft.intro.image.alt = value; })} />
            <Field label="Image label number" value={content.intro.image.number} onChange={(value) => updateContent((draft) => { draft.intro.image.number = value; })} />
            <Field label="Image label" value={content.intro.image.label} onChange={(value) => updateContent((draft) => { draft.intro.image.label = value; })} />
          </div>
        </Panel>

        <Panel title="Services overview" subtitle={`${content.services.capabilities.length} service cards`} enabled={content.services.enabled} onEnabledChange={(enabled) => updateContent((draft) => { draft.services.enabled = enabled; })}>
          <div className="admin-home-fields">
            <Field label="Section label" value={content.services.kicker} onChange={(value) => updateContent((draft) => { draft.services.kicker = value; })} wide />
            <Field label="Main heading" value={content.services.headline.lead} onChange={(value) => updateContent((draft) => { draft.services.headline.lead = value; })} />
            <Field label="Highlighted heading" value={content.services.headline.accent} onChange={(value) => updateContent((draft) => { draft.services.headline.accent = value; })} />
            <TextAreaField label="Supporting text" value={content.services.aside} onChange={(value) => updateContent((draft) => { draft.services.aside = value; })} />
            <Field label="Bottom note" value={content.services.note} onChange={(value) => updateContent((draft) => { draft.services.note = value; })} />
            <ActionFields label={content.services.action.label} href={content.services.action.href}
              onLabelChange={(value) => updateContent((draft) => { draft.services.action.label = value; })}
              onHrefChange={(value) => updateContent((draft) => { draft.services.action.href = value; })} />
          </div>
          <h3 className="admin-home-subsection">Service cards</h3>
          <div className="admin-home-card-list">
            {content.services.capabilities.map((capability, index) => (
              <div className="admin-home-card" key={capability.id}>
                <CardHeading label="Service" index={index} count={content.services.capabilities.length}
                  onMove={(direction) => updateContent((draft) => moveItem(draft.services.capabilities, index, direction))}
                  onRemove={() => updateContent((draft) => { draft.services.capabilities.splice(index, 1); })} />
                <div className="admin-home-fields">
                  <Field label="Card number" value={capability.number} onChange={(value) => updateContent((draft) => { draft.services.capabilities[index].number = value; })} />
                  <Field label="Card title" value={capability.title} onChange={(value) => updateContent((draft) => { draft.services.capabilities[index].title = value; })} />
                  <TextAreaField label="Card description" value={capability.text} onChange={(value) => updateContent((draft) => { draft.services.capabilities[index].text = value; })} />
                  <SelectField label="Card icon" value={capability.icon} onChange={(value) => updateContent((draft) => { draft.services.capabilities[index].icon = value; })} options={[{ label: "Building", value: "structure" }, { label: "Plan lines", value: "lines" }, { label: "Compass", value: "compass" }]} />
                  <Field label="Service page section ID" value={capability.id} onChange={(value) => updateContent((draft) => { draft.services.capabilities[index].id = value; })} />
                </div>
              </div>
            ))}
          </div>
          <button className="admin-home-add" type="button" disabled={content.services.capabilities.length >= 12} onClick={() => updateContent((draft) => { draft.services.capabilities.push({ id: newId("service"), number: String(draft.services.capabilities.length + 1).padStart(2, "0"), title: "New service", text: "Describe this service.", icon: "structure" }); })}>+ Add service card</button>
        </Panel>

        <Panel title="Selected work" subtitle={`${content.projects.cards.length} project cards`} enabled={content.projects.enabled} onEnabledChange={(enabled) => updateContent((draft) => { draft.projects.enabled = enabled; })}>
          <div className="admin-home-fields">
            <Field label="Section label" value={content.projects.kicker} onChange={(value) => updateContent((draft) => { draft.projects.kicker = value; })} wide />
            <Field label="Main heading" value={content.projects.headline.lead} onChange={(value) => updateContent((draft) => { draft.projects.headline.lead = value; })} />
            <Field label="Highlighted heading" value={content.projects.headline.accent} onChange={(value) => updateContent((draft) => { draft.projects.headline.accent = value; })} />
            <TextAreaField label="Supporting text" value={content.projects.aside} onChange={(value) => updateContent((draft) => { draft.projects.aside = value; })} />
            <ActionFields label={content.projects.action.label} href={content.projects.action.href}
              onLabelChange={(value) => updateContent((draft) => { draft.projects.action.label = value; })}
              onHrefChange={(value) => updateContent((draft) => { draft.projects.action.href = value; })} />
            <TextAreaField label="Image note" value={content.projects.note} onChange={(value) => updateContent((draft) => { draft.projects.note = value; })} />
          </div>
          <h3 className="admin-home-subsection">Project cards</h3>
          <div className="admin-home-card-list">
            {content.projects.cards.map((project, index) => (
              <div className="admin-home-card" key={project.id}>
                <CardHeading label="Project" index={index} count={content.projects.cards.length}
                  onMove={(direction) => updateContent((draft) => moveItem(draft.projects.cards, index, direction))}
                  onRemove={() => updateContent((draft) => { draft.projects.cards.splice(index, 1); })} />
                <div className="admin-home-fields">
                  <Field label="Category" value={project.type} onChange={(value) => updateContent((draft) => { draft.projects.cards[index].type = value; })} />
                  <Field label="Project title" value={project.title} onChange={(value) => updateContent((draft) => { draft.projects.cards[index].title = value; })} />
                  <Field label="Project card ID" value={project.id} onChange={(value) => updateContent((draft) => { draft.projects.cards[index].id = value; })} />
                  <Field label="Card destination" value={project.href} onChange={(value) => updateContent((draft) => { draft.projects.cards[index].href = value; })} />
                  <SelectField label="Card layout" value={project.size} onChange={(value) => updateContent((draft) => { draft.projects.cards[index].size = value; })} options={[{ label: "Standard", value: "normal" }, { label: "Tall feature", value: "tall" }]} />
                  <Field label="Image description (alt text)" value={project.alt} onChange={(value) => updateContent((draft) => { draft.projects.cards[index].alt = value; })} wide />
                  <MediaField label="Project image" value={project.image} kind="image" onError={(message) => { setStatusIsError(Boolean(message)); setStatus(message); }} onChange={(value) => updateContent((draft) => { draft.projects.cards[index].image = value; })} />
                </div>
              </div>
            ))}
          </div>
          <button className="admin-home-add" type="button" disabled={content.projects.cards.length >= 16} onClick={() => updateContent((draft) => { draft.projects.cards.push({ id: newId("project"), type: "Project type", title: "New project", image: defaultHomePageContent.projects.cards[0].image, alt: "", href: "/projects", size: "normal" }); })}>+ Add project card</button>
        </Panel>

        <Panel title="Our approach" subtitle={`${content.approach.steps.length} approach steps`} enabled={content.approach.enabled} onEnabledChange={(enabled) => updateContent((draft) => { draft.approach.enabled = enabled; })}>
          <div className="admin-home-fields">
            <Field label="Section label" value={content.approach.kicker} onChange={(value) => updateContent((draft) => { draft.approach.kicker = value; })} wide />
            <Field label="Main heading" value={content.approach.headline.lead} onChange={(value) => updateContent((draft) => { draft.approach.headline.lead = value; })} />
            <Field label="Highlighted heading" value={content.approach.headline.accent} onChange={(value) => updateContent((draft) => { draft.approach.headline.accent = value; })} />
            <TextAreaField label="Supporting paragraph" value={content.approach.paragraph} onChange={(value) => updateContent((draft) => { draft.approach.paragraph = value; })} />
            <ActionFields label={content.approach.action.label} href={content.approach.action.href}
              onLabelChange={(value) => updateContent((draft) => { draft.approach.action.label = value; })}
              onHrefChange={(value) => updateContent((draft) => { draft.approach.action.href = value; })} />
          </div>
          <h3 className="admin-home-subsection">Steps</h3>
          <div className="admin-home-card-list">
            {content.approach.steps.map((step, index) => (
              <div className="admin-home-card" key={`${step.number}-${index}`}>
                <CardHeading label="Step" index={index} count={content.approach.steps.length}
                  onMove={(direction) => updateContent((draft) => moveItem(draft.approach.steps, index, direction))}
                  onRemove={() => updateContent((draft) => { draft.approach.steps.splice(index, 1); })} />
                <div className="admin-home-fields">
                  <Field label="Step number" value={step.number} onChange={(value) => updateContent((draft) => { draft.approach.steps[index].number = value; })} />
                  <Field label="Step title" value={step.title} onChange={(value) => updateContent((draft) => { draft.approach.steps[index].title = value; })} />
                  <TextAreaField label="Step description" value={step.text} onChange={(value) => updateContent((draft) => { draft.approach.steps[index].text = value; })} />
                </div>
              </div>
            ))}
          </div>
          <button className="admin-home-add" type="button" disabled={content.approach.steps.length >= 12} onClick={() => updateContent((draft) => { draft.approach.steps.push({ number: String(draft.approach.steps.length + 1).padStart(2, "0"), title: "New step", text: "Describe this step." }); })}>+ Add step</button>
        </Panel>

        <Panel title="Closing call to action" subtitle="The final message and contact link" enabled={content.closing.enabled} onEnabledChange={(enabled) => updateContent((draft) => { draft.closing.enabled = enabled; })}>
          <div className="admin-home-fields">
            <Field label="Eyebrow" value={content.closing.eyebrow} onChange={(value) => updateContent((draft) => { draft.closing.eyebrow = value; })} wide />
            <Field label="Main heading" value={content.closing.headline.lead} onChange={(value) => updateContent((draft) => { draft.closing.headline.lead = value; })} />
            <Field label="Second heading line" value={content.closing.headline.accent} onChange={(value) => updateContent((draft) => { draft.closing.headline.accent = value; })} />
            <TextAreaField label="Supporting paragraph" value={content.closing.paragraph} onChange={(value) => updateContent((draft) => { draft.closing.paragraph = value; })} />
            <Field label="Background watermark text" value={content.closing.mark} onChange={(value) => updateContent((draft) => { draft.closing.mark = value; })} />
            <ActionFields label={content.closing.action.label} href={content.closing.action.href}
              onLabelChange={(value) => updateContent((draft) => { draft.closing.action.label = value; })}
              onHrefChange={(value) => updateContent((draft) => { draft.closing.action.href = value; })} />
          </div>
        </Panel>

        <p className="admin-home-preview"><img src="/premium-mark.png" alt="" /><span>Media and text changes are saved locally in this project. Use “View live homepage” to review the published page after saving.</span></p>
      </main>
    </div>
  );
}
