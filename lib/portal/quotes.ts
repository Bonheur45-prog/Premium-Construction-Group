import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { pgQuery, pgTransaction } from "@/lib/db/postgres";
import { getFeatures } from "@/lib/features";
import { postSystemMessage } from "@/lib/portal/chat";
import { type Actor } from "@/lib/portal/files";
import { publishBoth } from "@/lib/portal/realtime";
import { HttpError } from "@/lib/server/http";

/**
 * Quotes and change orders. Each send creates a numbered revision, so both sides can see how the
 * price moved. The client accepts (typing their full name as sign-off), asks for changes, or declines.
 * The sign-off records name, time, network address and browser, plus a fingerprint of exactly what
 * was accepted. It is a clear record of agreement, not a certified electronic signature.
 */
export type QuoteKind = "quote" | "change_order";
export type QuoteStatus = "draft" | "sent" | "accepted" | "changes_requested" | "declined" | "withdrawn";
export type QuoteItem = { description: string; quantity: number; unit: string; unitPrice: number; section: string };

type QuoteRow = { id: string; ref: string; client_id: string; conversation_id: string | null; project_id: string | null; kind: QuoteKind; title: string; status: QuoteStatus; currency: string; created_by: string; created_at: Date; updated_at: Date };
type RevisionRow = {
  id: string; quote_id: string; revision: number; items: QuoteItem[]; notes: string; vat_rate: string; subtotal: string; vat: string; total: string; valid_until: string | null;
  sent_at: Date | null; sent_by: string; response: "" | "accepted" | "changes_requested" | "declined"; response_note: string; responded_at: Date | null;
  signed_name: string; signed_ip: string; signed_agent: string; signature_hash: string; created_at: Date;
};

export type QuoteRevision = {
  id: string; revision: number; items: QuoteItem[]; notes: string; vatRate: number; subtotal: number; vat: number; total: number; validUntil: string | null;
  sentAt: string | null; sentBy: string; response: RevisionRow["response"]; responseNote: string; respondedAt: string | null;
  signedName: string; signatureHash: string; signedFrom: string;
};
export type QuoteSummary = {
  id: string; ref: string; clientId: string; clientName: string; kind: QuoteKind; title: string; status: QuoteStatus; currency: string; total: number; revision: number;
  validUntil: string | null; updatedAt: string; conversationId: string | null; projectId: string | null;
};
export type QuoteDetail = QuoteSummary & { revisions: QuoteRevision[]; createdAt: string; createdBy: string; clientEmail: string; clientCompany: string };

const iso = (value: Date | null) => (value ? value.toISOString() : null);
const dateOnly = (value: Date | string | null) => (!value ? null : typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10));

function revision(row: RevisionRow, forStaff: boolean): QuoteRevision {
  return {
    id: row.id, revision: row.revision, items: row.items, notes: row.notes, vatRate: Number(row.vat_rate), subtotal: Number(row.subtotal), vat: Number(row.vat), total: Number(row.total),
    validUntil: dateOnly(row.valid_until), sentAt: iso(row.sent_at), sentBy: row.sent_by, response: row.response, responseNote: row.response_note, respondedAt: iso(row.responded_at),
    signedName: row.signed_name, signatureHash: row.signature_hash, signedFrom: forStaff ? [row.signed_ip, row.signed_agent].filter(Boolean).join(" · ") : "",
  };
}

export function cleanItems(input: unknown): QuoteItem[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 200).map((raw) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const number = (value: unknown, max: number) => { const n = Number(value); return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0; };
    return {
      description: String(item.description || "").replace(/\s+/g, " ").trim().slice(0, 300),
      quantity: Math.round(number(item.quantity, 1_000_000) * 100) / 100,
      unit: String(item.unit || "").trim().slice(0, 16),
      unitPrice: Math.round(number(item.unitPrice, 1e13)),
      section: String(item.section || "").trim().slice(0, 60),
    };
  }).filter((item) => item.description);
}

export function totals(items: QuoteItem[], vatRate: number) {
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const vat = Math.round((subtotal * vatRate) / 100);
  return { subtotal, vat, total: subtotal + vat };
}

async function nextRef(kind: QuoteKind) {
  const prefix = `${kind === "quote" ? "Q" : "CO"}-${new Date().getFullYear()}-`;
  const result = await pgQuery<{ ref: string }>("SELECT ref FROM pcg_quotes WHERE ref LIKE $1 ORDER BY ref DESC LIMIT 1", [`${prefix}%`]);
  const last = Number(result.rows[0]?.ref.slice(prefix.length) || 0);
  return `${prefix}${String(last + 1).padStart(4, "0")}`;
}

export async function listQuotes({ clientId, forStaff }: { clientId?: string; forStaff: boolean }): Promise<QuoteSummary[]> {
  const values: unknown[] = [];
  const where = [];
  if (clientId) { values.push(clientId); where.push(`q.client_id = $${values.length}`); }
  if (!forStaff) where.push("q.status <> 'draft'");
  const result = await pgQuery<QuoteRow & { client_name: string; total: string; revision: number; valid_until: string | null }>(
    `SELECT q.*, cl.name AS client_name, r.total, r.revision, r.valid_until FROM pcg_quotes q
     JOIN pcg_clients cl ON cl.id = q.client_id
     JOIN LATERAL (SELECT * FROM pcg_quote_revisions rr WHERE rr.quote_id = q.id ${forStaff ? "" : "AND rr.sent_at IS NOT NULL"} ORDER BY rr.revision DESC LIMIT 1) r ON TRUE
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY q.updated_at DESC LIMIT 300`,
    values,
  );
  return result.rows.map((row) => ({
    id: row.id, ref: row.ref, clientId: row.client_id, clientName: row.client_name, kind: row.kind, title: row.title, status: row.status, currency: row.currency,
    total: Number(row.total), revision: row.revision, validUntil: dateOnly(row.valid_until), updatedAt: row.updated_at.toISOString(), conversationId: row.conversation_id, projectId: row.project_id,
  }));
}

export async function getQuote(id: string, { clientId, forStaff }: { clientId?: string; forStaff: boolean }): Promise<QuoteDetail> {
  const result = await pgQuery<QuoteRow & { client_name: string; client_email: string; client_company: string }>(
    "SELECT q.*, cl.name AS client_name, cl.email AS client_email, cl.company AS client_company FROM pcg_quotes q JOIN pcg_clients cl ON cl.id = q.client_id WHERE q.id = $1",
    [id],
  );
  const row = result.rows[0];
  if (!row || (clientId && row.client_id !== clientId) || (!forStaff && row.status === "draft")) throw new HttpError(404, "Quote not found.");
  const revisions = await pgQuery<RevisionRow>(`SELECT * FROM pcg_quote_revisions WHERE quote_id = $1 ${forStaff ? "" : "AND sent_at IS NOT NULL"} ORDER BY revision DESC`, [id]);
  const list = revisions.rows.map((item) => revision(item, forStaff));
  return {
    id: row.id, ref: row.ref, clientId: row.client_id, clientName: row.client_name, clientEmail: row.client_email, clientCompany: row.client_company, kind: row.kind, title: row.title,
    status: row.status, currency: row.currency, total: list[0]?.total || 0, revision: list[0]?.revision || 1, validUntil: list[0]?.validUntil || null, updatedAt: row.updated_at.toISOString(),
    conversationId: row.conversation_id, projectId: row.project_id, revisions: list, createdAt: row.created_at.toISOString(), createdBy: row.created_by,
  };
}

export async function createQuote(staff: Actor, input: { clientId: unknown; kind: unknown; title: unknown; conversationId?: unknown; projectId?: unknown }) {
  const features = await getFeatures();
  if (!features.quotes.enabled) throw new HttpError(404, "Quotes are switched off.");
  const clientId = String(input.clientId || "");
  const client = await pgQuery("SELECT id FROM pcg_clients WHERE id = $1", [clientId]);
  if (!client.rows[0]) throw new HttpError(404, "Choose a client.");
  const kind: QuoteKind = input.kind === "change_order" ? "change_order" : "quote";
  const title = String(input.title || "").replace(/\s+/g, " ").trim().slice(0, 140);
  if (title.length < 3) throw new HttpError(400, "Give the quote a title, for example “Kicukiro villa — main works”.");
  const id = randomUUID();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await pgTransaction(async (db) => {
        const ref = await nextRef(kind);
        await db.query(
          "INSERT INTO pcg_quotes (id, ref, client_id, conversation_id, project_id, kind, title, currency, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [id, ref, clientId, typeof input.conversationId === "string" && input.conversationId ? input.conversationId : null, typeof input.projectId === "string" && input.projectId ? input.projectId : null, kind, title, features.quotes.currency, staff.name],
        );
        const valid = new Date(Date.now() + features.quotes.validityDays * 86_400_000).toISOString().slice(0, 10);
        await db.query("INSERT INTO pcg_quote_revisions (id, quote_id, revision, vat_rate, valid_until) VALUES ($1,$2,1,$3,$4)", [randomUUID(), id, features.quotes.vatRate, valid]);
      });
      return id;
    } catch (error) {
      if ((error as { code?: string }).code !== "23505" || attempt === 2) throw error;
    }
  }
  return id;
}

/** Saves the working version. After a revision was sent, the next save starts a new revision. */
export async function saveQuoteDraft(id: string, input: { title?: unknown; items?: unknown; notes?: unknown; vatRate?: unknown; validUntil?: unknown }) {
  const quote = await getQuote(id, { forStaff: true });
  if (quote.status === "accepted" || quote.status === "withdrawn") throw new HttpError(400, "This quote is closed. Create a change order for further work.");
  const items = cleanItems(input.items);
  const vatRate = Math.min(Math.max(Number(input.vatRate ?? quote.revisions[0]?.vatRate ?? 18) || 0, 0), 50);
  const { subtotal, vat, total } = totals(items, vatRate);
  const notes = String(input.notes ?? "").trim().slice(0, 4000);
  const validUntil = typeof input.validUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.validUntil) ? input.validUntil : null;
  const latest = quote.revisions[0];
  if (latest && !latest.sentAt) {
    await pgQuery("UPDATE pcg_quote_revisions SET items = $2, notes = $3, vat_rate = $4, subtotal = $5, vat = $6, total = $7, valid_until = $8 WHERE id = $1", [latest.id, JSON.stringify(items), notes, vatRate, subtotal, vat, total, validUntil]);
  } else {
    await pgQuery(
      "INSERT INTO pcg_quote_revisions (id, quote_id, revision, items, notes, vat_rate, subtotal, vat, total, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [randomUUID(), id, (latest?.revision || 0) + 1, JSON.stringify(items), notes, vatRate, subtotal, vat, total, validUntil],
    );
  }
  const title = typeof input.title === "string" && input.title.trim().length >= 3 ? input.title.replace(/\s+/g, " ").trim().slice(0, 140) : quote.title;
  await pgQuery("UPDATE pcg_quotes SET title = $2, updated_at = NOW() WHERE id = $1", [id, title]);
  return getQuote(id, { forStaff: true });
}

export async function sendQuote(id: string, staff: Actor, origin: string) {
  const quote = await getQuote(id, { forStaff: true });
  const latest = quote.revisions[0];
  if (!latest || latest.sentAt) throw new HttpError(400, "Make your changes first — this version was already sent.");
  if (!latest.items.length) throw new HttpError(400, "Add at least one line before sending.");
  await pgQuery("UPDATE pcg_quote_revisions SET sent_at = NOW(), sent_by = $2 WHERE id = $1", [latest.id, staff.name]);
  await pgQuery("UPDATE pcg_quotes SET status = 'sent', updated_at = NOW() WHERE id = $1", [id]);
  const label = quote.kind === "quote" ? "Quote" : "Change order";
  const message = await postSystemMessage(quote.clientId, {
    kind: "quote", conversationId: quote.conversationId, origin, subject: quote.title,
    body: `${label} ${quote.ref}${latest.revision > 1 ? ` (revision ${latest.revision})` : ""}: ${quote.title}`,
    meta: { quoteId: id, ref: quote.ref, revision: latest.revision, total: latest.total, currency: quote.currency, kind: quote.kind, title: quote.title },
  });
  if (message && !quote.conversationId) await pgQuery("UPDATE pcg_quotes SET conversation_id = $2 WHERE id = $1", [id, message.conversationId]);
  publishBoth(quote.clientId, { type: "quote", quoteId: id });
  return getQuote(id, { forStaff: true });
}

export async function withdrawQuote(id: string) {
  const quote = await getQuote(id, { forStaff: true });
  if (quote.status === "accepted") throw new HttpError(400, "An accepted quote can't be withdrawn. Create a change order instead.");
  await pgQuery("UPDATE pcg_quotes SET status = 'withdrawn', updated_at = NOW() WHERE id = $1", [id]);
  publishBoth(quote.clientId, { type: "quote", quoteId: id });
}

/** The client's answer to the latest revision. Accepting needs their full name typed as sign-off. */
export async function respondToQuote(id: string, clientId: string, input: { response?: unknown; note?: unknown; signedName?: unknown; ip: string; agent: string; origin: string; clientName: string }) {
  const quote = await getQuote(id, { clientId, forStaff: true });
  if (quote.status !== "sent") throw new HttpError(400, quote.status === "accepted" ? "You already accepted this." : "This quote isn't waiting for an answer.");
  const latest = quote.revisions.find((item) => item.sentAt);
  if (!latest || latest.response) throw new HttpError(400, "This quote isn't waiting for an answer.");
  if (latest.validUntil && latest.validUntil < new Date().toISOString().slice(0, 10)) throw new HttpError(400, "This quote has expired. Ask us for an updated one in the conversation.");
  const response = input.response === "accepted" || input.response === "changes_requested" || input.response === "declined" ? input.response : null;
  if (!response) throw new HttpError(400, "Choose an answer.");
  const note = String(input.note ?? "").trim().slice(0, 2000);
  if (response === "changes_requested" && note.length < 3) throw new HttpError(400, "Tell us what you would like changed.");
  let signedName = "";
  let hash = "";
  const at = new Date().toISOString();
  if (response === "accepted") {
    signedName = String(input.signedName || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (signedName.length < 3 || !/\s/.test(signedName)) throw new HttpError(400, "Type your full name (first and last name) to sign.");
    hash = createHash("sha256").update(JSON.stringify({ ref: quote.ref, revision: latest.revision, items: latest.items, vatRate: latest.vatRate, total: latest.total, currency: quote.currency, signedName, at })).digest("hex");
  }
  await pgQuery(
    "UPDATE pcg_quote_revisions SET response = $2, response_note = $3, responded_at = $4, signed_name = $5, signed_ip = $6, signed_agent = $7, signature_hash = $8 WHERE id = $1",
    [latest.id, response, note, at, signedName, input.ip.slice(0, 60), input.agent.slice(0, 300), hash],
  );
  await pgQuery("UPDATE pcg_quotes SET status = $2, updated_at = NOW() WHERE id = $1", [id, response]);
  const words = { accepted: `accepted and signed ${quote.ref}`, changes_requested: `asked for changes to ${quote.ref}`, declined: `declined ${quote.ref}` }[response];
  if (quote.conversationId) {
    const { sendMessage } = await import("@/lib/portal/chat");
    const { getClientById } = await import("@/lib/clients/store");
    const client = await getClientById(clientId);
    if (client) await sendMessage(quote.conversationId, { side: "client", client }, { kind: "quote", body: `${input.clientName} ${words}${note ? ` — “${note.slice(0, 200)}”` : ""}`, meta: { quoteId: id, ref: quote.ref, revision: latest.revision, response, total: latest.total, currency: quote.currency, kind: quote.kind, title: quote.title }, origin: input.origin }).catch(() => undefined);
  }
  publishBoth(clientId, { type: "quote", quoteId: id });
  return getQuote(id, { clientId, forStaff: false });
}
