import "server-only";

import { allFields, type CollectionDef, type FieldDef } from "@/lib/cms/collections";
import { isEmptyDoc, renderDoc, safeImageSrc } from "@/lib/cms/richtext";

/** Values coming from the editor are untrusted: each field is cleaned according to its type; unknown keys are dropped. */

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "");

function cleanUrl(value: unknown) {
  const raw = text(value, 500);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanField(field: FieldDef, value: unknown, options: Map<string, string[]>): unknown {
  switch (field.type) {
    case "text": return text(value, field.max ?? 200);
    case "textarea": return text(value, field.max ?? 4000);
    case "image": return safeImageSrc(value) ?? "";
    case "url": return cleanUrl(value);
    case "email": {
      const email = text(value, 254).toLowerCase();
      return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : "";
    }
    case "date": {
      const date = text(value, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : "";
    }
    case "toggle": return value === true;
    case "select": {
      const allowed = Array.isArray(field.options) ? field.options.map((option) => option.value) : options.get(String(field.options)) || [];
      const chosen = text(value, 80);
      return allowed.includes(chosen) ? chosen : "";
    }
    case "lines": return (Array.isArray(value) ? value : []).map((line) => text(line, 300)).filter(Boolean).slice(0, field.maxItems ?? 20);
    case "pairs": {
      const pair = field.pair!;
      return (Array.isArray(value) ? value : []).slice(0, pair.maxItems ?? 20).map((item) => {
        const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return { [pair.a.key]: text(record[pair.a.key], pair.a.max ?? 200), [pair.b.key]: text(record[pair.b.key], pair.b.max ?? 2000) };
      }).filter((item) => Object.values(item).some(Boolean));
    }
    case "gallery": return (Array.isArray(value) ? value : []).slice(0, field.maxItems ?? 40).map((item) => {
      const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return { src: safeImageSrc(record.src) ?? "", alt: text(record.alt, 300), caption: text(record.caption, 300) };
    }).filter((item) => item.src);
    case "richtext": {
      if (!value || typeof value !== "object" || (value as { type?: unknown }).type !== "doc") return { type: "doc", content: [] };
      return JSON.stringify(value).length > 600_000 ? { type: "doc", content: [] } : JSON.parse(JSON.stringify(value));
    }
  }
}

/** Cleans editor values for a collection. Rich text fields also get their rendered HTML (`<key>Html`). */
export function sanitizeEntryData(def: CollectionDef, input: Record<string, unknown>, options: Map<string, string[]>) {
  const data: Record<string, unknown> = {};
  for (const field of allFields(def)) {
    data[field.key] = cleanField(field, input[field.key], options);
    if (field.altKey) data[field.altKey] = text(input[field.altKey], 300);
    if (field.type === "richtext") {
      const rendered = renderDoc(data[field.key]);
      data[`${field.key}Html`] = rendered.html;
      if (field.key === "body") {
        data.readingMinutes = rendered.readingMinutes;
        data.toc = rendered.toc;
      }
    }
  }
  return data;
}

/** Labels of required fields still empty — publishing is blocked until they're filled. */
export function missingForPublish(def: CollectionDef, data: Record<string, unknown>) {
  return allFields(def).filter((field) => {
    if (!field.requiredToPublish) return false;
    const value = data[field.key];
    if (field.type === "richtext") return isEmptyDoc(value);
    if (Array.isArray(value)) return value.length === 0;
    return !value;
  }).map((field) => field.label);
}
