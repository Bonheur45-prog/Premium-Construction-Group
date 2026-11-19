"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FileDrop } from "@/components/portal/file-drop";
import { formatBytes, formatWhen, portalFetch } from "@/components/portal/portal-fetch";
import { StageTracker } from "@/components/portal/stage-tracker";
import {
  CATEGORY_LABEL, CLIENT_FILE_CATEGORIES, FILE_CATEGORY_LABEL, STATUS_CLIENT_TEXT, STATUS_LABEL,
  type PortalEvent, type PortalFile, type PortalRequestDetail, type RequestStatus,
} from "@/lib/portal/constants";

function FileChip({ file }: { file: PortalFile }) {
  const extension = file.filename.split(".").pop()?.toUpperCase() || "FILE";
  return (
    <a className="file-chip" href={`/api/files/${file.id}`} target="_blank" rel="noreferrer">
      <span className="file-chip__ext">{extension}</span>
      <span className="file-chip__name">{file.filename}</span>
      <span className="file-chip__size">{formatBytes(file.sizeBytes)}</span>
    </a>
  );
}

function EventItem({ event, files, viewer }: { event: PortalEvent; files: PortalFile[]; viewer: "client" | "staff" }) {
  const attached = files.filter((file) => file.eventId === event.id);
  if (event.kind === "status") {
    const to = event.meta.to as RequestStatus;
    return (
      <li className="timeline-item timeline-item--status">
        <span className="timeline-item__marker" aria-hidden="true" />
        <div>
          <p className="timeline-item__meta">{formatWhen(event.createdAt)} · {event.authorName || "Our team"}</p>
          <p className="timeline-item__status">Moved to <strong>{STATUS_LABEL[to] || to}</strong></p>
          {event.body && <p className="timeline-item__body">{event.body}</p>}
        </div>
      </li>
    );
  }
  if (event.kind === "system") {
    return (
      <li className="timeline-item timeline-item--system">
        <span className="timeline-item__marker" aria-hidden="true" />
        <p className="timeline-item__meta">{formatWhen(event.createdAt)} · {event.body}</p>
      </li>
    );
  }
  const mine = viewer === event.authorType;
  const internal = event.visibility === "internal";
  return (
    <li className={`timeline-item timeline-item--bubble${mine ? " is-mine" : ""}${internal ? " is-internal" : ""}`}>
      <div className="timeline-bubble">
        <p className="timeline-item__meta">
          <strong>{event.authorType === "client" ? (viewer === "client" ? "You" : event.authorName) : `${event.authorName || "Our team"} · PCG`}</strong>
          {internal && <span className="timeline-item__flag">Internal note</span>}
          {event.kind === "update" && <span className="timeline-item__flag timeline-item__flag--update">Progress update</span>}
          <span>{formatWhen(event.createdAt)}</span>
        </p>
        {event.body && <p className="timeline-item__body">{event.body}</p>}
        {attached.length > 0 && <div className="timeline-item__files">{attached.map((file) => <FileChip key={file.id} file={file} />)}</div>}
      </div>
    </li>
  );
}

export function Timeline({ request, viewer }: { request: PortalRequestDetail; viewer: "client" | "staff" }) {
  const list = useRef<HTMLOListElement>(null);
  // Keep the newest message in view inside the conversation box (without moving the page).
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [request.events.length]);
  return (
    <ol className="timeline" ref={list}>
      {request.events.map((event) => <EventItem key={event.id} event={event} files={request.files} viewer={viewer} />)}
    </ol>
  );
}

export function DocumentsPanel({ files }: { files: PortalFile[] }) {
  const [tab, setTab] = useState<"staff" | "client">("staff");
  const shown = files.filter((file) => file.uploadedByType === tab);
  const groups = useMemo(() => {
    const map = new Map<string, PortalFile[]>();
    for (const file of shown) map.set(file.category, [...(map.get(file.category) || []), file]);
    return [...map.entries()];
  }, [shown]);
  return (
    <section className="portal-panel portal-docs">
      <h3>Documents</h3>
      <div className="portal-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "staff"} className={tab === "staff" ? "is-active" : ""} onClick={() => setTab("staff")}>From PCG <em>{files.filter((f) => f.uploadedByType === "staff").length}</em></button>
        <button type="button" role="tab" aria-selected={tab === "client"} className={tab === "client" ? "is-active" : ""} onClick={() => setTab("client")}>From you <em>{files.filter((f) => f.uploadedByType === "client").length}</em></button>
      </div>
      {groups.length ? groups.map(([category, list]) => (
        <div key={category} className="portal-docs__group">
          <p>{FILE_CATEGORY_LABEL[category] || "Other"}</p>
          {list.map((file) => <FileChip key={file.id} file={file} />)}
        </div>
      )) : <p className="portal-muted">{tab === "staff" ? "Quotes, drawings and reports from our team will appear here." : "Plans and photos you share will appear here."}</p>}
    </section>
  );
}

export function PortalRequestView({ initial, justCreated }: { initial: PortalRequestDetail; justCreated?: boolean }) {
  const [request, setRequest] = useState(initial);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<string>("photos");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(justCreated ? { tone: "ok", text: `Request ${initial.ref} is with our team. We'll reply here, and by email.` } : null);

  const refresh = useCallback(async () => {
    try {
      const data = await portalFetch<{ request: PortalRequestDetail }>(`/api/account/requests/${initial.ref}`);
      setRequest(data.request);
    } catch { /* keep what we have */ }
  }, [initial.ref]);

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 45_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() && !files.length) return;
    const form = new FormData();
    form.set("body", body);
    form.set("category", category);
    files.forEach((file) => form.append("file", file));
    setBusy(true);
    setState(null);
    try {
      await portalFetch(`/api/account/requests/${request.ref}/messages`, { method: "POST", body: form });
      setBody("");
      setFiles([]);
      await refresh();
    } catch (reason) {
      setState({ tone: "error", text: reason instanceof Error ? reason.message : "Your message couldn't be sent." });
    } finally {
      setBusy(false);
    }
  }

  const closed = request.status === "closed";

  return (
    <div className="portal-request">
      <Link className="portal-back" href="/account">← All requests</Link>
      <header className="portal-request__head">
        <div>
          <p className="portal-eyebrow"><span className="portal-ref">{request.ref}</span> · {CATEGORY_LABEL[request.category] || request.category}{request.location ? ` · ${request.location}` : ""}</p>
          <h1>{request.title}</h1>
        </div>
        <div className="portal-request__state">
          <span className={`portal-status portal-status--${request.status}`}>{STATUS_LABEL[request.status]}</span>
          <small>Opened {formatWhen(request.createdAt)}</small>
        </div>
      </header>

      <section className="portal-panel portal-request__journey">
        <StageTracker status={request.status} />
        <p className="portal-request__explain">{STATUS_CLIENT_TEXT[request.status]}</p>
        {request.progress > 0 && request.status !== "completed" && (
          <span className="portal-progress portal-progress--wide" aria-label={`${request.progress}% complete`}><span style={{ width: `${request.progress}%` }} /><em>{request.progress}% complete</em></span>
        )}
      </section>

      {state && <p className={`portal-alert portal-alert--${state.tone}`} role="status">{state.text}</p>}

      <div className="portal-request__grid">
        <section className="portal-panel portal-conversation">
          <h3>Conversation</h3>
          <details className="portal-brief">
            <summary>Your original brief</summary>
            <p>{request.description}</p>
            <dl>
              {request.budget && <div><dt>Budget</dt><dd>{request.budget}</dd></div>}
              {request.timeline && <div><dt>Timing</dt><dd>{request.timeline}</dd></div>}
            </dl>
          </details>
          <Timeline request={request} viewer="client" />
          {closed ? <p className="portal-muted">This request is closed. <Link className="portal-link" href="/account/requests/new">Start a new request</Link> if you need anything else.</p> : (
            <form className="composer" onSubmit={send}>
              <label className="visually-hidden" htmlFor="composer-body">Message</label>
              <textarea id="composer-body" rows={3} maxLength={8000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write to our team…" onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") event.currentTarget.form?.requestSubmit(); }} />
              <FileDrop files={files} onChange={setFiles} compact max={10} />
              <div className="composer__bar">
                {files.length > 0 && (
                  <label className="composer__category">These files are
                    <select value={category} onChange={(event) => setCategory(event.target.value)}>
                      {CLIENT_FILE_CATEGORIES.map((id) => <option key={id} value={id}>{FILE_CATEGORY_LABEL[id].toLowerCase()}</option>)}
                    </select>
                  </label>
                )}
                <button className="button button--dark" type="submit" disabled={busy || (!body.trim() && !files.length)}>{busy ? "Sending…" : "Send"} <span aria-hidden="true">↗</span></button>
              </div>
            </form>
          )}
        </section>
        <DocumentsPanel files={request.files} />
      </div>
    </div>
  );
}
