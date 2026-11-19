"use client";

import { COLLECTIONS, COLLECTION_IDS } from "@/lib/cms/collections";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cmsFetch, formatBytes, formatMeeting, timeAgo } from "@/components/admin/format";

type Overview = {
  collections: Record<string, { draft: number; published: number }>;
  stats: {
    upcomingMeetings: number; newEnquiries: number; openRequests: number; awaitingReply: number; clients: number; newClients30: number;
    mediaFiles: number; mediaBytes: number; publishedArticles: number; draftArticles: number; customPages: number;
  };
  upcoming: Array<{ id: string; name: string; projectType: string; date: string; time: string; company: string }>;
  waiting: Array<{ ref: string; title: string; name: string; status: string; since: string }>;
  activity: Array<{ id: string; actorType: string; actorName: string; action: string; summary: string; createdAt: string }>;
  setup: Array<{ id: string; label: string; done: boolean; hint: string }>;
};

function ProgressRing({ value }: { value: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg className="cms-ring" viewBox="0 0 84 84" role="img" aria-label={`${Math.round(value * 100)}% complete`}>
      <circle cx="42" cy="42" r={radius} className="cms-ring__track" />
      <circle cx="42" cy="42" r={radius} className="cms-ring__value" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value)} />
      <text x="42" y="47" textAnchor="middle">{Math.round(value * 100)}%</text>
    </svg>
  );
}

function Stat({ label, value, note, href, tone }: { label: string; value: number | string; note?: string; href?: string; tone?: "amber" | "teal" }) {
  const body = (
    <>
      <span className="cms-stat__label">{label}</span>
      <strong className="cms-stat__value">{value}</strong>
      {note && <span className="cms-stat__note">{note}</span>}
      {href && <span className="cms-stat__go" aria-hidden="true">→</span>}
    </>
  );
  const className = `cms-stat${tone ? ` cms-stat--${tone}` : ""}`;
  return href ? <Link href={href} className={className}>{body}</Link> : <div className={className}>{body}</div>;
}

const actionIcon: Record<string, string> = { media: "▣", page: "¶", request: "◆", client: "●", enquiry: "✉", reservation: "◷", user: "◎" };

export function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    cmsFetch<Overview>("/api/admin/overview").then(setData).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) return <p className="cms-alert cms-alert--error">{error}</p>;
  if (!data) return <div className="cms-skeleton-grid">{Array.from({ length: 6 }, (_, index) => <span key={index} className="cms-skeleton" />)}</div>;

  const { stats } = data;
  const done = data.setup.filter((item) => item.done).length;

  return (
    <div className="cms-overview">
      <section className="cms-stats" aria-label="Key numbers">
        <Stat label="New enquiries" value={stats.newEnquiries} note={stats.newEnquiries ? "Waiting to be read" : "Inbox is clear"} href="/admin/enquiries" tone="amber" />
        <Stat label="Awaiting our reply" value={stats.awaitingReply} note={`${stats.openRequests} open request${stats.openRequests === 1 ? "" : "s"}`} href="/admin/requests" tone="teal" />
        <Stat label="Client accounts" value={stats.clients} note={stats.newClients30 ? `${stats.newClients30} joined this month` : "Portal sign-ups"} href="/admin/clients" />
        <Stat label="Upcoming meetings" value={stats.upcomingMeetings} note="Booked from the website" href="/admin/reservations" />
        <Stat label="Media files" value={stats.mediaFiles} note={formatBytes(stats.mediaBytes)} href="/admin/media" />
        <Stat label="Published articles" value={stats.publishedArticles} note={stats.draftArticles ? `${stats.draftArticles} draft${stats.draftArticles === 1 ? "" : "s"} waiting` : "No drafts waiting"} href="/admin/insights" />
      </section>

      <section className="cms-card cms-card--wide cms-content-map">
        <header className="cms-card__head">
          <div><p className="cms-eyebrow">Website content</p><h2>Everything on the website</h2></div>
        </header>
        <ul>
          {COLLECTION_IDS.map((id) => {
            const counts = data.collections?.[id] || { draft: 0, published: 0 };
            return (
              <li key={id}>
                <Link href={`/admin/${id}`}>
                  <strong>{COLLECTIONS[id].label}</strong>
                  <span>{counts.published} live{counts.draft ? ` · ${counts.draft} draft${counts.draft === 1 ? "" : "s"}` : ""}</span>
                  <em aria-hidden="true">→</em>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="cms-overview__grid">
        {data.waiting.length > 0 && (
          <section className="cms-card cms-card--wide cms-waiting">
            <header className="cms-card__head">
              <div><p className="cms-eyebrow">Clients waiting on us</p><h2>Needs a reply</h2></div>
              <Link className="cms-link" href="/admin/requests">Open requests →</Link>
            </header>
            <ul>
              {data.waiting.map((item) => (
                <li key={item.ref}>
                  <Link href={`/admin/requests?open=${item.ref}`}>
                    <span className="cms-ref">{item.ref}</span>
                    <strong>{item.title}</strong>
                    <span>{item.name}</span>
                    <time dateTime={item.since}>waiting {timeAgo(item.since).replace(" ago", "")}</time>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="cms-card cms-card--marks">
          <header className="cms-card__head">
            <div><p className="cms-eyebrow">Next up</p><h2>Upcoming meetings</h2></div>
            <Link className="cms-link" href="/admin/reservations">All meetings →</Link>
          </header>
          {data.upcoming.length ? (
            <ul className="cms-agenda">
              {data.upcoming.map((meeting) => {
                const when = formatMeeting(meeting.date, meeting.time);
                return (
                  <li key={meeting.id}>
                    <span className="cms-agenda__date"><strong>{when.day}</strong>{when.month}</span>
                    <span className="cms-agenda__body"><strong>{meeting.name}</strong><small>{meeting.projectType}{meeting.company ? ` · ${meeting.company}` : ""}</small></span>
                    <span className="cms-agenda__time">{when.weekday}<br />{when.time}</span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="cms-empty">No meetings booked yet. New bookings from the website appear here.</p>}
        </section>

        <section className="cms-card cms-setup">
          <header className="cms-card__head">
            <div><p className="cms-eyebrow">Launch readiness</p><h2>Setup checklist</h2></div>
            <ProgressRing value={done / data.setup.length} />
          </header>
          <ul className="cms-checklist">
            {data.setup.map((item) => (
              <li key={item.id} className={item.done ? "is-done" : ""}>
                <span className="cms-checklist__tick" aria-hidden="true">{item.done ? "✓" : ""}</span>
                <span><strong>{item.label}</strong>{!item.done && <small>{item.hint}</small>}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cms-card cms-card--wide">
          <header className="cms-card__head">
            <div><p className="cms-eyebrow">Audit trail</p><h2>Recent activity</h2></div>
          </header>
          {data.activity.length ? (
            <ol className="cms-feed">
              {data.activity.map((entry) => (
                <li key={entry.id}>
                  <span className={`cms-feed__dot cms-feed__dot--${entry.actorType}`} aria-hidden="true">{actionIcon[entry.action.split(".")[0]] || "•"}</span>
                  <span className="cms-feed__text"><strong>{entry.actorName || (entry.actorType === "visitor" ? "Website visitor" : "System")}</strong> {entry.summary}</span>
                  <time dateTime={entry.createdAt}>{timeAgo(entry.createdAt)}</time>
                </li>
              ))}
            </ol>
          ) : <p className="cms-empty">Uploads, edits and client activity will be listed here as they happen.</p>}
        </section>
      </div>
    </div>
  );
}
