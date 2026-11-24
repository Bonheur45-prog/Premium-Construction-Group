"use client";

import Link from "next/link";
import { useState } from "react";
import { StageTracker } from "@/components/portal/stage-tracker";
import { formatWhen, portalFetch } from "@/components/portal/portal-fetch";
import { CATEGORY_LABEL, STATUS_CLIENT_TEXT, STATUS_LABEL, type PortalRequestSummary } from "@/lib/portal/constants";

type Contact = { email: string; phone: string; whatsapp: string; openingHours: string };

export function PortalDashboard({ name, verified, requests, meetings, contact, notice }: {
  name: string;
  verified: boolean;
  requests: PortalRequestSummary[];
  meetings: Array<{ id: string; date: string; time: string; projectType: string }>;
  contact: Contact;
  notice?: "welcome" | "reset";
}) {
  const [resend, setResend] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const firstName = name.split(" ")[0];
  const open = requests.filter((request) => request.status !== "completed" && request.status !== "closed");
  const done = requests.filter((request) => request.status === "completed" || request.status === "closed");
  const unread = requests.reduce((total, request) => total + request.unread, 0);

  async function resendLink() {
    try {
      await portalFetch("/api/account/resend-verification", { method: "POST" });
      setResend({ tone: "ok", text: "A new confirmation link is on its way." });
    } catch (reason) {
      setResend({ tone: "error", text: reason instanceof Error ? reason.message : "The link couldn't be sent." });
    }
  }

  return (
    <div className="portal-dashboard">
      <section className="portal-welcome">
        <div>
          <p className="portal-eyebrow">Requests</p>
          <h1>Hello, <em>{firstName}.</em></h1>
          <p>{notice === "welcome" ? "Your account is ready. Here's where you'll follow every request with us." : notice === "reset" ? "Your password has been changed." : unread ? `You have ${unread} new update${unread === 1 ? "" : "s"} from our team.` : open.length ? `You have ${open.length} active request${open.length === 1 ? "" : "s"} with us.` : "Everything you're working on with us, in one place."}</p>
        </div>
        {verified && <Link className="button button--dark" href="/account/requests/new">Start a new request <span aria-hidden="true">+</span></Link>}
      </section>

      {!verified && (
        <section className="portal-callout">
          <strong>Please confirm your email address.</strong>
          <p>We sent a link when you signed up. Once confirmed, you can open requests, and anything you&apos;ve already sent us with this email will appear here.</p>
          <button type="button" className="portal-link" onClick={() => void resendLink()}>Send me a new link</button>
          {resend && <p className={`portal-alert portal-alert--${resend.tone}`}>{resend.text}</p>}
        </section>
      )}

      <div className="portal-dashboard__grid">
        <div className="portal-dashboard__main">
          <h2 className="portal-section-title">Active requests <span>{open.length}</span></h2>
          {open.length ? (
            <ul className="portal-request-list">
              {open.map((request) => (
                <li key={request.id}>
                  <Link href={`/account/requests/${request.ref}`} className="portal-request-card">
                    <span className="portal-request-card__top">
                      <span className="portal-ref">{request.ref}</span>
                      <span className="portal-request-card__category">{CATEGORY_LABEL[request.category] || request.category}</span>
                      {request.unread > 0 && <span className="portal-unread">{request.unread} new</span>}
                    </span>
                    <strong>{request.title}</strong>
                    <span className="portal-request-card__status">{STATUS_CLIENT_TEXT[request.status]}</span>
                    <StageTracker status={request.status} compact />
                    {request.status === "in_progress" && request.progress > 0 && (
                      <span className="portal-progress" aria-label={`${request.progress}% complete`}><span style={{ width: `${request.progress}%` }} /><em>{request.progress}% built</em></span>
                    )}
                    <span className="portal-request-card__foot">Updated {formatWhen(request.updatedAt)} <span aria-hidden="true">→</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="portal-empty">
              <svg aria-hidden="true" viewBox="0 0 64 48" fill="none"><path d="M4 44h56M10 44V20l22-14 22 14v24M24 44V30h16v14" /></svg>
              <p>{verified ? "No active requests yet. Tell us what you're planning and we'll take it from there." : "Confirm your email to start your first request."}</p>
              {verified && <Link className="button button--dark" href="/account/requests/new">Start a request <span aria-hidden="true">+</span></Link>}
            </div>
          )}

          {done.length > 0 && (
            <>
              <h2 className="portal-section-title">Completed &amp; closed <span>{done.length}</span></h2>
              <ul className="portal-archive">
                {done.map((request) => (
                  <li key={request.id}>
                    <Link href={`/account/requests/${request.ref}`}>
                      <span className="portal-ref">{request.ref}</span>
                      <strong>{request.title}</strong>
                      <span>{STATUS_LABEL[request.status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="portal-dashboard__side">
          <section className="portal-panel">
            <h3>Upcoming meetings</h3>
            {meetings.length ? (
              <ul className="portal-meetings">
                {meetings.map((meeting) => {
                  const date = new Date(`${meeting.date}T${meeting.time}:00`);
                  return (
                    <li key={meeting.id}>
                      <span className="portal-meetings__date"><strong>{date.toLocaleDateString("en-GB", { day: "2-digit" })}</strong>{date.toLocaleDateString("en-GB", { month: "short" })}</span>
                      <span><strong>{date.toLocaleDateString("en-GB", { weekday: "long" })}, {meeting.time}</strong><small>{meeting.projectType}</small></span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="portal-muted">No meetings booked.</p>}
            <Link className="portal-link" href="/account/meetings">Book a meeting →</Link>
          </section>
          <section className="portal-panel portal-panel--dark">
            <h3>Talk to our team</h3>
            <p>Questions about anything? Write to us in Messages — the whole team sees it — or reach us directly.</p>
            <Link className="portal-link portal-link--light" href="/account/messages">Open Messages →</Link>
            <ul className="portal-contact">
              {contact.phone && <li><a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a></li>}
              {contact.email && <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
            </ul>
            {contact.openingHours && <small>{contact.openingHours}</small>}
          </section>
        </aside>
      </div>
    </div>
  );
}
