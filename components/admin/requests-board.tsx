"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { cmsFetch, timeAgo } from "@/components/admin/format";
import { FileDrop } from "@/components/portal/file-drop";
import { DocumentsPanel, Timeline } from "@/components/portal/request-view";
import { StageTracker } from "@/components/portal/stage-tracker";
import {
  ALL_REQUEST_STATUSES, CATEGORY_LABEL, FILE_CATEGORIES, PRIORITIES, REQUEST_CATEGORIES, REQUEST_STATUS_FLOW, STATUS_LABEL,
  type PortalRequestDetail, type PortalRequestSummary, type RequestPriority, type RequestStatus,
} from "@/lib/portal/constants";

type Row = PortalRequestSummary & { contactName: string; contactEmail: string; company: string; priority: RequestPriority; assignedTo: string; clientId: string | null; source: string };
type ListResponse = { requests: Row[]; staff: string[]; counts: Partial<Record<RequestStatus, number>> };

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "waiting", label: "Awaiting our reply" },
  { id: "completed", label: "Completed" },
  { id: "closed", label: "Closed" },
  { id: "", label: "All" },
];

function PriorityDot({ priority }: { priority: RequestPriority }) {
  if (priority === "normal") return null;
  return <span className={`cms-priority cms-priority--${priority}`} title={`${priority} priority`}>{priority}</span>;
}

function RequestCard({ row, onOpen }: { row: Row; onOpen: () => void }) {
  return (
    <button type="button" className={`cms-request-card${row.unread ? " has-unread" : ""}`} onClick={onOpen}>
      <span className="cms-request-card__top"><span className="cms-ref">{row.ref}</span><PriorityDot priority={row.priority} />{row.unread > 0 && <span className="cms-count">{row.unread}</span>}</span>
      <strong>{row.title}</strong>
      <span className="cms-request-card__who">{row.contactName}{row.company ? ` · ${row.company}` : ""}</span>
      <span className="cms-request-card__foot">
        <span>{CATEGORY_LABEL[row.category] || row.category}</span>
        <span>{row.assignedTo ? `◎ ${row.assignedTo}` : "Unassigned"} · {timeAgo(row.updatedAt)}</span>
      </span>
    </button>
  );
}

function NewRequestDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (ref: string) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    try {
      const result = await cmsFetch<{ ref: string }>("/api/admin/requests", { method: "POST", body: JSON.stringify({ ...data, notify: data.notify === "on" }) });
      onCreated(result.ref);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open the request.");
      setBusy(false);
    }
  }
  return (
    <div className="cms-modal" role="dialog" aria-modal="true" aria-label="Open a request" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="cms-modal__panel cms-form" onSubmit={submit}>
        <header className="cms-modal__head"><div><p className="cms-eyebrow">New request</p><h2>Open a request for a client</h2></div><button type="button" className="cms-modal__close" onClick={onClose} aria-label="Close">×</button></header>
        <div className="cms-form-grid">
          <label className="cms-field"><span>Client name</span><input name="contactName" required maxLength={120} /></label>
          <label className="cms-field"><span>Client email</span><input name="contactEmail" type="email" required maxLength={254} /></label>
          <label className="cms-field"><span>Phone</span><input name="contactPhone" maxLength={30} /></label>
          <label className="cms-field"><span>Company</span><input name="company" maxLength={160} /></label>
          <label className="cms-field"><span>Type</span><select name="category" required defaultValue="">{[<option key="" value="" disabled>Choose…</option>, ...REQUEST_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)]}</select></label>
          <label className="cms-field"><span>Location</span><input name="location" maxLength={160} /></label>
          <label className="cms-field cms-field--wide"><span>Title</span><input name="title" required maxLength={160} /></label>
          <label className="cms-field cms-field--wide"><span>Description</span><textarea name="description" rows={4} maxLength={8000} /></label>
        </div>
        <label className="cms-switch"><input type="checkbox" name="notify" defaultChecked /><span>Email the client (links to their portal, or invites them to create an account)</span></label>
        {error && <p className="cms-alert cms-alert--error">{error}</p>}
        <div className="cms-row"><button className="cms-btn cms-btn--primary" type="submit" disabled={busy}>{busy ? "Opening…" : "Open request"}</button></div>
      </form>
    </div>
  );
}

function RequestDetail({ id, staff, onBack, onChanged }: { id: string; staff: string[]; onBack: () => void; onChanged: () => void }) {
  const [request, setRequest] = useState<PortalRequestDetail | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"message" | "note">("message");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("quote");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [statusDraft, setStatusDraft] = useState<{ to: RequestStatus; note: string; notify: boolean } | null>(null);

  const load = useCallback(async () => {
    try { setRequest((await cmsFetch<{ request: PortalRequestDetail }>(`/api/admin/requests/${id}`)).request); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The request could not be loaded."); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function patch(changes: Record<string, unknown>, success: string) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await cmsFetch<{ request: PortalRequestDetail; clientNotified: boolean }>(`/api/admin/requests/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
      setRequest(result.request);
      setNotice({ tone: "ok", text: changes.status && changes.notifyClient !== false ? `${success} ${result.clientNotified ? "The client was emailed." : "The client will see it in their portal (email not sent)."}` : success });
      onChanged();
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  async function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() && !files.length) return;
    const form = new FormData();
    form.set("kind", mode);
    form.set("body", body);
    form.set("category", category);
    files.forEach((file) => form.append("file", file));
    setBusy(true);
    setNotice(null);
    try {
      const result = await cmsFetch<{ request: PortalRequestDetail; clientNotified: boolean }>(`/api/admin/requests/${id}/posts`, { method: "POST", body: form });
      setRequest(result.request);
      setBody("");
      setFiles([]);
      setNotice({ tone: "ok", text: mode === "note" ? "Internal note added (the client can't see it)." : result.clientNotified ? "Sent. The client was emailed." : "Sent. The client will see it in their portal." });
      onChanged();
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not send." });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="cms-alert cms-alert--error">{error}</p>;
  if (!request) return <div className="cms-skeleton" style={{ height: 300 }} />;

  return (
    <div className="cms-request">
      <div className="cms-project-editor__bar">
        <button type="button" className="cms-link" onClick={onBack}>← All requests</button>
        <span className="cms-muted">{request.source === "portal" ? "Opened in the client portal" : request.source === "enquiry" ? "Opened from a website enquiry" : "Opened by the team"} · {timeAgo(request.createdAt)}</span>
      </div>

      <header className="cms-request__head">
        <div>
          <p className="cms-eyebrow">{request.ref} · {CATEGORY_LABEL[request.category] || request.category}{request.location ? ` · ${request.location}` : ""}</p>
          <h2>{request.title}</h2>
          <p className="cms-muted">{request.contactName} · <a href={`mailto:${request.contactEmail}`}>{request.contactEmail}</a>{request.contactPhone ? <> · <a href={`tel:${request.contactPhone.replace(/[^\d+]/g, "")}`}>{request.contactPhone}</a></> : null}{request.company ? ` · ${request.company}` : ""}</p>
          {!request.clientId && <p className="cms-hint">No client account is linked yet. They&apos;ll see this request once they sign up and confirm {request.contactEmail}.</p>}
        </div>
      </header>

      <section className="cms-card cms-request__stage">
        <StageTracker status={request.status} />
        <div className="cms-request__stage-actions">
          <span className="cms-muted">Move to:</span>
          {ALL_REQUEST_STATUSES.filter((status) => status.id !== request.status).map((status) => (
            <button key={status.id} type="button" className={`cms-btn cms-btn--small ${REQUEST_STATUS_FLOW.some((s) => s.id === status.id) ? "cms-btn--ghost" : "cms-btn--ghost cms-btn--muted"}`} onClick={() => setStatusDraft({ to: status.id, note: "", notify: true })}>{status.label}</button>
          ))}
        </div>
        {statusDraft && (
          <div className="cms-status-draft">
            <label className="cms-field"><span>Note to the client about “{STATUS_LABEL[statusDraft.to]}” (optional)</span><textarea rows={2} maxLength={4000} value={statusDraft.note} onChange={(event) => setStatusDraft({ ...statusDraft, note: event.target.value })} placeholder="e.g. We've visited the site and are preparing your quote." /></label>
            <label className="cms-switch"><input type="checkbox" checked={statusDraft.notify} onChange={(event) => setStatusDraft({ ...statusDraft, notify: event.target.checked })} /><span>Email the client about this change</span></label>
            <div className="cms-row">
              <button type="button" className="cms-btn cms-btn--primary" disabled={busy} onClick={() => { void patch({ status: statusDraft.to, note: statusDraft.note, notifyClient: statusDraft.notify }, `Moved to ${STATUS_LABEL[statusDraft.to]}.`); setStatusDraft(null); }}>Move to {STATUS_LABEL[statusDraft.to]}</button>
              <button type="button" className="cms-btn cms-btn--ghost" onClick={() => setStatusDraft(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>
      {notice && <p className={`cms-alert cms-alert--${notice.tone}`} role="status">{notice.text}</p>}

      <div className="cms-request__grid">
        <section className="cms-card portal cms-request__conversation">
          <details className="portal-brief" open={request.events.length < 4}>
            <summary>Original brief</summary>
            <p>{request.description || "—"}</p>
            <dl>{request.budget && <div><dt>Budget</dt><dd>{request.budget}</dd></div>}{request.timeline && <div><dt>Timing</dt><dd>{request.timeline}</dd></div>}</dl>
          </details>
          <Timeline request={request} viewer="staff" />
          <form className="composer" onSubmit={post}>
            <div className="cms-segmented" role="group" aria-label="Message type">
              <button type="button" className={mode === "message" ? "is-active" : ""} onClick={() => setMode("message")}>Message the client</button>
              <button type="button" className={mode === "note" ? "is-active" : ""} onClick={() => setMode("note")}>Internal note</button>
            </div>
            <textarea rows={4} maxLength={8000} value={body} onChange={(event) => setBody(event.target.value)} placeholder={mode === "note" ? "Only your team can see this…" : `Write to ${request.contactName.split(" ")[0]}…`} className={mode === "note" ? "is-note" : ""} />
            <FileDrop files={files} onChange={setFiles} compact />
            <div className="composer__bar">
              {files.length > 0 && <label className="composer__category">Files are<select value={category} onChange={(event) => setCategory(event.target.value)}>{FILE_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label.toLowerCase()}</option>)}</select></label>}
              <button className={`cms-btn ${mode === "note" ? "cms-btn--amber" : "cms-btn--primary"}`} type="submit" disabled={busy || (!body.trim() && !files.length)}>{busy ? "Sending…" : mode === "note" ? "Add note" : "Send to client"}</button>
            </div>
          </form>
        </section>

        <div className="cms-request__side">
          <section className="cms-card">
            <p className="cms-eyebrow">Management</p>
            <label className="cms-field"><span>Assigned to</span>
              <select value={request.assignedTo} onChange={(event) => void patch({ assignedTo: event.target.value }, event.target.value ? `Assigned to ${event.target.value}.` : "Unassigned.")}>
                <option value="">Unassigned</option>
                {staff.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="cms-field"><span>Priority</span>
              <select value={request.priority} onChange={(event) => void patch({ priority: event.target.value }, "Priority updated.")}>
                {PRIORITIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <ProgressControl value={request.progress} onSave={(progress, note) => void patch({ progress, note }, note ? "Progress shared with the client." : "Progress saved.")} />
          </section>
          <div className="portal"><DocumentsPanel files={request.files} /></div>
        </div>
      </div>
    </div>
  );
}

function ProgressControl({ value, onSave }: { value: number; onSave: (value: number, note: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [note, setNote] = useState("");
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="cms-progress-control">
      <label className="cms-field"><span>Build progress · {draft}%</span><input type="range" min={0} max={100} step={5} value={draft} onChange={(event) => setDraft(Number(event.target.value))} /></label>
      {draft !== value && (
        <>
          <textarea rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional update for the client, e.g. Roof structure complete." />
          <button type="button" className="cms-btn cms-btn--small cms-btn--primary" onClick={() => { onSave(draft, note); setNote(""); }}>Save progress</button>
        </>
      )}
    </div>
  );
}

export function RequestsBoard() {
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("open");
    if (ref) setOpenId(ref);
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (query.trim()) params.set("q", query.trim());
      setData(await cmsFetch<ListResponse>(`/api/admin/requests?${params}`));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Requests could not be loaded.");
    }
  }, [filter, query]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const columns = useMemo(() => {
    const statuses = [...REQUEST_STATUS_FLOW.map((s) => s.id), "on_hold", "closed"] as RequestStatus[];
    return statuses.map((status) => ({ status, rows: (data?.requests || []).filter((row) => row.status === status) })).filter((column) => column.rows.length || REQUEST_STATUS_FLOW.some((s) => s.id === column.status));
  }, [data]);

  if (openId) return <RequestDetail id={openId} staff={data?.staff || []} onBack={() => { setOpenId(null); window.history.replaceState(null, "", "/admin/requests"); void load(); }} onChanged={() => void load()} />;

  return (
    <div className="cms-requests">
      <div className="cms-toolbar">
        <div className="cms-segmented" role="group" aria-label="Filter requests">
          {FILTERS.map((item) => <button key={item.id} type="button" className={filter === item.id ? "is-active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </div>
        <input className="cms-search" type="search" placeholder="Search ref, title, client, location" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="cms-segmented" role="group" aria-label="View">
          <button type="button" className={view === "board" ? "is-active" : ""} onClick={() => setView("board")}>Pipeline</button>
          <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")}>List</button>
        </div>
        <button type="button" className="cms-btn cms-btn--amber" onClick={() => setCreating(true)}>+ New request</button>
      </div>
      {error && <p className="cms-alert cms-alert--error">{error}</p>}

      {data && view === "board" && (
        <div className="cms-pipeline">
          {columns.map((column, index) => (
            <section key={column.status} className="cms-pipeline__column">
              <header><span>{String(index + 1).padStart(2, "0")}</span>{STATUS_LABEL[column.status]}<em>{column.rows.length}</em></header>
              <div className="cms-pipeline__cards">
                {column.rows.map((row) => <RequestCard key={row.id} row={row} onOpen={() => setOpenId(row.id)} />)}
                {!column.rows.length && <p className="cms-pipeline__empty">—</p>}
              </div>
            </section>
          ))}
        </div>
      )}

      {data && view === "list" && (
        <table className="cms-table">
          <thead><tr><th>Ref</th><th>Request</th><th>Client</th><th>Stage</th><th>Assigned</th><th>Updated</th></tr></thead>
          <tbody>
            {data.requests.map((row) => (
              <tr key={row.id} onClick={() => setOpenId(row.id)} className={row.unread ? "has-unread" : ""}>
                <td className="cms-ref">{row.ref}</td>
                <td><strong>{row.title}</strong> <PriorityDot priority={row.priority} />{row.unread > 0 && <span className="cms-count">{row.unread}</span>}</td>
                <td>{row.contactName}<small>{row.company}</small></td>
                <td><span className={`cms-pill cms-pill--stage-${row.status}`}>{STATUS_LABEL[row.status]}</span></td>
                <td>{row.assignedTo || "—"}</td>
                <td>{timeAgo(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && !data.requests.length && <p className="cms-empty">{filter === "waiting" ? "No client is waiting for a reply. Nice work." : "No requests here yet. Clients open them from their portal, or you can open one from an enquiry."}</p>}
      {creating && <NewRequestDialog onClose={() => setCreating(false)} onCreated={(ref) => { setCreating(false); setOpenId(ref); }} />}
    </div>
  );
}
