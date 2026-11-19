"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState, type ReactNode } from "react";
import { MediaPicker } from "@/components/admin/media-library";
import { CALLOUT_TONES, HIGHLIGHTS } from "@/lib/cms/richtext";

/** A note / tip / warning box inside an article. */
const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ tone: { default: "info", parseHTML: (element) => element.getAttribute("data-tone") ?? "info", renderHTML: (attrs) => ({ "data-tone": attrs.tone }) } }),
  parseHTML: () => [{ tag: "aside[data-tone]" }],
  renderHTML: ({ HTMLAttributes }) => ["aside", mergeAttributes(HTMLAttributes, { class: "callout" }), 0],
});

function Tool({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" className="rte-tool" aria-pressed={active ?? undefined} aria-label={label} title={label} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={on}>
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [picking, setPicking] = useState(false);
  const chain = () => editor.chain().focus();
  const block = editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : editor.isActive("heading", { level: 4 }) ? "h4" : "p";
  const inTable = editor.isActive("table");

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address — a page on this site like /services, or a full web address (https://…). Leave empty to remove the link.", previous ?? "");
    if (url === null) return;
    if (!url.trim()) chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: url.trim(), target: /^https?:/i.test(url.trim()) ? "_blank" : null }).run();
  }

  return (
    <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
      <select className="rte-select" aria-label="Text style" value={block} onChange={(event) => {
        const value = event.target.value;
        if (value === "p") chain().setParagraph().run();
        else chain().setHeading({ level: Number(value.slice(1)) as 2 | 3 | 4 }).run();
      }}>
        <option value="p">Paragraph</option>
        <option value="h2">Heading</option>
        <option value="h3">Sub-heading</option>
        <option value="h4">Small heading</option>
      </select>
      <span className="rte-sep" />
      <Tool label="Bold" active={editor.isActive("bold")} on={() => chain().toggleBold().run()}><b>B</b></Tool>
      <Tool label="Italic" active={editor.isActive("italic")} on={() => chain().toggleItalic().run()}><i>I</i></Tool>
      <Tool label="Underline" active={editor.isActive("underline")} on={() => chain().toggleUnderline().run()}><u>U</u></Tool>
      <Tool label="Link" active={editor.isActive("link")} on={setLink}>Link</Tool>
      <select className="rte-select" aria-label="Highlight" value="" onChange={(event) => (event.target.value === "none" ? chain().unsetHighlight().run() : event.target.value && chain().setHighlight({ color: event.target.value }).run())}>
        <option value="">Highlight</option>
        {HIGHLIGHTS.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}
        <option value="none">No highlight</option>
      </select>
      <span className="rte-sep" />
      <Tool label="Bulleted list" active={editor.isActive("bulletList")} on={() => chain().toggleBulletList().run()}>• List</Tool>
      <Tool label="Numbered list" active={editor.isActive("orderedList")} on={() => chain().toggleOrderedList().run()}>1. List</Tool>
      <Tool label="Quote" active={editor.isActive("blockquote")} on={() => chain().toggleBlockquote().run()}>❝ Quote</Tool>
      <select className="rte-select" aria-label="Box" value="" onChange={(event) => {
        const tone = event.target.value;
        if (!tone) return;
        if (editor.isActive("callout")) chain().lift("callout").run();
        if (tone !== "remove") chain().wrapIn("callout", { tone }).run();
      }}>
        <option value="">Box…</option>
        {CALLOUT_TONES.map((tone) => <option key={tone} value={tone}>{tone === "info" ? "Note box" : tone === "tip" ? "Tip box" : "Warning box"}</option>)}
        {editor.isActive("callout") && <option value="remove">Remove box</option>}
      </select>
      <Tool label="Divider line" on={() => chain().setHorizontalRule().run()}>―</Tool>
      <span className="rte-sep" />
      <Tool label="Add a photo" on={() => setPicking(true)}>Photo</Tool>
      {editor.isActive("image") && (
        <Tool label="Photo caption" on={() => {
          const caption = window.prompt("Caption under the photo (optional)", (editor.getAttributes("image").title as string) ?? "");
          if (caption !== null) chain().updateAttributes("image", { title: caption.trim() || null }).run();
        }}>Caption</Tool>
      )}
      <Tool label="Insert table" on={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Table</Tool>
      {inTable && (
        <>
          <Tool label="Add row" on={() => chain().addRowAfter().run()}>+ Row</Tool>
          <Tool label="Add column" on={() => chain().addColumnAfter().run()}>+ Column</Tool>
          <Tool label="Delete row" on={() => chain().deleteRow().run()}>− Row</Tool>
          <Tool label="Delete column" on={() => chain().deleteColumn().run()}>− Column</Tool>
          <Tool label="Delete table" on={() => chain().deleteTable().run()}>✕ Table</Tool>
        </>
      )}
      <span className="rte-sep" />
      {(["left", "center", "right"] as const).map((align) => (
        <Tool key={align} label={`Align ${align}`} active={editor.isActive({ textAlign: align })} on={() => chain().setTextAlign(align).run()}>{align === "left" ? "⇤" : align === "center" ? "↔" : "⇥"}</Tool>
      ))}
      <span className="rte-sep" />
      <Tool label="Undo" disabled={!editor.can().undo()} on={() => chain().undo().run()}>↶</Tool>
      <Tool label="Redo" disabled={!editor.can().redo()} on={() => chain().redo().run()}>↷</Tool>
      {picking && (
        <MediaPicker kind="image" onClose={() => setPicking(false)} onSelect={(item) => {
          setPicking(false);
          chain().insertContent({ type: "image", attrs: { src: item.url, alt: item.alt } }).run();
        }} />
      )}
    </div>
  );
}

/** The CMS's article editor. Visitors get clean HTML rendered on save (lib/cms/richtext.ts). */
export default function RichEditor({ initial, onChange, label }: { initial: unknown; onChange: (doc: JSONContent) => void; label: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
    ],
    content: (initial && typeof initial === "object" ? initial : { type: "doc", content: [] }) as JSONContent,
    editorProps: { attributes: { class: "rte-content", "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor: current }) => onChange(JSON.parse(JSON.stringify(current.getJSON())) as JSONContent),
  });
  if (!editor) return <div className="rte-loading">Loading the editor…</div>;
  return (
    <div className="rte">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <p className="rte-foot">{(() => { const words = editor.getText().split(/\s+/).filter(Boolean).length; return `${words} word${words === 1 ? "" : "s"} · about ${Math.max(1, Math.round(words / 200))} min read`; })()}</p>
    </div>
  );
}
