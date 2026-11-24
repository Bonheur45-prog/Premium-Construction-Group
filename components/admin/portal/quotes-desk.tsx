"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowSquareOut, CaretDown, Plus, Printer, Trash, X } from "@/components/icons";
import { ChangeOrderIcon, RevisionsIcon, SignOffIcon } from "@/components/icons/custom";
import { useLiveEvents } from "@/components/portal/live";
import { QUOTE_STATUS_STAFF, QuoteDocument, quoteMoney } from "@/components/portal/quote-document";
import type { QuoteDetail, QuoteItem, QuoteSummary } from "@/lib/portal/quotes";

/**
 * CMS → Quotes. Build a quote line by line (grouped in sections), see the totals as you type, send it
 * into the client's conversation, and follow every revision and answer — including the sign-off record.
 */
type ClientOption = { id: string; name: string; company: string; email: string };
type Company = { name: string; email: string; phone: string; address: string };

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: init.body ? { "Content-Type": "application/json" } : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

const blankItem = (section = ""): QuoteItem => ({ description: "", quantity: 1, unit: "", unitPrice: 0, section });
const UNITS = ["", "m²", "m³", "m", "kg", "t", "pcs", "lot", "day", "hr", "trip"];

export function QuotesDesk({ company, defaultVat, currency }: { company: Company; defaultVat: number; currency: string }) {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [openId, setOpenId] = useState("");
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => call<{ quotes: QuoteSummary[] }>("/api/admin/portal/quotes").then((data) => setQuotes(data.quotes)).catch((reason: Error) => setError(reason.message)), []);
  useEffect(() => {
    void load();
    void call<{ clients: ClientOption[] }>("/api/admin/clients").then((data) => setClients(data.clients)).catch(() => undefined);
    const params = new URLSearchParams(window.location.search);
    if (params.get("client")) setCreating(true);
    if (params.get("quote")) setOpenId(params.get("quote") || "");
  }, [load]);
  useLiveEvents((event) => { if (event.type === "quote" || event.type === "resync") void load(); });

  if (openId) return <QuoteEditor id={openId} company={company} onBack={() => { setOpenId(""); window.history.replaceState(null, "", "/admin/quotes"); void load(); }} />;

  const shown = (quotes || []).filter((quote) => !filter || quote.status === filter);
  const counts = (quotes || []).reduce<Record<string, number>>((all, quote) => ({ ...all, [quote.status]: (all[quote.status] || 0) + 1 }), {});
  return (
    <div className="qdesk">
      <div className="cmsl-intro">
        <p>Quotes and change orders for client accounts. Each one is sent into the client&apos;s conversation; they accept with a typed signature, ask for changes or decline. Every revision is kept.</p>
        <button type="button" className="cms-btn cms-btn--amber" onClick={() => setCreating(true)}><Plus size={16} weight="bold" /> New quote</button>
      </div>
      <div className="cms-toolbar">
        <div className="cms-segmented" role="group" aria-label="Show">
          {[["", "All"], ["draft", "Drafts"], ["sent", "Waiting"], ["changes_requested", "Changes asked"], ["accepted", "Accepted"], ["declined", "Declined"]].map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}{value && counts[value] ? <em className="cmsl-num">{counts[value]}</em> : null}</button>
          ))}
        </div>
      </div>
      {error && <p className="cms-alert cms-alert--error">{error}</p>}
      {quotes && shown.length > 0 && (
        <ul className="quote-cards">
          {shown.map((quote) => (
            <li key={quote.id}>
              <button type="button" className={`quote-card is-${quote.status}`} onClick={() => setOpenId(quote.id)}>
                <span className="quote-card__icon">{quote.kind === "change_order" ? <ChangeOrderIcon size={24} weight="duotone" /> : <SignOffIcon size={24} weight="duotone" />}</span>
                <span className="quote-card__main">
                  <small>{quote.ref}{quote.revision > 1 ? ` · rev. ${quote.revision}` : ""} · {quote.clientName}</small>
                  <strong>{quote.title}</strong>
                  <span className={`quote-status quote-status--${quote.status}`}>{QUOTE_STATUS_STAFF[quote.status]}</span>
                </span>
                <span className="quote-card__amount">{quoteMoney(quote.total, quote.currency)}<small>Updated {new Date(quote.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {quotes && !shown.length && <div className="cmsl-empty"><strong>{filter ? "Nothing here." : "No quotes yet."}</strong><p>Start one with “New quote”. Clients see it in their space once you send it.</p></div>}
      {!quotes && <div className="cms-skeleton" style={{ height: 240 }} />}
      {creating && <NewQuote clients={clients} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id); window.history.replaceState(null, "", `/admin/quotes?quote=${id}`); }} />}
      <p className="cms-muted qdesk__note">Prices are in {currency}; VAT defaults to {defaultVat}%. Change both under Features.</p>
    </div>
  );
}

function NewQuote({ clients, onClose, onCreated }: { clients: ClientOption[]; onClose: () => void; onCreated: (id: string) => void }) {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [clientId, setClientId] = useState(params.get("client") || "");
  const [kind, setKind] = useState<"quote" | "change_order">("quote");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await call<{ id: string }>("/api/admin/portal/quotes", { method: "POST", body: JSON.stringify({ clientId, kind, title, conversationId: params.get("conversation") || "" }) });
      onCreated(result.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't create it."); setBusy(false); }
  }
  return (
    <div className="portal-modal" role="dialog" aria-modal="true" aria-label="New quote" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="portal-modal__card" onSubmit={submit}>
        <header className="portal-modal__head"><h2>New quote</h2><button type="button" className="chat-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <label className="portal-field"><span>Client</span>
          <select value={clientId} onChange={(event) => setClientId(event.target.value)} required>
            <option value="">Choose a client account…</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` — ${client.company}` : ""}</option>)}
          </select>
        </label>
        <div className="qkind" role="radiogroup" aria-label="Type">
          <label className={kind === "quote" ? "is-on" : ""}><input type="radio" name="kind" checked={kind === "quote"} onChange={() => setKind("quote")} /><SignOffIcon size={22} weight="duotone" /><span><strong>Quote</strong><small>Price for new work</small></span></label>
          <label className={kind === "change_order" ? "is-on" : ""}><input type="radio" name="kind" checked={kind === "change_order"} onChange={() => setKind("change_order")} /><ChangeOrderIcon size={22} weight="duotone" /><span><strong>Change order</strong><small>Extra or changed work</small></span></label>
        </div>
        <label className="portal-field"><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Kicukiro villa — main works" required maxLength={140} /></label>
        {error && <p className="portal-alert portal-alert--error">{error}</p>}
        <footer className="portal-modal__foot">
          <button type="button" className="portal-btn portal-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="portal-btn portal-btn--primary" disabled={busy || !clientId || title.trim().length < 3}>{busy ? "Creating…" : "Create and add lines"}</button>
        </footer>
      </form>
    </div>
  );
}

function QuoteEditor({ id, company, onBack }: { id: string; company: Company; onBack: () => void }) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [draft, setDraft] = useState<{ title: string; items: QuoteItem[]; notes: string; vatRate: number; validUntil: string } | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState(false);

  const adopt = useCallback((next: QuoteDetail) => {
    setQuote(next);
    const latest = next.revisions[0];
    const working = { title: next.title, items: latest?.items.length ? latest.items : [blankItem()], notes: latest?.notes || "", vatRate: latest?.vatRate ?? 18, validUntil: latest?.validUntil || "" };
    setDraft(working);
    setSaved(JSON.stringify(working));
  }, []);
  useEffect(() => { void call<{ quote: QuoteDetail }>(`/api/admin/portal/quotes/${id}`).then((data) => adopt(data.quote)).catch((reason: Error) => setNotice({ tone: "error", text: reason.message })); }, [id, adopt]);
  useLiveEvents((event) => { if (event.type === "quote" && event.quoteId === id) void call<{ quote: QuoteDetail }>(`/api/admin/portal/quotes/${id}`).then((data) => { setQuote(data.quote); }); });

  const totals = useMemo(() => {
    if (!draft) return { subtotal: 0, vat: 0, total: 0 };
    const subtotal = Math.round(draft.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0));
    const vat = Math.round((subtotal * (Number(draft.vatRate) || 0)) / 100);
    return { subtotal, vat, total: subtotal + vat };
  }, [draft]);

  if (!quote || !draft) return notice ? <p className="cms-alert cms-alert--error">{notice.text}</p> : <div className="cms-skeleton" style={{ height: 420 }} />;
  const latest = quote.revisions[0];
  const closed = quote.status === "accepted" || quote.status === "withdrawn";
  const dirty = JSON.stringify(draft) !== saved;
  const sentAlready = Boolean(latest?.sentAt);
  const setItem = (index: number, patch: Partial<QuoteItem>) => setDraft({ ...draft, items: draft.items.map((item, current) => (current === index ? { ...item, ...patch } : item)) });
  const move = (index: number, by: -1 | 1) => { const items = [...draft.items]; const target = index + by; if (target < 0 || target >= items.length) return; [items[index], items[target]] = [items[target], items[index]]; setDraft({ ...draft, items }); };

  async function save(): Promise<boolean> {
    setBusy("save");
    try {
      const result = await call<{ quote: QuoteDetail }>(`/api/admin/portal/quotes/${id}`, { method: "PUT", body: JSON.stringify(draft) });
      adopt(result.quote);
      setNotice({ tone: "ok", text: sentAlready ? `Saved as revision ${result.quote.revisions[0].revision} (not sent yet).` : "Draft saved." });
      return true;
    } catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Couldn't save." }); return false; }
    finally { setBusy(""); }
  }
  async function send() {
    if (dirty && !(await save())) return;
    if (!window.confirm(`Send ${quote!.ref} to ${quote!.clientName}? It appears in their conversation and they can accept and sign it.`)) return;
    setBusy("send");
    try {
      const result = await call<{ quote: QuoteDetail }>(`/api/admin/portal/quotes/${id}`, { method: "POST", body: JSON.stringify({ action: "send" }) });
      adopt(result.quote);
      setNotice({ tone: "ok", text: `Sent to ${result.quote.clientName}. You'll see their answer here and in Messages.` });
    } catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Couldn't send." }); }
    finally { setBusy(""); }
  }
  async function withdraw() {
    if (!window.confirm("Withdraw this quote? The client will see it as withdrawn.")) return;
    const result = await call<{ quote: QuoteDetail }>(`/api/admin/portal/quotes/${id}`, { method: "POST", body: JSON.stringify({ action: "withdraw" }) }).catch((reason: Error) => { setNotice({ tone: "error", text: reason.message }); return null; });
    if (result) adopt(result.quote);
  }

  const working = { ...latest, items: draft.items.filter((item) => item.description.trim()), notes: draft.notes, vatRate: Number(draft.vatRate) || 0, ...totals, validUntil: draft.validUntil || null, revision: sentAlready ? latest.revision + 1 : latest.revision, sentAt: null, response: "" as const };
  const sections = [...new Set(draft.items.map((item) => item.section))];

  return (
    <div className="qedit">
      <div className="cmse-top">
        <button type="button" className="cms-link" onClick={onBack}><ArrowLeft size={14} /> All quotes</button>
        <div className="cms-row">
          <span className={`quote-status quote-status--${quote.status}`}>{QUOTE_STATUS_STAFF[quote.status]}</span>
          <a className="cms-btn cms-btn--ghost cms-btn--small" href={`/admin/print/quotes/${quote.id}`} target="_blank" rel="noreferrer"><Printer size={15} /> Print / PDF</a>
          {quote.conversationId && <a className="cms-btn cms-btn--ghost cms-btn--small" href={`/admin/messages/${quote.conversationId}`}>Conversation <ArrowSquareOut size={13} /></a>}
        </div>
      </div>
      <p className="qedit__ref">{quote.kind === "quote" ? "Quote" : "Change order"} {quote.ref} · {quote.clientName}{quote.clientCompany ? ` (${quote.clientCompany})` : ""}</p>
      {notice && <p className={`cms-alert cms-alert--${notice.tone}`} role="status">{notice.text}</p>}
      {latest?.response && (
        <div className={`qedit__answer is-${latest.response}`}>
          <strong>{latest.response === "accepted" ? `Accepted and signed by ${latest.signedName}` : latest.response === "declined" ? "Declined by the client" : "The client asked for changes"}</strong>
          <span>{latest.respondedAt ? new Date(latest.respondedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""} · revision {latest.revision}</span>
          {latest.responseNote && <p>“{latest.responseNote}”</p>}
          {latest.response === "accepted" && <small>Signed from {latest.signedFrom || "—"} · fingerprint {latest.signatureHash.slice(0, 16)}…</small>}
          {latest.response === "changes_requested" && <small>Edit the lines below and send — it goes out as revision {latest.revision + 1}.</small>}
        </div>
      )}

      {preview ? (
        <div className="qedit__preview">
          <QuoteDocument quote={{ ...quote, title: draft.title }} revision={working} company={company} />
        </div>
      ) : (
        <fieldset className="cmse-box qedit__lines" disabled={closed}>
          <legend><span>01</span>Lines</legend>
          <label className="cmsf cmsf--wide"><span className="cmsf-label"><span>Title</span></span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={140} /></label>
          <div className="qlines" role="table" aria-label="Lines">
            <div className="qlines__head" role="row"><span>Description</span><span>Qty</span><span>Unit</span><span>Unit price</span><span>Amount</span><span /></div>
            {sections.map((section) => (
              <div key={section || "main"} className="qlines__group">
                {(section || sections.length > 1) && (
                  <div className="qlines__section">
                    <input value={section} placeholder="Section name (e.g. Substructure)" onChange={(event) => setDraft({ ...draft, items: draft.items.map((item) => (item.section === section ? { ...item, section: event.target.value } : item)) })} />
                  </div>
                )}
                {draft.items.map((item, index) => item.section !== section ? null : (
                  <div className="qlines__row" role="row" key={index}>
                    <input aria-label="Description" value={item.description} placeholder="e.g. Reinforced concrete foundation, C25" onChange={(event) => setItem(index, { description: event.target.value })} />
                    <input aria-label="Quantity" type="number" min={0} step="any" value={item.quantity} onChange={(event) => setItem(index, { quantity: Number(event.target.value) })} />
                    <select aria-label="Unit" value={item.unit} onChange={(event) => setItem(index, { unit: event.target.value })}>{UNITS.map((unit) => <option key={unit} value={unit}>{unit || "—"}</option>)}</select>
                    <input aria-label="Unit price" type="number" min={0} step={1} value={item.unitPrice} onChange={(event) => setItem(index, { unitPrice: Number(event.target.value) })} />
                    <span className="qlines__amount">{Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toLocaleString("en-US")}</span>
                    <span className="qlines__tools">
                      <button type="button" className="cms-icon-btn" aria-label="Move up" onClick={() => move(index, -1)}>↑</button>
                      <button type="button" className="cms-icon-btn cms-icon-btn--danger" aria-label="Remove line" onClick={() => setDraft({ ...draft, items: draft.items.length > 1 ? draft.items.filter((_item, current) => current !== index) : [blankItem()] })}><Trash size={14} /></button>
                    </span>
                  </div>
                ))}
                <button type="button" className="cmsf-add" onClick={() => setDraft({ ...draft, items: [...draft.items, blankItem(section)] })}><Plus size={14} /> Add a line{section ? ` to ${section}` : ""}</button>
              </div>
            ))}
            <button type="button" className="cmsf-add" onClick={() => setDraft({ ...draft, items: [...draft.items, blankItem(`Section ${sections.length + 1}`)] })}><Plus size={14} /> Add a section</button>
          </div>
          <div className="qedit__foot">
            <label className="cmsf"><span className="cmsf-label"><span>VAT %</span></span><input type="number" min={0} max={50} step="0.5" value={draft.vatRate} onChange={(event) => setDraft({ ...draft, vatRate: Number(event.target.value) })} /></label>
            <label className="cmsf"><span className="cmsf-label"><span>Valid until</span></span><input type="date" value={draft.validUntil} onChange={(event) => setDraft({ ...draft, validUntil: event.target.value })} /></label>
            <dl className="qedit__totals">
              <div><dt>Subtotal</dt><dd>{quoteMoney(totals.subtotal, quote.currency)}</dd></div>
              <div><dt>VAT</dt><dd>{quoteMoney(totals.vat, quote.currency)}</dd></div>
              <div className="is-total"><dt>Total</dt><dd>{quoteMoney(totals.total, quote.currency)}</dd></div>
            </dl>
          </div>
          <label className="cmsf cmsf--wide"><span className="cmsf-label"><span>Notes & conditions</span></span><textarea rows={4} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Payment schedule, what's excluded, validity, assumptions…" /></label>
        </fieldset>
      )}

      <div className="qedit__actions">
        <button type="button" className="cms-btn cms-btn--ghost" onClick={() => setPreview((value) => !value)}><CaretDown size={14} /> {preview ? "Back to editing" : "Preview as the client sees it"}</button>
        <span className="qedit__spacer" />
        {!closed && quote.status !== "draft" && <button type="button" className="cms-link cms-link--danger" onClick={() => void withdraw()}>Withdraw</button>}
        {!closed && <button type="button" className="cms-btn cms-btn--ghost" disabled={!dirty || Boolean(busy)} onClick={() => void save()}>{busy === "save" ? "Saving…" : "Save"}</button>}
        {!closed && <button type="button" className="cms-btn cms-btn--primary" disabled={Boolean(busy) || (sentAlready && !dirty) || !draft.items.some((item) => item.description.trim())} title={sentAlready && !dirty ? "Change something first — this version was already sent." : undefined} onClick={() => void send()}>{busy === "send" ? "Sending…" : sentAlready || latest.revision > 1 ? `Send revision ${sentAlready ? latest.revision + 1 : latest.revision}` : "Send to client"}</button>}
      </div>

      {quote.revisions.some((item) => item.sentAt) && (
        <section className="cmse-box qedit__history">
          <p className="cms-eyebrow"><RevisionsIcon size={15} /> History</p>
          <ol>
            {quote.revisions.filter((item) => item.sentAt).map((item) => (
              <li key={item.id}>
                <strong>Revision {item.revision} · {quoteMoney(item.total, quote.currency)}</strong>
                <span>Sent {new Date(item.sentAt!).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} by {item.sentBy || "the team"}{item.response ? ` · ${item.response === "changes_requested" ? "changes asked" : item.response}${item.respondedAt ? ` ${new Date(item.respondedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}` : " · no answer yet"}</span>
                {item.responseNote && <em>“{item.responseNote}”</em>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
