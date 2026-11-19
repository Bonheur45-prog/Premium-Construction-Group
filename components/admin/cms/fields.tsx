"use client";

/* eslint-disable @next/next/no-img-element -- previews of library media (any URL) */
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { MediaPicker } from "@/components/admin/media-library";
import type { FieldDef, Option } from "@/lib/cms/collections";

const RichEditor = dynamic(() => import("@/components/admin/cms/rich-editor"), { ssr: false, loading: () => <div className="rte-loading">Loading the editor…</div> });

export type Values = Record<string, unknown>;
export type Options = Record<string, Option[]>;

const str = (value: unknown) => (typeof value === "string" ? value : "");

function Label({ field, value }: { field: FieldDef; value?: string }) {
  return (
    <span className="cmsf-label">
      <span>{field.label}{field.requiredToPublish && <em className="cmsf-required" title="Needed before publishing"> *</em>}</span>
      {field.max && value !== undefined && <small className={value.length > field.max * 0.92 ? "is-near" : ""}>{value.length}/{field.max}</small>}
    </span>
  );
}

function Hint({ children }: { children?: ReactNode }) {
  return children ? <small className="cmsf-hint">{children}</small> : null;
}

/** One photo: preview, choose/replace from the library (or upload there), remove, and its description. */
export function ImageInput({ value, alt, onChange, onAlt, label, hint, required, showAlt = true }: { value: string; alt?: string; onChange: (url: string, alt?: string) => void; onAlt?: (alt: string) => void; label: string; hint?: string; required?: boolean; showAlt?: boolean }) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="cmsf cmsf--wide">
      <span className="cmsf-label"><span>{label}{required && <em className="cmsf-required"> *</em>}</span></span>
      <div className={`cmsf-image${value ? " has-image" : ""}`}>
        <button type="button" className="cmsf-image__preview" onClick={() => setPicking(true)} aria-label={value ? "Replace photo" : "Choose a photo"}>
          {value ? <img src={value} alt="" /> : <span><strong>+ Choose a photo</strong><small>From the media library, or upload a new one</small></span>}
        </button>
        {value && (
          <div className="cmsf-image__actions">
            <button type="button" className="cms-btn cms-btn--ghost cms-btn--small" onClick={() => setPicking(true)}>Replace</button>
            <button type="button" className="cms-btn cms-btn--ghost cms-btn--small" onClick={() => onChange("")}>Remove</button>
          </div>
        )}
      </div>
      {showAlt && value && onAlt && (
        <label className="cmsf-inline">
          <span>Photo description <small>— helps blind visitors and Google</small></span>
          <input value={alt || ""} maxLength={300} placeholder="e.g. Workers placing the roof trusses on the guest wing" onChange={(event) => onAlt(event.target.value)} />
        </label>
      )}
      <Hint>{hint}</Hint>
      {picking && <MediaPicker kind="image" onClose={() => setPicking(false)} onSelect={(item) => { onChange(item.url, item.alt); setPicking(false); }} />}
    </div>
  );
}

function Gallery({ field, value, onChange }: { field: FieldDef; value: Array<{ src: string; alt: string; caption: string }>; onChange: (value: unknown) => void }) {
  const [picking, setPicking] = useState(false);
  const move = (index: number, direction: -1 | 1) => {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="cmsf cmsf--wide">
      <span className="cmsf-label"><span>{field.label}</span><small>{value.length} photo{value.length === 1 ? "" : "s"}</small></span>
      {value.length > 0 && (
        <ol className="cms-gallery-list">
          {value.map((image, index) => (
            <li key={`${image.src}-${index}`}>
              <img src={image.src} alt="" />
              <div className="cms-gallery-list__fields">
                <input value={image.alt} maxLength={300} placeholder="Photo description" onChange={(event) => onChange(value.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)))} />
                <input value={image.caption} maxLength={300} placeholder="Caption under the photo (optional)" onChange={(event) => onChange(value.map((item, i) => (i === index ? { ...item, caption: event.target.value } : item)))} />
              </div>
              <div className="cms-gallery-list__tools">
                <button type="button" aria-label="Move up" title="Move up" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
                <button type="button" aria-label="Move down" title="Move down" onClick={() => move(index, 1)} disabled={index === value.length - 1}>↓</button>
                <button type="button" aria-label="Remove photo" title="Remove" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="cmsf-add" onClick={() => setPicking(true)} disabled={value.length >= (field.maxItems ?? 40)}>+ Add photos</button>
      <Hint>{field.hint}</Hint>
      {picking && <MediaPicker kind="image" onClose={() => setPicking(false)} onSelect={(item) => onChange([...value, { src: item.url, alt: item.alt, caption: "" }].slice(0, field.maxItems ?? 40))} />}
    </div>
  );
}

function Pairs({ field, value, onChange }: { field: FieldDef; value: Array<Record<string, string>>; onChange: (value: unknown) => void }) {
  const pair = field.pair!;
  const update = (index: number, key: string, text: string) => onChange(value.map((item, i) => (i === index ? { ...item, [key]: text } : item)));
  const move = (index: number, direction: -1 | 1) => {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="cmsf cmsf--wide">
      <span className="cmsf-label"><span>{field.label}</span></span>
      <ol className="cmsf-pairs">
        {value.map((item, index) => (
          <li key={index}>
            <span className="cmsf-pairs__number">{String(index + 1).padStart(2, "0")}</span>
            <div className="cmsf-pairs__fields">
              <input aria-label={pair.a.label} placeholder={pair.a.label} maxLength={pair.a.max} value={item[pair.a.key] || ""} onChange={(event) => update(index, pair.a.key, event.target.value)} />
              {pair.b.multiline
                ? <textarea aria-label={pair.b.label} placeholder={pair.b.label} maxLength={pair.b.max} rows={2} value={item[pair.b.key] || ""} onChange={(event) => update(index, pair.b.key, event.target.value)} />
                : <input aria-label={pair.b.label} placeholder={pair.b.label} maxLength={pair.b.max} value={item[pair.b.key] || ""} onChange={(event) => update(index, pair.b.key, event.target.value)} />}
            </div>
            <div className="cms-gallery-list__tools">
              <button type="button" aria-label="Move up" title="Move up" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
              <button type="button" aria-label="Move down" title="Move down" onClick={() => move(index, 1)} disabled={index === value.length - 1}>↓</button>
              <button type="button" aria-label={`Remove ${pair.itemLabel}`} title="Remove" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
            </div>
          </li>
        ))}
      </ol>
      {value.length < (pair.maxItems ?? 20) && <button type="button" className="cmsf-add" onClick={() => onChange([...value, { [pair.a.key]: "", [pair.b.key]: "" }])}>+ Add a {pair.itemLabel}</button>}
      <Hint>{field.hint}</Hint>
    </div>
  );
}

function Lines({ field, value, onChange }: { field: FieldDef; value: string[]; onChange: (value: unknown) => void }) {
  return (
    <div className="cmsf cmsf--wide">
      <span className="cmsf-label"><span>{field.label}</span></span>
      <ol className="cmsf-lines">
        {value.map((line, index) => (
          <li key={index}>
            <input value={line} maxLength={300} onChange={(event) => onChange(value.map((item, i) => (i === index ? event.target.value : item)))} aria-label={`${field.itemLabel || "Item"} ${index + 1}`} />
            <button type="button" aria-label="Remove" title="Remove" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
          </li>
        ))}
      </ol>
      {value.length < (field.maxItems ?? 20) && <button type="button" className="cmsf-add" onClick={() => onChange([...value, ""])}>+ Add a {field.itemLabel || "line"}</button>}
      <Hint>{field.hint}</Hint>
    </div>
  );
}

/** Renders any field from the collection definitions. */
export function Field({ field, values, set, options }: { field: FieldDef; values: Values; set: (key: string, value: unknown) => void; options: Options }) {
  const value = values[field.key];
  const id = `f-${field.key}`;
  switch (field.type) {
    case "text":
    case "url":
    case "email":
    case "date":
      return (
        <label className={`cmsf${field.wide || field.key === "title" ? " cmsf--wide" : ""}`} htmlFor={id}>
          <Label field={field} value={field.type === "text" ? str(value) : undefined} />
          <input id={id} type={field.type === "text" ? "text" : field.type} value={str(value)} maxLength={field.max} placeholder={field.placeholder || (field.type === "url" ? "https://…" : "")} onChange={(event) => set(field.key, event.target.value)} />
          <Hint>{field.hint}</Hint>
        </label>
      );
    case "textarea":
      return (
        <label className="cmsf cmsf--wide" htmlFor={id}>
          <Label field={field} value={str(value)} />
          <textarea id={id} rows={field.rows ?? 4} value={str(value)} maxLength={field.max} placeholder={field.placeholder} onChange={(event) => set(field.key, event.target.value)} />
          <Hint>{field.hint}</Hint>
        </label>
      );
    case "select": {
      const list = Array.isArray(field.options) ? field.options : options[field.options || ""] || [];
      return (
        <label className="cmsf" htmlFor={id}>
          <Label field={field} />
          <select id={id} value={str(value)} onChange={(event) => set(field.key, event.target.value)}>
            <option value="">— Choose —</option>
            {list.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <Hint>{field.hint}</Hint>
        </label>
      );
    }
    case "toggle":
      return (
        <label className="cms-switch cmsf--wide">
          <input type="checkbox" checked={value === true} onChange={(event) => set(field.key, event.target.checked)} />
          <span>{field.label}{field.hint && <small className="cmsf-hint"> {field.hint}</small>}</span>
        </label>
      );
    case "image":
      return <ImageInput label={field.label} hint={field.hint} required={field.requiredToPublish} value={str(value)} alt={field.altKey ? str(values[field.altKey]) : undefined}
        onChange={(url, alt) => { set(field.key, url); if (field.altKey && alt && !str(values[field.altKey])) set(field.altKey, alt); }}
        onAlt={field.altKey ? (alt) => set(field.altKey!, alt) : undefined} showAlt={Boolean(field.altKey)} />;
    case "gallery":
      return <Gallery field={field} value={Array.isArray(value) ? (value as Array<{ src: string; alt: string; caption: string }>) : []} onChange={(next) => set(field.key, next)} />;
    case "pairs":
      return <Pairs field={field} value={Array.isArray(value) ? (value as Array<Record<string, string>>) : []} onChange={(next) => set(field.key, next)} />;
    case "lines":
      return <Lines field={field} value={Array.isArray(value) ? (value as string[]) : []} onChange={(next) => set(field.key, next)} />;
    case "richtext":
      return (
        <div className="cmsf cmsf--wide">
          <Label field={field} />
          <RichEditor initial={value} label={field.label} onChange={(doc) => set(field.key, doc)} />
          <Hint>{field.hint}</Hint>
        </div>
      );
  }
}

/** How the page will look on Google — updates as you type. */
export function SearchPreview({ title, description, url }: { title: string; description: string; url: string }) {
  return (
    <div className="cmsf-serp" aria-label="Preview on Google">
      <small>Preview on Google</small>
      <span className="cmsf-serp__url">{url}</span>
      <strong>{title.length > 64 ? `${title.slice(0, 62)}…` : title || "Page title"}</strong>
      <p>{description.length > 165 ? `${description.slice(0, 160)}…` : description || "Add a short description so people know what they'll find."}</p>
    </div>
  );
}
