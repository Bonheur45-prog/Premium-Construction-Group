"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ChatsCircle, CheckCircle, PencilLine, Printer, X, XCircle } from "@/components/icons";
import { ChangeOrderIcon, RevisionsIcon, SignOffIcon } from "@/components/icons/custom";
import { useLiveEvents } from "@/components/portal/live";
import { QUOTE_STATUS, QuoteDocument, calendarDate, quoteMoney } from "@/components/portal/quote-document";
import type { QuoteDetail, QuoteSummary } from "@/lib/portal/quotes";

type Company = { name: string; email: string; phone: string; address: string };

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: init.body ? { "Content-Type": "application/json" } : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

export function QuotesList() {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const load = useCallback(() => call<{ quotes: QuoteSummary[] }>("/api/portal/quotes").then((data) => setQuotes(data.quotes)).catch(() => setQuotes([])), []);
  useEffect(() => { void load(); }, [load]);
  useLiveEvents((event) => { if (event.type === "quote" || event.type === "resync") void load(); });
  const waiting = (quotes || []).filter((quote) => quote.status === "sent");
  return (
    <div className="ps-page">
      <header className="ps-page__head">
        <p className="portal-eyebrow">Quotes & change orders</p>
        <h1>Prices, <em>agreed clearly.</em></h1>
        <p className="portal-muted">Every version we send is kept, so you can always see how a price changed. Accept with your signature, or ask for changes.</p>
      </header>
      {waiting.length > 0 && <p className="portal-callout portal-callout--amber"><SignOffIcon size={20} weight="duotone" /> {waiting.length === 1 ? "One quote is" : `${waiting.length} quotes are`} waiting for your answer.</p>}
      {quotes && quotes.length > 0 && (
        <ul className="quote-cards">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <Link href={`/account/quotes/${quote.id}`} className={`quote-card is-${quote.status}`}>
                <span className="quote-card__icon">{quote.kind === "change_order" ? <ChangeOrderIcon size={26} weight="duotone" /> : <SignOffIcon size={26} weight="duotone" />}</span>
                <span className="quote-card__main">
                  <small>{quote.kind === "quote" ? "Quote" : "Change order"} · {quote.ref}{quote.revision > 1 ? ` · revision ${quote.revision}` : ""}</small>
                  <strong>{quote.title}</strong>
                  <span className={`quote-status quote-status--${quote.status}`}>{QUOTE_STATUS[quote.status]}</span>
                </span>
                <span className="quote-card__amount">{quoteMoney(quote.total, quote.currency)}{quote.validUntil && quote.status === "sent" && <small>Valid until {calendarDate(quote.validUntil, { day: "numeric", month: "short" })}</small>}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {quotes && !quotes.length && (
        <div className="ps-empty"><SignOffIcon size={44} weight="duotone" /><strong>No quotes yet.</strong><p>When we prepare a quote for your project, it appears here and in your messages.</p></div>
      )}
      {!quotes && <div className="chat-skeleton" style={{ height: 220 }} />}
    </div>
  );
}

export function QuoteView({ id, company, clientName }: { id: string; company: Company; clientName: string }) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<"" | "accept" | "changes" | "decline">("");
  const load = useCallback(() => call<{ quote: QuoteDetail }>(`/api/portal/quotes/${id}`).then((data) => { setQuote(data.quote); setError(""); }).catch((reason: Error) => setError(reason.message)), [id]);
  useEffect(() => { void load(); }, [load]);
  useLiveEvents((event) => { if ((event.type === "quote" && event.quoteId === id) || event.type === "resync") void load(); });

  if (error && !quote) return <div className="ps-page"><p className="portal-alert portal-alert--error">{error}</p><Link className="portal-back" href="/account/quotes">← All quotes</Link></div>;
  if (!quote) return <div className="ps-page"><div className="chat-skeleton" style={{ height: 480 }} /></div>;
  const revision = quote.revisions[selected] || quote.revisions[0];
  const latest = quote.revisions[0];
  const answerable = quote.status === "sent" && selected === 0 && !latest.response;
  const expired = Boolean(latest.validUntil && latest.validUntil < new Date().toISOString().slice(0, 10));

  return (
    <div className="ps-page quote-page">
      <div className="quote-page__top">
        <Link className="portal-back" href="/account/quotes"><ArrowLeft size={16} /> All quotes</Link>
        <div className="quote-page__tools">
          {quote.conversationId && <Link className="portal-btn portal-btn--ghost portal-btn--sm" href={`/account/messages/${quote.conversationId}`}><ChatsCircle size={16} /> Discuss</Link>}
          <a className="portal-btn portal-btn--ghost portal-btn--sm" href={`/account/print/quotes/${quote.id}${selected ? `?revision=${revision.revision}` : ""}`} target="_blank" rel="noreferrer"><Printer size={16} /> Print / save as PDF</a>
        </div>
      </div>
      <div className="quote-layout">
        <div>
          <QuoteDocument quote={quote} revision={revision} company={company} />
        </div>
        <aside className="quote-side">
          <section className={`quote-answer is-${quote.status}`}>
            <p className="portal-eyebrow">Status</p>
            <strong className={`quote-status quote-status--${quote.status}`}>{QUOTE_STATUS[quote.status]}</strong>
            {answerable && !expired && (
              <>
                <p className="portal-muted">Total {quoteMoney(latest.total, quote.currency)}{latest.validUntil ? `, valid until ${calendarDate(latest.validUntil, { day: "numeric", month: "long" })}` : ""}.</p>
                <button type="button" className="portal-btn portal-btn--primary portal-btn--block" onClick={() => setMode("accept")}><SignOffIcon size={18} /> Accept & sign</button>
                <button type="button" className="portal-btn portal-btn--ghost portal-btn--block" onClick={() => setMode("changes")}><PencilLine size={17} /> Ask for changes</button>
                <button type="button" className="portal-link portal-link--muted" onClick={() => setMode("decline")}>Decline</button>
              </>
            )}
            {answerable && expired && <p className="portal-muted">This quote has expired. Ask us for an updated version in your messages.</p>}
            {latest.response === "changes_requested" && <p className="portal-muted">You asked: “{latest.responseNote}”. We&apos;ll send a revised version.</p>}
            {latest.response === "declined" && latest.responseNote && <p className="portal-muted">Your note: “{latest.responseNote}”</p>}
            {quote.status === "accepted" && <p className="portal-muted"><CheckCircle size={16} weight="fill" /> Signed by {latest.signedName}. A copy is always available here.</p>}
          </section>
          {quote.revisions.length > 1 && (
            <section className="quote-history">
              <p className="portal-eyebrow"><RevisionsIcon size={15} /> Versions</p>
              <ol>
                {quote.revisions.map((item, index) => {
                  const previous = quote.revisions[index + 1];
                  const change = previous ? item.total - previous.total : 0;
                  return (
                    <li key={item.id}>
                      <button type="button" className={index === selected ? "is-active" : ""} onClick={() => setSelected(index)}>
                        <span>Revision {item.revision}{index === 0 ? " · latest" : ""}</span>
                        <strong>{quoteMoney(item.total, quote.currency)}</strong>
                        {previous && change !== 0 && <em className={change < 0 ? "is-down" : "is-up"}>{change < 0 ? "−" : "+"}{Math.abs(change).toLocaleString("en-US")}</em>}
                        <small>{item.sentAt ? new Date(item.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}{item.response ? ` · ${item.response === "changes_requested" ? "changes asked" : item.response}` : ""}</small>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </aside>
      </div>
      {mode && <AnswerDialog mode={mode} quote={quote} clientName={clientName} onClose={() => setMode("")} onDone={(next) => { setQuote(next); setSelected(0); setMode(""); }} />}
    </div>
  );
}

function AnswerDialog({ mode, quote, clientName, onClose, onDone }: { mode: "accept" | "changes" | "decline"; quote: QuoteDetail; clientName: string; onClose: () => void; onDone: (quote: QuoteDetail) => void }) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = quote.revisions[0];
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = mode === "accept" ? "accepted" : mode === "changes" ? "changes_requested" : "declined";
      const result = await call<{ quote: QuoteDetail }>(`/api/portal/quotes/${quote.id}/respond`, { method: "POST", body: JSON.stringify({ response, note, signedName: name }) });
      onDone(result.quote);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your answer couldn't be saved."); setBusy(false); }
  }
  return (
    <div className="portal-modal" role="dialog" aria-modal="true" aria-label="Answer" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="portal-modal__card" onSubmit={submit}>
        <header className="portal-modal__head">
          <h2>{mode === "accept" ? "Accept and sign" : mode === "changes" ? "Ask for changes" : "Decline this quote"}</h2>
          <button type="button" className="chat-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        {mode === "accept" ? (
          <>
            <div className="sign-summary">
              <span>{quote.ref}{latest.revision > 1 ? ` · revision ${latest.revision}` : ""}</span>
              <strong>{quote.title}</strong>
              <em>{quoteMoney(latest.total, quote.currency)} <small>incl. VAT</small></em>
            </div>
            <label className="portal-field"><span>Type your full name to sign</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder={clientName} autoComplete="name" required className="sign-input" />
            </label>
            {name.trim() && <p className="sign-preview" aria-hidden="true">{name}</p>}
            <label className="sign-agree"><input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} /> <span>I accept this {quote.kind === "quote" ? "quote" : "change order"} as shown, including the price and conditions. I understand this is recorded with today&apos;s date and time.</span></label>
          </>
        ) : (
          <label className="portal-field"><span>{mode === "changes" ? "What would you like changed?" : "Reason (optional)"}</span>
            <textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} required={mode === "changes"} placeholder={mode === "changes" ? "e.g. Please price the roof in clay tiles instead of iron sheets, and split the external works." : "Anything you'd like us to know."} />
          </label>
        )}
        {error && <p className="portal-alert portal-alert--error">{error}</p>}
        <footer className="portal-modal__foot">
          <button type="button" className="portal-btn portal-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className={`portal-btn ${mode === "decline" ? "portal-btn--danger" : "portal-btn--primary"}`} disabled={busy || (mode === "accept" && (!agree || name.trim().split(/\s+/).length < 2)) || (mode === "changes" && note.trim().length < 3)}>
            {busy ? "Saving…" : mode === "accept" ? <><SignOffIcon size={18} /> Sign and accept</> : mode === "changes" ? "Send request" : <><XCircle size={17} /> Decline</>}
          </button>
        </footer>
      </form>
    </div>
  );
}
