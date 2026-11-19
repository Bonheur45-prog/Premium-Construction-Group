"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cmsFetch, formatDate, timeAgo } from "@/components/admin/format";

type Status = "new" | "read" | "replied" | "archived" | "converted";
export type EnquiryRecord = {
  id: string; name: string; email: string; phone: string; enquiryType: "personal" | "company"; company: string;
  projectType: string; projectTypeLabel: string; message: string; status: Status; requestId: string;
  staffNotified: boolean; senderNotified: boolean; createdAt: string; updatedAt: string;
};
type ListResponse = { items: EnquiryRecord[]; counts: Partial<Record<Status, number>> };

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "open", label: "Open" },
  { id: "replied", label: "Replied" },
  { id: "converted", label: "Became requests" },
  { id: "archived", label: "Archived" },
  { id: "", label: "All" },
];

export const STATUS_LABEL: Record<Status, string> = { new: "New", read: "Read", replied: "Replied", archived: "Archived", converted: "Request opened" };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function EnquiriesInbox({ onConvert }: { onConvert?: (enquiry: EnquiryRecord) => Promise<string | void> }) {
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (query.trim()) params.set("q", query.trim());
      setData(await cmsFetch<ListResponse>(`/api/admin/enquiries?${params}`));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enquiries could not be loaded.");
    }
  }, [filter, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const selected = useMemo(() => data?.items.find((item) => item.id === selectedId) || null, [data, selectedId]);

  function replaceItem(enquiry: EnquiryRecord) {
    setData((current) => current && { ...current, items: current.items.map((item) => (item.id === enquiry.id ? enquiry : item)) });
  }

  async function open(enquiry: EnquiryRecord) {
    setSelectedId(enquiry.id);
    setReply("");
    setNotice(null);
    if (enquiry.status === "new") {
      try {
        const result = await cmsFetch<{ enquiry: EnquiryRecord }>(`/api/admin/enquiries/${enquiry.id}`, { method: "PATCH", body: JSON.stringify({ status: "read" }) });
        replaceItem(result.enquiry);
      } catch { /* stays "new" */ }
    }
  }

  async function setStatus(status: Status) {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await cmsFetch<{ enquiry: EnquiryRecord }>(`/api/admin/enquiries/${selected.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      replaceItem(result.enquiry);
      setNotice({ tone: "ok", text: status === "archived" ? "Archived." : "Updated." });
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not update." });
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await cmsFetch<{ enquiry: EnquiryRecord }>(`/api/admin/enquiries/${selected.id}`, { method: "POST", body: JSON.stringify({ message: reply }) });
      replaceItem(result.enquiry);
      setReply("");
      setNotice({ tone: "ok", text: `Reply emailed to ${selected.email}.` });
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "The reply could not be sent." });
    } finally {
      setBusy(false);
    }
  }

  async function convert() {
    if (!selected || !onConvert) return;
    setBusy(true);
    setNotice(null);
    try {
      const ref = await onConvert(selected);
      await load();
      setNotice({ tone: "ok", text: ref ? `Request ${ref} opened. The client can follow it in their portal.` : "Request opened." });
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "The request could not be opened." });
    } finally {
      setBusy(false);
    }
  }

  const counts = data?.counts || {};
  const openCount = (counts.new || 0) + (counts.read || 0);

  return (
    <div className="cms-inbox">
      <div className="cms-toolbar">
        <div className="cms-segmented" role="group" aria-label="Filter enquiries">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" className={filter === item.id ? "is-active" : ""} onClick={() => { setFilter(item.id); setSelectedId(null); }}>
              {item.label}{item.id === "open" && openCount ? <em className="cms-count">{openCount}</em> : null}
            </button>
          ))}
        </div>
        <input className="cms-search" type="search" placeholder="Search name, email, company or message" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {error && <p className="cms-alert cms-alert--error">{error}</p>}

      <div className={`cms-inbox__layout${selected ? " has-selection" : ""}`}>
        <ul className="cms-inbox__list" aria-label="Enquiries">
          {data?.items.map((item) => (
            <li key={item.id}>
              <button type="button" className={`${item.id === selectedId ? "is-selected " : ""}${item.status === "new" ? "is-unread" : ""}`} onClick={() => void open(item)}>
                <span className="cms-inbox__avatar" aria-hidden="true">{initials(item.name)}</span>
                <span className="cms-inbox__summary">
                  <span className="cms-inbox__line"><strong>{item.name}</strong><time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time></span>
                  <span className="cms-inbox__meta">{item.projectTypeLabel}{item.company ? ` · ${item.company}` : ""}</span>
                  <span className="cms-inbox__preview">{item.message}</span>
                </span>
                <span className={`cms-pill cms-pill--${item.status}`}>{STATUS_LABEL[item.status]}</span>
              </button>
            </li>
          ))}
          {data && !data.items.length && <li className="cms-empty">{filter === "open" ? "No open enquiries. New messages from the contact form land here." : "Nothing here."}</li>}
        </ul>

        {selected ? (
          <article className="cms-inbox__detail cms-card cms-card--marks">
            <header className="cms-inbox__detail-head">
              <div>
                <p className="cms-eyebrow">{selected.projectTypeLabel} · {formatDate(selected.createdAt, true)}</p>
                <h2>{selected.name}</h2>
                <p className="cms-muted">{selected.enquiryType === "company" ? `On behalf of ${selected.company}` : "Personal enquiry"}</p>
              </div>
              <button type="button" className="cms-modal__close cms-inbox__back" onClick={() => setSelectedId(null)} aria-label="Close">×</button>
            </header>
            <div className="cms-inbox__contact">
              <a className="cms-btn cms-btn--ghost cms-btn--small" href={`mailto:${selected.email}`}>✉ {selected.email}</a>
              {selected.phone && <a className="cms-btn cms-btn--ghost cms-btn--small" href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`}>☏ {selected.phone}</a>}
              {selected.phone && <a className="cms-btn cms-btn--ghost cms-btn--small" href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
            </div>
            <blockquote className="cms-inbox__message">{selected.message}</blockquote>
            {!selected.staffNotified && <p className="cms-hint">The notification email for this enquiry wasn&apos;t delivered. It is saved here safely.</p>}

            <div className="cms-inbox__reply">
              <label className="cms-field">
                <span>Reply by email</span>
                <textarea rows={5} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Write to ${selected.name.split(" ")[0]}… Their original message is included automatically.`} maxLength={8000} />
              </label>
              <div className="cms-row">
                <button type="button" className="cms-btn cms-btn--primary" disabled={busy || !reply.trim()} onClick={() => void sendReply()}>{busy ? "Working…" : "Send reply"}</button>
                {onConvert && selected.status !== "converted" && <button type="button" className="cms-btn cms-btn--amber" disabled={busy} onClick={() => void convert()}>Open as client request</button>}
                {selected.status !== "archived"
                  ? <button type="button" className="cms-btn cms-btn--ghost" disabled={busy} onClick={() => void setStatus("archived")}>Archive</button>
                  : <button type="button" className="cms-btn cms-btn--ghost" disabled={busy} onClick={() => void setStatus("read")}>Move back to open</button>}
              </div>
              {notice && <p className={`cms-alert cms-alert--${notice.tone}`} role="status">{notice.text}</p>}
            </div>
          </article>
        ) : (
          <div className="cms-inbox__placeholder">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M3.5 6.5h17v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" /><path d="m3.5 6.5 8.5 7 8.5-7" /></svg>
            <p>Select an enquiry to read it, reply by email, or open it as a client request.</p>
          </div>
        )}
      </div>
    </div>
  );
}
