/**
 * Rich text (the CMS editor's document, TipTap JSON) → clean HTML, rendered when an item is saved,
 * so visitors never download the editor. The JSON comes from the browser and is NOT trusted:
 * only the node types, marks and attribute values listed here get through; all text is escaped.
 */

export type DocNode = { type?: string; text?: string; attrs?: Record<string, unknown>; marks?: { type?: string; attrs?: Record<string, unknown> }[]; content?: DocNode[] };
export type TocEntry = { id: string; text: string; level: 2 | 3 };
export type RenderedDoc = { html: string; toc: TocEntry[]; words: number; readingMinutes: number; text: string };

/** Brand colours editors can pick. Anything else is dropped. */
export const TEXT_COLORS = [
  { value: "#102d3d", label: "Night blue" },
  { value: "#1b5b7c", label: "Blue" },
  { value: "#b06e17", label: "Amber" },
  { value: "#2f8a68", label: "Green" },
  { value: "#b4453a", label: "Red" },
  { value: "#5b6b72", label: "Grey" },
] as const;
export const HIGHLIGHTS = [
  { value: "#fff1cf", label: "Amber" },
  { value: "#dcefe7", label: "Green" },
  { value: "#dcedf4", label: "Blue" },
] as const;
export const CALLOUT_TONES = ["info", "tip", "warning"] as const;

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const COLORS = new Set<string>(TEXT_COLORS.map((color) => color.value));
const MARKS = new Set<string>(HIGHLIGHTS.map((color) => color.value));
const ALIGN = new Set(["center", "right", "justify"]);

/** Allowed link targets: http(s), mailto, tel, a page on this site, or an anchor. */
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (/^\/(?!\/)[^\s]*$/.test(value) || /^#[\w-]+$/.test(value) || /^mailto:[^\s]+$/i.test(value) || /^tel:[+\d\s()-]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Images: https URLs or files on this site only. */
export function safeImageSrc(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (/^\/(?!\/)[^\s"'<>]*$/.test(value)) return value;
  return /^https:\/\/[^\s"'<>]+$/i.test(value) ? value : null;
}

export const headingId = (text: string) =>
  text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";

const textOf = (node: DocNode): string => (node.type === "text" ? node.text ?? "" : (node.content ?? []).map(textOf).join(node.type === "paragraph" ? "" : " "));

export function renderDoc(doc: unknown): RenderedDoc {
  const toc: TocEntry[] = [];
  const ids = new Set<string>();
  const plain: string[] = [];

  const alignStyle = (node: DocNode) => {
    const align = node.attrs?.textAlign;
    return typeof align === "string" && ALIGN.has(align) ? ` style="text-align:${align}"` : "";
  };

  const renderText = (node: DocNode): string => {
    let out = esc(node.text ?? "");
    for (const mark of node.marks ?? []) {
      const attrs = mark.attrs ?? {};
      switch (mark.type) {
        case "bold": out = `<strong>${out}</strong>`; break;
        case "italic": out = `<em>${out}</em>`; break;
        case "underline": out = `<u>${out}</u>`; break;
        case "strike": out = `<s>${out}</s>`; break;
        case "code": out = `<code>${out}</code>`; break;
        case "link": {
          const href = safeHref(attrs.href);
          if (!href) break;
          const external = /^https?:/i.test(href);
          out = `<a href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${out}</a>`;
          break;
        }
        case "textStyle": {
          if (typeof attrs.color === "string" && COLORS.has(attrs.color.toLowerCase())) out = `<span style="color:${attrs.color.toLowerCase()}">${out}</span>`;
          break;
        }
        case "highlight": {
          const color = typeof attrs.color === "string" && MARKS.has(attrs.color.toLowerCase()) ? attrs.color.toLowerCase() : HIGHLIGHTS[0].value;
          out = `<mark style="background-color:${color}">${out}</mark>`;
          break;
        }
      }
    }
    return out;
  };

  const kids = (node: DocNode) => (node.content ?? []).map(render).join("");

  function render(node: DocNode): string {
    switch (node.type) {
      case "text": return renderText(node);
      case "hardBreak": return "<br>";
      case "paragraph": {
        const text = textOf(node).trim();
        if (text) plain.push(text);
        return `<p${alignStyle(node)}>${kids(node)}</p>`;
      }
      case "heading": {
        const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2)) as 2 | 3 | 4;
        const text = textOf(node).trim();
        let id = headingId(text);
        for (let index = 2; ids.has(id); index++) id = `${headingId(text)}-${index}`;
        ids.add(id);
        if (level !== 4 && text) toc.push({ id, text: text.slice(0, 120), level });
        if (text) plain.push(text);
        return `<h${level} id="${id}"${alignStyle(node)}>${kids(node)}</h${level}>`;
      }
      case "bulletList": return `<ul>${kids(node)}</ul>`;
      case "orderedList": {
        const start = Number(node.attrs?.start);
        return `<ol${Number.isInteger(start) && start > 1 && start < 10000 ? ` start="${start}"` : ""}>${kids(node)}</ol>`;
      }
      case "listItem": return `<li>${kids(node)}</li>`;
      case "blockquote": return `<blockquote>${kids(node)}</blockquote>`;
      case "horizontalRule": return "<hr>";
      case "callout": {
        const tone = (CALLOUT_TONES as readonly string[]).includes(String(node.attrs?.tone)) ? String(node.attrs?.tone) : "info";
        return `<aside class="callout callout-${tone}" role="note">${kids(node)}</aside>`;
      }
      case "image": {
        const src = safeImageSrc(node.attrs?.src);
        if (!src) return "";
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.slice(0, 300) : "";
        const caption = typeof node.attrs?.title === "string" ? node.attrs.title.trim().slice(0, 300) : "";
        return `<figure><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}</figure>`;
      }
      case "table": return `<div class="table-wrap"><table><tbody>${kids(node)}</tbody></table></div>`;
      case "tableRow": return `<tr>${kids(node)}</tr>`;
      case "tableCell":
      case "tableHeader": {
        const tag = node.type === "tableHeader" ? "th" : "td";
        const span = (key: string) => {
          const value = Number(node.attrs?.[key]);
          return Number.isInteger(value) && value > 1 && value <= 20 ? ` ${key}="${value}"` : "";
        };
        return `<${tag}${span("colspan")}${span("rowspan")}>${kids(node)}</${tag}>`;
      }
      case "doc": return kids(node);
      default: return "";
    }
  }

  const root = (doc && typeof doc === "object" ? doc : { type: "doc", content: [] }) as DocNode;
  const html = root.type === "doc" ? render(root) : "";
  const text = plain.join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return { html, toc, words, readingMinutes: Math.max(1, Math.round(words / 200)), text };
}

/** Builds an editor document from plain paragraphs (used when moving older content into the editor). */
export function docFromParagraphs(blocks: Array<{ heading?: string; text: string }>): DocNode {
  const content: DocNode[] = [];
  for (const block of blocks) {
    if (block.heading?.trim()) content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: block.heading.trim() }] });
    for (const paragraph of block.text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)) {
      content.push({ type: "paragraph", content: [{ type: "text", text: paragraph }] });
    }
  }
  return { type: "doc", content };
}

export function isEmptyDoc(doc: unknown) {
  return !renderDoc(doc).text.trim() && !JSON.stringify(doc ?? "").includes('"image"');
}
