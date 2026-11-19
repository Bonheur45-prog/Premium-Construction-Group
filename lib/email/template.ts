import "server-only";

/** Branded, email-client-safe HTML (tables + inline styles) shared by every message the site sends. */

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export type EmailBlock =
  | { type: "paragraph"; text: string }
  | { type: "details"; rows: Array<[string, string]> }
  | { type: "quote"; label?: string; text: string }
  | { type: "status"; label: string; value: string }
  | { type: "button"; label: string; href: string }
  | { type: "note"; text: string }
  | { type: "html"; html: string };

const color = { night: "#102d3d", ink: "#183746", soft: "#49616a", muted: "#6e7c80", amber: "#efa94f", line: "#e3e9e6", paper: "#f2f5f3", white: "#fffefa", blue: "#1b5b7c" };

function block(item: EmailBlock) {
  switch (item.type) {
    case "paragraph":
      return `<p style="margin:0 0 16px;color:${color.soft};font-size:15px;line-height:1.8">${escapeHtml(item.text).replace(/\n/g, "<br>")}</p>`;
    case "details":
      return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 20px">${item.rows
        .filter(([, value]) => value)
        .map(([label, value]) => `<tr><td style="width:130px;padding:11px 8px 11px 0;border-top:1px solid ${color.line};color:${color.muted};font-size:12px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:11px 0;border-top:1px solid ${color.line};color:${color.ink};font-size:14px;line-height:1.6;vertical-align:top">${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`)
        .join("")}</table>`;
    case "quote":
      return `<div style="margin:6px 0 20px;padding:16px 18px;background:${color.paper};border-left:3px solid ${color.amber};color:${color.ink};font-size:14px;line-height:1.75">${item.label ? `<div style="margin-bottom:6px;color:${color.muted};font-size:11px;letter-spacing:1px;text-transform:uppercase">${escapeHtml(item.label)}</div>` : ""}${escapeHtml(item.text).replace(/\n/g, "<br>")}</div>`;
    case "status":
      return `<div style="margin:6px 0 22px"><span style="color:${color.muted};font-size:12px">${escapeHtml(item.label)}</span><br><span style="display:inline-block;margin-top:6px;padding:7px 12px;background:${color.night};color:${color.white};font-size:13px;font-weight:bold;letter-spacing:.5px">${escapeHtml(item.value)}</span></div>`;
    case "button":
      return `<p style="margin:24px 0"><a href="${escapeHtml(item.href)}" style="display:inline-block;padding:14px 20px;background:${color.night};color:${color.white};text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:.4px">${escapeHtml(item.label)} ↗</a></p>`;
    case "note":
      return `<p style="margin:18px 0 0;color:${color.muted};font-size:12px;line-height:1.7">${escapeHtml(item.text)}</p>`;
    case "html":
      return item.html;
  }
}

export function renderEmail({ eyebrow = "Premium Construction Group", heading, preheader = "", blocks }: { eyebrow?: string; heading: string; preheader?: string; blocks: EmailBlock[] }) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;background:${color.paper};font-family:Arial,Helvetica,sans-serif;color:${color.ink}"><span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span><div style="max-width:620px;margin:32px auto;background:${color.white}"><div style="height:8px;background:${color.amber}"></div><div style="padding:38px 42px"><p style="margin:0 0 18px;color:${color.blue};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 22px;color:${color.night};font:normal 32px/1.15 Georgia,serif">${escapeHtml(heading)}</h1>${blocks.map(block).join("")}<p style="margin:30px 0 0;padding-top:18px;border-top:1px solid ${color.line};color:${color.muted};font-size:12px;line-height:1.7">Premium Construction Group · Thoughtful construction. Clear communication. Made to last.</p></div></div></body></html>`;
}

/** Plain-text twin of the same blocks, for clients that don't render HTML. */
export function renderText(heading: string, blocks: EmailBlock[]) {
  const lines = [heading, ""];
  for (const item of blocks) {
    if (item.type === "paragraph" || item.type === "note") lines.push(item.text, "");
    if (item.type === "quote") lines.push(`${item.label ? `${item.label}: ` : ""}${item.text}`, "");
    if (item.type === "status") lines.push(`${item.label}: ${item.value}`, "");
    if (item.type === "details") lines.push(...item.rows.filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`), "");
    if (item.type === "button") lines.push(`${item.label}: ${item.href}`, "");
  }
  return `${lines.join("\n").trim()}\n\nPremium Construction Group`;
}
