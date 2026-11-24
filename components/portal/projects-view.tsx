"use client";

/* eslint-disable @next/next/no-img-element -- private site photos through short-lived signed links */
import { useCallback, useEffect, useState } from "react";
import { CalendarBlank, ChatCircleDots, Check, MapPin, PaperPlaneRight } from "@/components/icons";
import { MilestoneIcon, SitePhotoIcon } from "@/components/icons/custom";
import { FileViewer } from "@/components/chat/file-viewer";
import { fileUrl } from "@/components/chat/message-parts";
import { useLiveEvents } from "@/components/portal/live";
import { calendarDate } from "@/components/portal/quote-document";
import type { ClientProject } from "@/lib/portal/projects";
import type { PortalFileItem } from "@/lib/portal/files";

export const PROJECT_STATUS = { planning: "Planning", active: "On site", on_hold: "On hold", completed: "Completed" } as const;
const date = (value: string | null) => calendarDate(value, { day: "numeric", month: "short", year: "numeric" });

/** A progress ring: the share of milestones completed (in-progress milestones count half). */
export function ProgressRing({ value, size = 112 }: { value: number; size?: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${value}% complete`}>
      <circle cx="50" cy="50" r={radius} className="ring__track" />
      <circle cx="50" cy="50" r={radius} className="ring__value" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} transform="rotate(-90 50 50)" />
      <text x="50" y="49" className="ring__number">{value}<tspan className="ring__pct">%</tspan></text>
      <text x="50" y="64" className="ring__label">complete</text>
    </svg>
  );
}

export function ProjectsView({ allowComments }: { allowComments: boolean }) {
  const [projects, setProjects] = useState<ClientProject[] | null>(null);
  const [viewer, setViewer] = useState<{ files: PortalFileItem[]; index: number } | null>(null);
  const load = useCallback(() => fetch("/api/portal/projects", { cache: "no-store" }).then((response) => response.json()).then((data: { projects?: ClientProject[] }) => setProjects(data.projects || [])).catch(() => setProjects([])), []);
  useEffect(() => { void load(); }, [load]);
  useLiveEvents((event) => { if (event.type === "project" || event.type === "resync") void load(); });

  return (
    <div className="ps-page">
      <header className="ps-page__head">
        <p className="portal-eyebrow">Project progress</p>
        <h1>See it <em>take shape.</em></h1>
        <p className="portal-muted">Milestones, dates and photos from the site, updated by our team as the work moves forward.</p>
      </header>
      {projects?.map((project) => (
        <section key={project.id} className={`proj is-${project.status}`}>
          <div className="proj__hero">
            {project.cover ? <img src={fileUrl("/api/portal", project.cover.id)} alt="" className="proj__cover" /> : <div className="proj__cover proj__cover--blank"><SitePhotoIcon size={46} weight="duotone" /></div>}
            <div className="proj__veil" />
            <div className="proj__intro">
              <span className="proj__status">{PROJECT_STATUS[project.status]}</span>
              <h2>{project.title}</h2>
              <p className="proj__facts">
                {project.location && <span><MapPin size={15} weight="duotone" /> {project.location}</span>}
                {(project.startDate || project.targetDate) && <span><CalendarBlank size={15} weight="duotone" /> {date(project.startDate)}{project.targetDate ? ` → ${date(project.targetDate)}` : ""}</span>}
              </p>
              {project.summary && <p className="proj__summary">{project.summary}</p>}
            </div>
            <ProgressRing value={project.progress} />
          </div>
          <ol className="proj__timeline">
            {project.milestones.map((milestone) => (
              <li key={milestone.id} className={`ms is-${milestone.status}`}>
                <span className="ms__dot">{milestone.status === "done" ? <Check size={14} weight="bold" /> : milestone.status === "in_progress" ? <i /> : null}</span>
                <div className="ms__body">
                  <div className="ms__head">
                    <strong>{milestone.title}</strong>
                    <span className="ms__when">{milestone.status === "done" ? `Done ${date(milestone.completedAt)}` : milestone.status === "in_progress" ? "In progress" : milestone.dueDate ? `Planned ${date(milestone.dueDate)}` : "Upcoming"}</span>
                  </div>
                  {milestone.description && <p>{milestone.description}</p>}
                  {milestone.photos.length > 0 && (
                    <div className="ms__photos">
                      {milestone.photos.slice(0, 6).map((photo, index) => (
                        <button type="button" key={photo.id} onClick={() => setViewer({ files: milestone.photos, index })} aria-label={`Open photo ${index + 1}`}>
                          {photo.kind === "video" ? <video src={`${fileUrl("/api/portal", photo.id)}#t=0.5`} preload="metadata" muted playsInline /> : <img src={fileUrl("/api/portal", photo.id)} alt="" loading="lazy" />}
                          {index === 5 && milestone.photos.length > 6 && <span>+{milestone.photos.length - 6}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <Comments milestoneId={milestone.id} comments={milestone.comments} allow={allowComments} onAdded={load} />
                </div>
              </li>
            ))}
          </ol>
          {!project.milestones.length && <p className="portal-muted proj__none">Our team is preparing the plan for this project.</p>}
        </section>
      ))}
      {projects && !projects.length && (
        <div className="ps-empty"><MilestoneIcon size={44} weight="duotone" /><strong>No projects to follow yet.</strong><p>Once your project starts, its milestones and site photos appear here.</p></div>
      )}
      {!projects && <div className="chat-skeleton" style={{ height: 320 }} />}
      {viewer && <FileViewer files={viewer.files} index={viewer.index} apiBase="/api/portal" onClose={() => setViewer(null)} onIndex={(index) => setViewer((current) => current && { ...current, index })} />}
    </div>
  );
}

function Comments({ milestoneId, comments, allow, onAdded }: { milestoneId: string; comments: ClientProject["milestones"][number]["comments"]; allow: boolean; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!allow && !comments.length) return null;
  return (
    <div className="ms__comments">
      <button type="button" className="ms__toggle" onClick={() => setOpen((value) => !value)}><ChatCircleDots size={15} weight="duotone" /> {comments.length ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : "Comment"}</button>
      {open && (
        <>
          <ul>{comments.map((comment) => <li key={comment.id} className={comment.authorType === "staff" ? "is-team" : ""}><strong>{comment.authorType === "staff" ? `${comment.authorName} · PCG` : comment.authorName}</strong><p>{comment.body}</p></li>)}</ul>
          {allow && (
            <form onSubmit={async (event) => {
              event.preventDefault();
              if (!text.trim()) return;
              setBusy(true);
              const response = await fetch(`/api/portal/milestones/${milestoneId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
              setBusy(false);
              if (response.ok) { setText(""); setError(""); onAdded(); } else setError(((await response.json().catch(() => ({}))) as { error?: string }).error || "Couldn't post.");
            }}>
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask about this milestone…" maxLength={2000} />
              <button type="submit" className="chat-icon-btn" disabled={busy || !text.trim()} aria-label="Post comment"><PaperPlaneRight size={17} weight="fill" /></button>
            </form>
          )}
          {error && <p className="portal-alert portal-alert--error">{error}</p>}
        </>
      )}
    </div>
  );
}
