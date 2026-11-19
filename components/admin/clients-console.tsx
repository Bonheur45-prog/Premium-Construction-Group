"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cmsFetch, formatDate, timeAgo } from "@/components/admin/format";
import { STATUS_LABEL, type PortalRequestSummary } from "@/lib/portal/constants";

type ClientRow = {
  id: string; email: string; name: string; phone: string; company: string; verified: boolean; status: "active" | "suspended";
  notifyEmail: boolean; lastLoginAt: string | null; createdAt: string; requestCount: number; openCount: number;
};

function ClientDrawer({ id, isAdmin, onClose, onChanged }: { id: string; isAdmin: boolean; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<{ client: ClientRow; requests: PortalRequestSummary[] } | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const load = useCallback(async () => setData(await cmsFetch(`/api/admin/clients/${id}`)), [id]);
  useEffect(() => { void load(); }, [load]);

  async function act(action: string, success: string) {
    try {
      await cmsFetch(`/api/admin/clients/${id}`, { method: "POST", body: JSON.stringify({ action }) });
      setNotice({ tone: "ok", text: success });
      await load();
      onChanged();
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not update." });
    }
  }

  return (
    <div className="cms-modal cms-drawer" role="dialog" aria-modal="true" aria-label="Client" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="cms-drawer__panel">
        <button type="button" className="cms-modal__close" onClick={onClose} aria-label="Close">×</button>
        {!data ? <div className="cms-skeleton" style={{ height: 200 }} /> : (
          <>
            <span className="cms-avatar cms-avatar--large" aria-hidden="true">{data.client.name.slice(0, 1).toUpperCase()}</span>
            <h2>{data.client.name}</h2>
            <p className="cms-muted">{data.client.company || "Personal client"}</p>
            <div className="cms-row">
              <span className={`cms-pill ${data.client.verified ? "cms-pill--replied" : "cms-pill--new"}`}>{data.client.verified ? "Email confirmed" : "Awaiting confirmation"}</span>
              {data.client.status === "suspended" && <span className="cms-pill cms-pill--archived">Paused</span>}
            </div>
            <dl className="cms-drawer__facts">
              <div><dt>Email</dt><dd><a href={`mailto:${data.client.email}`}>{data.client.email}</a></dd></div>
              {data.client.phone && <div><dt>Phone</dt><dd><a href={`tel:${data.client.phone.replace(/[^\d+]/g, "")}`}>{data.client.phone}</a></dd></div>}
              <div><dt>Joined</dt><dd>{formatDate(data.client.createdAt)}</dd></div>
              <div><dt>Last sign-in</dt><dd>{data.client.lastLoginAt ? timeAgo(data.client.lastLoginAt) : "Never"}</dd></div>
              <div><dt>Email updates</dt><dd>{data.client.notifyEmail ? "On" : "Off"}</dd></div>
            </dl>
            <h3>Requests</h3>
            {data.requests.length ? (
              <ul className="cms-drawer__requests">
                {data.requests.map((request) => (
                  <li key={request.id}><Link href={`/admin/requests?open=${request.ref}`}><span className="cms-ref">{request.ref}</span><strong>{request.title}</strong><span className={`cms-pill cms-pill--stage-${request.status}`}>{STATUS_LABEL[request.status]}</span></Link></li>
                ))}
              </ul>
            ) : <p className="cms-empty">No requests yet.</p>}
            <div className="cms-drawer__actions">
              {!data.client.verified && <button type="button" className="cms-btn cms-btn--ghost" onClick={() => void act("resend-verification", "Confirmation link sent.")}>Resend confirmation email</button>}
              {isAdmin && (data.client.status === "active"
                ? <button type="button" className="cms-btn cms-btn--ghost cms-link--danger" onClick={() => void act("suspend", "Account paused and signed out.")}>Pause account</button>
                : <button type="button" className="cms-btn cms-btn--ghost" onClick={() => void act("activate", "Account restored.")}>Restore account</button>)}
            </div>
            {notice && <p className={`cms-alert cms-alert--${notice.tone}`}>{notice.text}</p>}
          </>
        )}
      </aside>
    </div>
  );
}

export function ClientsConsole({ isAdmin }: { isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setClients((await cmsFetch<{ clients: ClientRow[] }>(`/api/admin/clients${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`)).clients);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Clients could not be loaded.");
    }
  }, [query]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const total = clients?.length || 0;
  const confirmed = clients?.filter((client) => client.verified).length || 0;
  const active = clients?.filter((client) => client.openCount > 0).length || 0;

  return (
    <div className="cms-clients">
      <section className="cms-stats">
        <div className="cms-stat"><span className="cms-stat__label">Client accounts</span><strong className="cms-stat__value">{total}</strong><span className="cms-stat__note">{confirmed} confirmed</span></div>
        <div className="cms-stat cms-stat--amber"><span className="cms-stat__label">With open requests</span><strong className="cms-stat__value">{active}</strong><span className="cms-stat__note">Currently working with us</span></div>
      </section>
      <div className="cms-toolbar">
        <input className="cms-search" type="search" placeholder="Search name, email, company or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
        <span className="cms-muted">Clients sign up themselves at <a className="cms-link" href="/account/signup" target="_blank" rel="noreferrer">/account/signup</a></span>
      </div>
      {error && <p className="cms-alert cms-alert--error">{error}</p>}
      {clients && clients.length > 0 && (
        <table className="cms-table">
          <thead><tr><th>Client</th><th>Contact</th><th>Requests</th><th>Status</th><th>Last sign-in</th></tr></thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} onClick={() => setOpenId(client.id)}>
                <td><span className="cms-table__who"><span className="cms-avatar" aria-hidden="true">{client.name.slice(0, 1).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.company || "Personal"}</small></span></span></td>
                <td>{client.email}<small>{client.phone}</small></td>
                <td>{client.requestCount}{client.openCount ? <small>{client.openCount} open</small> : null}</td>
                <td><span className={`cms-pill ${client.status === "suspended" ? "cms-pill--archived" : client.verified ? "cms-pill--replied" : "cms-pill--new"}`}>{client.status === "suspended" ? "Paused" : client.verified ? "Active" : "Unconfirmed"}</span></td>
                <td>{client.lastLoginAt ? timeAgo(client.lastLoginAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {clients && !clients.length && <p className="cms-empty">{query ? "No clients match." : "No client accounts yet. Share the portal link, or invite people when you open a request from their enquiry."}</p>}
      {openId && <ClientDrawer id={openId} isAdmin={isAdmin} onClose={() => setOpenId(null)} onChanged={() => void load()} />}
    </div>
  );
}
