"use client";

/* eslint-disable @next/next/no-img-element -- private site photos through short-lived signed links */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Camera, ChatCircleDots, Plus, Trash, X } from "@/components/icons";
import { SitePhotoIcon } from "@/components/icons/custom";
import { fileUrl } from "@/components/chat/message-parts";
import { useLiveEvents } from "@/components/portal/live";
import { ProgressRing, PROJECT_STATUS } from "@/components/portal/projects-view";
import { staffUploadTarget, uploadFile } from "@/components/portal/upload";
import type { ClientProject, Milestone } from "@/lib/portal/projects-shared";

/**
 * CMS → Progress. One project per client build: milestones with dates and weights, site photos and
 * comments. Marking a milestone done posts the news — with its photos — in the client's conversation.
 */
type ClientOption = { id: string; name: string; company: string };

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: init.body ? { "Content-Type": "application/json" } : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

export function ProgressDesk({ isAdmin }: { isAdmin: boolean }) {
  const [projects, setProjects] = useState<ClientProject[] | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [openId, setOpenId] = useState("");
  const [creating, setCreating] = useState(false);
  const load = useCallback(() => call<{ projects: ClientProject[] }>("/api/admin/portal/projects").then((data) => setProjects(data.projects)).catch(() => setProjects([])), []);
  useEffect(() => { void load(); void call<{ clients: ClientOption[] }>("/api/admin/clients").then((data) => setClients(data.clients)).catch(() => undefined); }, [load]);
  useLiveEvents((event) => { if (event.type === "project" || event.type === "resync") void load(); });

  const project = projects?.find((item) => item.id === openId);
  if (project) return <ProjectEditor project={project} isAdmin={isAdmin} onBack={() => setOpenId("")} onChanged={load} />;

  return (
    <div>
      <div className="cmsl-intro">
        <p>Follow each client build in their space: milestones, dates, site photos and progress. When you mark a milestone done, the client gets the news in their conversation.</p>
        <button type="button" className="cms-btn cms-btn--amber" onClick={() => setCreating(true)}><Plus size={16} weight="bold" /> New project</button>
      </div>
      {projects && projects.length > 0 && (
        <ul className="pdesk-grid">
          {projects.map((item) => (
            <li key={item.id}>
              <button type="button" className="pdesk-card" onClick={() => setOpenId(item.id)}>
                <span className="pdesk-card__media">{item.cover ? <img src={fileUrl("/api/admin/portal", item.cover.id)} alt="" /> : <SitePhotoIcon size={36} weight="duotone" />}</span>
                <span className="pdesk-card__body">
                  <small>{item.clientName} · {PROJECT_STATUS[item.status]}</small>
                  <strong>{item.title}</strong>
                  <span className="pdesk-card__bar"><i style={{ width: `${item.progress}%` }} /></span>
                  <em>{item.progress}% · {item.milestones.filter((m) => m.status === "done").length}/{item.milestones.length} milestones</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {projects && !projects.length && <div className="cmsl-empty"><strong>No client projects yet.</strong><p>Create one for a client account to start sharing progress.</p></div>}
      {!projects && <div className="cms-skeleton" style={{ height: 240 }} />}
      {creating && <ProjectForm clients={clients} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); void load().then(() => setOpenId(id)); }} />}
    </div>
  );
}

function ProjectForm({ clients, project, onClose, onSaved }: { clients: ClientOption[]; project?: ClientProject; onClose: () => void; onSaved: (id: string) => void }) {
  const [form, setForm] = useState({ clientId: project?.clientId || "", title: project?.title || "", location: project?.location || "", summary: project?.summary || "", status: project?.status || "planning", startDate: project?.startDate || "", targetDate: project?.targetDate || "" });
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    try { onSaved((await call<{ id: string }>("/api/admin/portal/projects", { method: "POST", body: JSON.stringify({ ...form, id: project?.id, coverFileId: project?.cover?.id || "" }) })).id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't save."); }
  }
  return (
    <div className="portal-modal" role="dialog" aria-modal="true" aria-label="Project" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="portal-modal__card" onSubmit={submit}>
        <header className="portal-modal__head"><h2>{project ? "Project details" : "New project"}</h2><button type="button" className="chat-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        {!project && (
          <label className="portal-field"><span>Client</span>
            <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required>
              <option value="">Choose a client account…</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` — ${client.company}` : ""}</option>)}
            </select>
          </label>
        )}
        <label className="portal-field"><span>Project name</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={140} placeholder="e.g. Family house, Kicukiro" /></label>
        <div className="portal-form__row">
          <label className="portal-field"><span>Location</span><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={120} /></label>
          <label className="portal-field"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ClientProject["status"] })}>{Object.entries(PROJECT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="portal-form__row">
          <label className="portal-field"><span>Start</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
          <label className="portal-field"><span>Planned handover</span><input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} /></label>
        </div>
        <label className="portal-field"><span>Short summary</span><textarea rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} maxLength={1500} /></label>
        {error && <p className="portal-alert portal-alert--error">{error}</p>}
        <footer className="portal-modal__foot"><button type="button" className="portal-btn portal-btn--ghost" onClick={onClose}>Cancel</button><button type="submit" className="portal-btn portal-btn--primary" disabled={!form.title.trim() || (!project && !form.clientId)}>Save</button></footer>
      </form>
    </div>
  );
}

function ProjectEditor({ project, isAdmin, onBack, onChanged }: { project: ClientProject; isAdmin: boolean; onBack: () => void; onChanged: () => Promise<unknown> }) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  async function setCover(fileId: string) {
    await call("/api/admin/portal/projects", { method: "POST", body: JSON.stringify({ ...project, id: project.id, coverFileId: fileId }) }).catch(() => undefined);
    void onChanged();
  }
  return (
    <div className="pedit">
      <div className="cmse-top">
        <button type="button" className="cms-link" onClick={onBack}><ArrowLeft size={14} /> All projects</button>
        <div className="cms-row">
          <button type="button" className="cms-btn cms-btn--ghost cms-btn--small" onClick={() => setEditing(true)}>Edit details</button>
          {isAdmin && <button type="button" className="cms-link cms-link--danger" onClick={async () => { if (window.confirm(`Delete “${project.title}” and its milestones? Photos stay in the client's files.`)) { await call(`/api/admin/portal/projects/${project.id}`, { method: "DELETE" }); onBack(); void onChanged(); } }}>Delete project</button>}
        </div>
      </div>
      <header className="pedit__head">
        <ProgressRing value={project.progress} size={104} />
        <div>
          <small>{project.clientName} · {PROJECT_STATUS[project.status]}</small>
          <h2>{project.title}</h2>
          <p>{[project.location, project.startDate && `from ${project.startDate}`, project.targetDate && `handover ${project.targetDate}`].filter(Boolean).join(" · ")}</p>
        </div>
      </header>
      {notice && <p className="cms-alert cms-alert--ok">{notice}</p>}
      <ol className="pedit__milestones">
        {project.milestones.map((milestone, index) => (
          <MilestoneRow key={milestone.id} project={project} milestone={milestone} index={index} onChanged={onChanged} onCover={setCover} onNotice={setNotice} />
        ))}
      </ol>
      {adding ? <MilestoneRow project={project} index={project.milestones.length} onChanged={async () => { setAdding(false); await onChanged(); }} onCancel={() => setAdding(false)} onCover={setCover} onNotice={setNotice} />
        : <button type="button" className="cmsf-add" onClick={() => setAdding(true)}><Plus size={14} /> Add a milestone</button>}
      <p className="cms-muted pedit__hint">Tip: give bigger stages more weight (e.g. Structure 3, Painting 1) so the percentage reflects the real work.</p>
      {editing && <ProjectForm clients={[]} project={project} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void onChanged(); }} />}
    </div>
  );
}

function MilestoneRow({ project, milestone, index, onChanged, onCancel, onCover, onNotice }: {
  project: ClientProject; milestone?: Milestone; index: number; onChanged: () => Promise<unknown>; onCancel?: () => void; onCover: (id: string) => void; onNotice: (text: string) => void;
}) {
  const [open, setOpen] = useState(!milestone);
  const [form, setForm] = useState({ title: milestone?.title || "", description: milestone?.description || "", dueDate: milestone?.dueDate || "", status: milestone?.status || "upcoming", weight: milestone?.weight || 1 });
  const [photos, setPhotos] = useState(milestone?.photos || []);
  const [uploading, setUploading] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  async function save(next = form, nextPhotos = photos) {
    setError("");
    try {
      await call(`/api/admin/portal/projects/${project.id}/milestones`, { method: "POST", body: JSON.stringify({ id: milestone?.id, ...next, photoIds: nextPhotos.map((photo) => photo.id) }) });
      if (next.status === "done" && milestone?.status !== "done") onNotice(`“${next.title}” marked done — ${project.clientName} has been told in their conversation.`);
      await onChanged();
      if (!milestone) setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't save."); }
  }
  async function addPhotos(files: FileList) {
    const list = Array.from(files).slice(0, 20);
    setUploading(list.length);
    const added = [];
    for (const file of list) {
      try { added.push(await uploadFile(file, staffUploadTarget(project.clientId, { purpose: "photo" }), { compressImages: true })); } catch (reason) { setError(reason instanceof Error ? reason.message : "A photo didn't upload."); }
      setUploading((count) => count - 1);
    }
    const next = [...photos, ...added];
    setPhotos(next);
    if (milestone) await save(form, next);
  }

  return (
    <li className={`pm is-${form.status}`}>
      <div className="pm__line">
        <span className="pm__n">{String(index + 1).padStart(2, "0")}</span>
        <button type="button" className="pm__title" onClick={() => setOpen((value) => !value)}><strong>{form.title || "New milestone"}</strong><small>{form.status === "done" ? "Done" : form.status === "in_progress" ? "In progress" : form.dueDate ? `Planned ${form.dueDate}` : "Upcoming"} · weight {form.weight}{photos.length ? ` · ${photos.length} photo${photos.length === 1 ? "" : "s"}` : ""}{milestone?.comments.length ? ` · ${milestone.comments.length} comment${milestone.comments.length === 1 ? "" : "s"}` : ""}</small></button>
        <div className="pm__status" role="group" aria-label="Status">
          {(["upcoming", "in_progress", "done"] as const).map((status) => (
            <button key={status} type="button" className={form.status === status ? "is-on" : ""} onClick={() => { const next = { ...form, status }; setForm(next); if (milestone) void save(next); }}>{status === "upcoming" ? "Upcoming" : status === "in_progress" ? "In progress" : "Done"}</button>
          ))}
        </div>
      </div>
      {open && (
        <div className="pm__body">
          <div className="pm__fields">
            <label className="cmsf"><span className="cmsf-label"><span>Milestone</span></span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Foundations poured" maxLength={140} /></label>
            <label className="cmsf"><span className="cmsf-label"><span>Planned date</span></span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
            <label className="cmsf"><span className="cmsf-label"><span>Weight</span></span><input type="number" min={1} max={10} value={form.weight} onChange={(event) => setForm({ ...form, weight: Number(event.target.value) })} /></label>
            <label className="cmsf cmsf--wide"><span className="cmsf-label"><span>Note for the client</span></span><textarea rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What happened, what's next, anything they should know." /></label>
          </div>
          <div className="pm__photos">
            {photos.map((photo) => (
              <figure key={photo.id}>
                <img src={fileUrl("/api/admin/portal", photo.id)} alt="" />
                <figcaption>
                  <button type="button" onClick={() => onCover(photo.id)} title="Use as project cover">Cover</button>
                  <button type="button" onClick={() => { const next = photos.filter((item) => item.id !== photo.id); setPhotos(next); if (milestone) void save(form, next); }} aria-label="Remove photo"><X size={12} /></button>
                </figcaption>
              </figure>
            ))}
            <label className="pm__add-photo">
              <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple hidden onChange={(event) => { if (event.target.files) void addPhotos(event.target.files); event.target.value = ""; }} />
              <Camera size={22} weight="duotone" /><span>{uploading ? `Uploading ${uploading}…` : "Add site photos"}</span>
            </label>
          </div>
          {milestone && (
            <div className="pm__comments">
              {milestone.comments.map((item) => <p key={item.id} className={item.authorType === "staff" ? "is-team" : ""}><strong>{item.authorName}</strong> {item.body}</p>)}
              <form onSubmit={async (event) => { event.preventDefault(); if (!comment.trim()) return; await call(`/api/admin/portal/milestones/${milestone.id}/comments`, { method: "POST", body: JSON.stringify({ body: comment }) }).catch(() => undefined); setComment(""); void onChanged(); }}>
                <ChatCircleDots size={16} weight="duotone" /><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Reply on this milestone…" />
              </form>
            </div>
          )}
          {error && <p className="cms-alert cms-alert--error">{error}</p>}
          <div className="pm__actions">
            {milestone && <button type="button" className="cms-link cms-link--danger" onClick={async () => { if (window.confirm(`Remove “${milestone.title}”?`)) { await call(`/api/admin/portal/projects/${project.id}/milestones`, { method: "POST", body: JSON.stringify({ action: "delete", milestoneId: milestone.id }) }); void onChanged(); } }}><Trash size={13} /> Remove</button>}
            <span className="qedit__spacer" />
            {onCancel && <button type="button" className="cms-btn cms-btn--ghost cms-btn--small" onClick={onCancel}>Cancel</button>}
            <button type="button" className="cms-btn cms-btn--primary cms-btn--small" disabled={!form.title.trim() || uploading > 0} onClick={() => void save()}>{milestone ? "Save" : "Add milestone"}</button>
          </div>
        </div>
      )}
    </li>
  );
}

