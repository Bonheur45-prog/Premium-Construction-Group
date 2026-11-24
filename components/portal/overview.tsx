"use client";

/* eslint-disable @next/next/no-img-element -- private site photos through short-lived signed links */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowSquareOut, Bell, CalendarCheck, ChatsCircle, CloudArrowUp, DeviceMobile, FolderSimple, Plus } from "@/components/icons";
import { MilestoneIcon, SignOffIcon, StorageIcon } from "@/components/icons/custom";
import { fileUrl } from "@/components/chat/message-parts";
import { useLive, useLiveEvents } from "@/components/portal/live";
import { usePush } from "@/components/portal/push";
import { ProgressRing, PROJECT_STATUS } from "@/components/portal/projects-view";
import { calendarDate, quoteMoney } from "@/components/portal/quote-document";
import type { PortalFeatures } from "@/lib/features-shared";
import type { ConversationSummary } from "@/lib/portal/chat";
import { formatBytes } from "@/lib/portal/file-types";
import type { ClientProject } from "@/lib/portal/projects";
import type { QuoteSummary } from "@/lib/portal/quotes";

export type OverviewData = {
  name: string; verified: boolean; features: PortalFeatures;
  conversations: ConversationSummary[]; projects: ClientProject[]; quotes: QuoteSummary[];
  meetings: Array<{ id: string; date: string; time: string; projectType: string }>;
  usage: { usedBytes: number; quotaBytes: number } | null; recentFiles: number;
};

function greeting() {
  const hour = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Kigali" }));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** The client space home: what needs attention first, then progress, then everything else. */
export function PortalOverview({ data }: { data: OverviewData }) {
  const router = useRouter();
  const live = useLive();
  const push = usePush("/api/portal/push", data.features.push.enabled);
  const [resent, setResent] = useState("");
  useLiveEvents((event) => { if (["message", "conversation", "quote", "project", "files"].includes(event.type)) router.refresh(); });
  const unread = data.conversations.reduce((sum, item) => sum + item.unread, 0);
  const waitingQuotes = data.quotes.filter((quote) => quote.status === "sent");
  const activeProject = data.projects.find((project) => project.status !== "completed") || data.projects[0];
  const nextMeeting = data.meetings[0];
  const percent = data.usage ? Math.round((data.usage.usedBytes / data.usage.quotaBytes) * 100) : 0;
  const attention = unread + waitingQuotes.length;

  return (
    <div className="ps-page ov">
      <header className="ov-hero">
        <div>
          <p className="portal-eyebrow">{greeting()}</p>
          <h1>{data.name.split(" ")[0]}, <em>{attention ? `${attention} thing${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} you.` : "all is in hand."}</em></h1>
          <p className="portal-muted">{live.staffOnline ? "Our team is online now." : "Our team replies during working hours, Monday to Friday."}</p>
        </div>
        <div className="ov-actions">
          {data.features.chat.enabled && <Link className="portal-btn portal-btn--primary" href="/account/messages"><Plus size={17} weight="bold" /> New message</Link>}
          {data.features.files.enabled && <Link className="portal-btn portal-btn--ghost" href="/account/files"><CloudArrowUp size={17} /> Upload files</Link>}
          {data.features.portalMeetings.enabled && <Link className="portal-btn portal-btn--ghost" href="/account/meetings"><CalendarCheck size={17} /> Book a meeting</Link>}
        </div>
      </header>

      {!data.verified && (
        <section className="portal-callout portal-callout--amber">
          <strong>Confirm your email address to unlock messages and files.</strong>
          <p>We sent a link when you signed up.</p>
          <button type="button" className="portal-link" onClick={async () => { const response = await fetch("/api/account/resend-verification", { method: "POST" }); setResent(response.ok ? "A new link is on its way." : "The link couldn't be sent. Try again in a minute."); }}>Send me a new link</button>
          {resent && <small>{resent}</small>}
        </section>
      )}

      <div className="ov-grid">
        {data.features.chat.enabled && (
          <section className="ov-card ov-card--messages">
            <header><ChatsCircle size={22} weight="duotone" /><h2>Messages</h2>{unread > 0 && <em className="ps-badge">{unread} new</em>}<Link href="/account/messages" className="ov-more">Open →</Link></header>
            {data.conversations.length ? (
              <ul className="ov-convos">
                {data.conversations.slice(0, 4).map((item) => (
                  <li key={item.id}><Link href={`/account/messages/${item.id}`} className={item.unread ? "is-unread" : ""}><strong>{item.subject}</strong><span>{item.lastPreview || "No messages yet"}</span>{item.unread > 0 && <em className="chat-badge">{item.unread}</em>}</Link></li>
                ))}
              </ul>
            ) : <p className="ov-empty">Start a conversation about anything — our whole team sees it and replies here.</p>}
          </section>
        )}

        {data.features.quotes.enabled && (waitingQuotes.length > 0 || data.quotes.length > 0) && (
          <section className="ov-card ov-card--quotes">
            <header><SignOffIcon size={22} weight="duotone" /><h2>Quotes</h2><Link href="/account/quotes" className="ov-more">All →</Link></header>
            {waitingQuotes.length ? (
              <ul className="ov-quotes">
                {waitingQuotes.map((quote) => <li key={quote.id}><Link href={`/account/quotes/${quote.id}`}><small>{quote.ref} · waiting for your answer</small><strong>{quote.title}</strong><em>{quoteMoney(quote.total, quote.currency)}</em></Link></li>)}
              </ul>
            ) : <p className="ov-empty">Nothing waiting. {data.quotes.filter((quote) => quote.status === "accepted").length} accepted.</p>}
          </section>
        )}

        {data.features.progress.enabled && activeProject && (
          <section className="ov-card ov-card--project">
            <header><MilestoneIcon size={22} weight="duotone" /><h2>Progress</h2><Link href="/account/projects" className="ov-more">Details →</Link></header>
            <div className="ov-project">
              <ProgressRing value={activeProject.progress} size={96} />
              <div>
                <span className="proj__status">{PROJECT_STATUS[activeProject.status]}</span>
                <strong>{activeProject.title}</strong>
                {(() => {
                  const next = activeProject.milestones.find((item) => item.status !== "done");
                  return next ? <small>Next: {next.title}{next.dueDate ? ` · ${calendarDate(next.dueDate, { day: "numeric", month: "short" })}` : ""}</small> : <small>All milestones complete.</small>;
                })()}
              </div>
              {activeProject.cover && <img src={fileUrl("/api/portal", activeProject.cover.id)} alt="" className="ov-project__photo" />}
            </div>
          </section>
        )}

        {data.features.portalMeetings.enabled && (
          <section className="ov-card">
            <header><CalendarCheck size={22} weight="duotone" /><h2>Next meeting</h2><Link href="/account/meetings" className="ov-more">Meetings →</Link></header>
            {nextMeeting ? (
              <div className="ov-meeting">
                <span className="meet-card__date"><small>{new Date(`${nextMeeting.date}T12:00:00`).toLocaleDateString("en-GB", { month: "short" })}</small><strong>{new Date(`${nextMeeting.date}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit" })}</strong></span>
                <span><strong>{new Date(`${nextMeeting.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long" })} at {nextMeeting.time}</strong><small>{nextMeeting.projectType}</small></span>
              </div>
            ) : <p className="ov-empty">Nothing booked. <Link href="/account/meetings" className="portal-link">Choose a time →</Link></p>}
          </section>
        )}

        {data.features.files.enabled && data.usage && (
          <section className="ov-card">
            <header><FolderSimple size={22} weight="duotone" /><h2>Files</h2><Link href="/account/files" className="ov-more">Open →</Link></header>
            <div className="ov-storage">
              <StorageIcon size={30} weight="duotone" />
              <div>
                <strong>{formatBytes(data.usage.usedBytes)} <span>of {formatBytes(data.usage.quotaBytes)}</span></strong>
                <span className="files-meter__bar"><i style={{ width: `${Math.min(percent, 100)}%` }} /></span>
                <small>{data.recentFiles} file{data.recentFiles === 1 ? "" : "s"} stored · photos are compressed automatically</small>
              </div>
            </div>
          </section>
        )}

        {data.features.push.enabled && push.supported && push.available && !push.enabled && (
          <section className="ov-card ov-card--app">
            <header><DeviceMobile size={22} weight="duotone" /><h2>Get alerts like an app</h2></header>
            <p className="ov-empty">Turn on alerts to hear about replies the moment they arrive. On iPhone, first tap Share → “Add to Home Screen”.</p>
            <button type="button" className="portal-btn portal-btn--primary portal-btn--sm" onClick={() => void push.enable()}><Bell size={16} weight="fill" /> Turn on alerts</button>
          </section>
        )}
      </div>

      <p className="ov-foot"><Link href="/account/requests">Formal requests and their stages</Link> · <Link href="/account/profile">Profile & notifications</Link> · <a href="/" target="_blank" rel="noreferrer">Website <ArrowSquareOut size={12} /></a></p>
    </div>
  );
}
