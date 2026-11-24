"use client";

/* eslint-disable @next/next/no-img-element -- private files through short-lived signed links */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  ArrowsClockwise, CloudArrowUp, DotsThreeVertical, DownloadSimple, FolderSimple, FolderSimplePlus, Images, MagnifyingGlass, PencilSimple, Play, SquaresFour, Stack, Trash, X,
  List as ListIcon, ClockCounterClockwise, ArrowsLeftRight, Handshake,
} from "@/components/icons";
import { StorageIcon } from "@/components/icons/custom";
import { FileViewer } from "@/components/chat/file-viewer";
import { FileGlyph, fileUrl } from "@/components/chat/message-parts";
import { useLiveEvents } from "@/components/portal/live";
import { clientUploadTarget, staffUploadTarget, uploadFile, type UploadProgress } from "@/components/portal/upload";
import { ACCEPT_ATTRIBUTE, formatBytes } from "@/lib/portal/file-types";
import type { FolderItem, PortalFileItem, Usage } from "@/lib/portal/files";

/**
 * The file space: folders, drag-and-drop uploads with progress, previews, versions and a storage meter.
 * Files sent by the team are marked and never count against the client's space.
 */
type Data = { files: PortalFileItem[]; folders: FolderItem[]; usage: Usage };
type Queue = { key: string; name: string; progress: number; stage: UploadProgress["stage"]; error?: string; done?: boolean; saved?: number };
type Side = "client" | "staff";

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: init.body ? { "Content-Type": "application/json" } : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

export function FilesSpace({ side, clientId, compressImages, maxFileMb }: { side: Side; clientId?: string; compressImages: boolean; maxFileMb: number }) {
  const listUrl = side === "client" ? "/api/portal/files" : `/api/admin/portal/clients/${clientId}/files`;
  const apiBase = side === "client" ? "/api/portal" : "/api/admin/portal";
  const [data, setData] = useState<Data | null>(null);
  const [folder, setFolder] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [queue, setQueue] = useState<Queue[]>([]);
  const [menu, setMenu] = useState("");
  const [viewer, setViewer] = useState<{ files: PortalFileItem[]; index: number } | null>(null);
  const [versions, setVersions] = useState<{ file: PortalFileItem; list: PortalFileItem[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const versionInput = useRef<HTMLInputElement | null>(null);
  const versionFamily = useRef("");

  const load = useCallback(async () => {
    try { setData(await call<Data>(listUrl)); } catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Files couldn't load." }); }
  }, [listUrl]);
  useEffect(() => { void load(); }, [load]);
  useLiveEvents((event) => { if (event.type === "files" || event.type === "resync") void load(); });
  useEffect(() => { try { const saved = window.localStorage.getItem("files-view"); if (saved === "list" || saved === "grid") setView(saved); } catch { /* ignore */ } }, []);

  const target = side === "client" ? clientUploadTarget() : staffUploadTarget(clientId || "");

  function upload(files: FileList | File[], extra: Record<string, unknown> = {}) {
    const folderId = folder !== "all" && folder !== "team" && folder !== "media" ? folder : "";
    for (const file of Array.from(files).slice(0, 50)) {
      const key = `${file.name}-${Math.random().toString(36).slice(2)}`;
      if (file.size > maxFileMb * 1024 * 1024 && !file.type.startsWith("image/")) {
        setQueue((current) => [...current, { key, name: file.name, progress: 0, stage: "uploading", error: `Larger than ${maxFileMb} MB.` }]);
        continue;
      }
      setQueue((current) => [...current, { key, name: file.name, progress: 0, stage: "compressing" }]);
      uploadFile(file, { ...target, extra: { ...target.extra, folderId, ...extra } }, {
        compressImages,
        onProgress: (progress) => setQueue((current) => current.map((item) => (item.key === key ? { ...item, stage: progress.stage, progress: progress.total ? progress.loaded / progress.total : 0 } : item))),
      })
        .then((stored) => {
          setQueue((current) => current.map((item) => (item.key === key ? { ...item, done: true, progress: 1, saved: stored.originalSize - stored.size } : item)));
          window.setTimeout(() => setQueue((current) => current.filter((item) => item.key !== key)), 5000);
          void load();
        })
        .catch((reason: Error) => setQueue((current) => current.map((item) => (item.key === key ? { ...item, error: reason.message } : item))));
    }
  }

  async function act(file: PortalFileItem, action: "rename" | "delete" | "move" | "versions" | "new-version", value?: string) {
    setMenu("");
    try {
      if (action === "rename") {
        const name = window.prompt("New name", file.name.replace(/\.[^.]+$/, ""));
        if (!name) return;
        await call(`${apiBase}/files/${file.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      }
      if (action === "move") await call(`${apiBase}/files/${file.id}`, { method: "PATCH", body: JSON.stringify({ folderId: value || null }) });
      if (action === "delete") {
        if (!window.confirm(`Delete “${file.name}”${file.versions > 1 ? ` and its ${file.versions} versions` : ""}? This can't be undone.`)) return;
        await call(`${apiBase}/files/${file.id}`, { method: "DELETE" });
        setNotice({ tone: "ok", text: `“${file.name}” was deleted and ${formatBytes(file.size)} freed.` });
      }
      if (action === "versions") {
        const result = await call<{ versions: PortalFileItem[] }>(`${apiBase}/files/${file.id}/versions`);
        setVersions({ file, list: result.versions });
        return;
      }
      if (action === "new-version") { versionFamily.current = file.familyId; versionInput.current?.click(); return; }
      await load();
    } catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "That didn't work." }); }
  }

  async function newFolder() {
    const name = window.prompt("Folder name", "Drawings");
    if (!name) return;
    try {
      const result = await call<{ folder: FolderItem }>(`${apiBase}/folders`, { method: "POST", body: JSON.stringify({ name }) });
      await load();
      setFolder(result.folder.id);
    } catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "The folder couldn't be created." }); }
  }

  const shown = useMemo(() => {
    const files = data?.files || [];
    return files.filter((file) => {
      if (file.meta.voice) return false;
      if (folder === "team" && file.uploadedBy !== "staff") return false;
      if (folder === "media" && file.kind !== "image" && file.kind !== "video") return false;
      if (folder !== "all" && folder !== "team" && folder !== "media" && file.folderId !== folder) return false;
      return !query || file.name.toLowerCase().includes(query.toLowerCase());
    });
  }, [data, folder, query]);

  const usage = data?.usage;
  const percent = usage ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100) : 0;
  const activeFolder = data?.folders.find((item) => item.id === folder);
  const onDrop = (event: DragEvent) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length) upload(event.dataTransfer.files); };

  return (
    <div className={`files${dragging ? " is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={onDrop}>
      <header className="files-head">
        <div>
          <p className="portal-eyebrow">{side === "client" ? "Your file space" : "Client file space"}</p>
          <h1>{side === "client" ? <>Files, <em>kept safe.</em></> : "Files"}</h1>
        </div>
        {usage && (
          <div className={`files-meter${percent > 90 ? " is-full" : ""}`}>
            <StorageIcon size={26} weight="duotone" />
            <div>
              <strong>{formatBytes(usage.usedBytes)} <span>of {formatBytes(usage.quotaBytes)}</span></strong>
              <span className="files-meter__bar"><i style={{ width: `${percent}%` }} /></span>
              <small>{side === "client" ? "Files from our team don't use your space." : "Only the client's own uploads count."} Photos are compressed automatically.</small>
            </div>
          </div>
        )}
      </header>

      <div className="files-toolbar">
        <button type="button" className="portal-btn portal-btn--primary" onClick={() => input.current?.click()}><CloudArrowUp size={18} weight="bold" /> Upload</button>
        {side === "client" && <button type="button" className="portal-btn portal-btn--ghost" onClick={() => void newFolder()}><FolderSimplePlus size={18} /> New folder</button>}
        <label className="chat-search files-search"><MagnifyingGlass size={17} /><input type="search" placeholder="Search files" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="files-view" role="group" aria-label="View">
          <button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => { setView("grid"); try { window.localStorage.setItem("files-view", "grid"); } catch { /* ignore */ } }} aria-label="Grid"><SquaresFour size={18} /></button>
          <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => { setView("list"); try { window.localStorage.setItem("files-view", "list"); } catch { /* ignore */ } }} aria-label="List"><ListIcon size={18} /></button>
        </div>
        <input ref={input} type="file" multiple hidden accept={ACCEPT_ATTRIBUTE} onChange={(event) => { if (event.target.files) upload(event.target.files); event.target.value = ""; }} />
        <input ref={versionInput} type="file" hidden accept={ACCEPT_ATTRIBUTE} onChange={(event) => { if (event.target.files?.[0]) upload([event.target.files[0]], { replaceFamilyId: versionFamily.current }); event.target.value = ""; }} />
      </div>

      <nav className="files-folders" aria-label="Folders">
        <button type="button" className={folder === "all" ? "is-active" : ""} onClick={() => setFolder("all")}><Stack size={17} weight="duotone" /> All files <em>{(data?.files || []).filter((file) => !file.meta.voice).length}</em></button>
        <button type="button" className={folder === "team" ? "is-active" : ""} onClick={() => setFolder("team")}><Handshake size={17} weight="duotone" /> From {side === "client" ? "our team" : "the team"}</button>
        <button type="button" className={folder === "media" ? "is-active" : ""} onClick={() => setFolder("media")}><Images size={17} weight="duotone" /> Photos & videos</button>
        {data?.folders.map((item) => (
          <button type="button" key={item.id} className={folder === item.id ? "is-active" : ""} onClick={() => setFolder(item.id)}><FolderSimple size={17} weight={folder === item.id ? "fill" : "duotone"} /> {item.name} <em>{item.count}</em></button>
        ))}
      </nav>
      {activeFolder && side === "client" && (
        <div className="files-folder-bar">
          <strong>{activeFolder.name}</strong>
          <button type="button" className="portal-link" onClick={async () => { const name = window.prompt("Rename folder", activeFolder.name); if (name) { await call(`${apiBase}/folders/${activeFolder.id}`, { method: "PATCH", body: JSON.stringify({ name }) }).catch(() => undefined); void load(); } }}>Rename</button>
          <button type="button" className="portal-link" onClick={async () => { if (window.confirm(`Remove the folder “${activeFolder.name}”? Its files move back to All files.`)) { await call(`${apiBase}/folders/${activeFolder.id}`, { method: "DELETE" }).catch(() => undefined); setFolder("all"); void load(); } }}>Remove folder</button>
        </div>
      )}

      {notice && <p className={`portal-alert portal-alert--${notice.tone}`} role="status">{notice.text} <button type="button" className="portal-alert__close" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={14} /></button></p>}

      {queue.length > 0 && (
        <ul className="files-queue" aria-live="polite">
          {queue.map((item) => (
            <li key={item.key} className={item.error ? "is-error" : item.done ? "is-done" : ""}>
              <span className="files-queue__name">{item.name}</span>
              <span className="files-queue__state">{item.error || (item.done ? (item.saved && item.saved > 50_000 ? `Done · ${formatBytes(item.saved)} saved by compression` : "Done") : item.stage === "compressing" ? "Preparing…" : item.stage === "checking" ? "Checking…" : `${Math.round(item.progress * 100)}%`)}</span>
              <span className="files-queue__bar"><i style={{ width: `${Math.round((item.done ? 1 : item.progress) * 100)}%` }} /></span>
              {(item.error || item.done) && <button type="button" className="chat-icon-btn chat-icon-btn--sm" onClick={() => setQueue((current) => current.filter((entry) => entry.key !== item.key))} aria-label="Dismiss"><X size={14} /></button>}
            </li>
          ))}
        </ul>
      )}

      {dragging && <div className="files-drop"><CloudArrowUp size={44} weight="duotone" /><strong>Drop to upload</strong><span>{activeFolder ? `Into “${activeFolder.name}”` : "Up to " + maxFileMb + " MB per file"}</span></div>}

      {data && shown.length > 0 && (
        <ul className={`files-grid files-grid--${view}`}>
          {shown.map((file, index) => (
            <li key={file.id} className="files-item">
              <button type="button" className="files-item__open" onClick={() => setViewer({ files: shown, index })}>
                <span className="files-item__thumb">
                  {file.kind === "image" ? <img src={fileUrl(apiBase, file.id)} alt="" loading="lazy" /> : file.kind === "video" ? <><video src={`${fileUrl(apiBase, file.id)}#t=0.5`} preload="metadata" muted playsInline /><span className="chat-media__play"><Play size={18} weight="fill" /></span></> : <FileGlyph file={file} size={view === "grid" ? 40 : 22} />}
                </span>
                <span className="files-item__text">
                  <strong title={file.name}>{file.name}</strong>
                  <small>{formatBytes(file.originalSize || file.size)} · {new Date(file.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</small>
                </span>
                <span className="files-item__tags">
                  {file.uploadedBy === "staff" && <em className="files-tag files-tag--team">From PCG</em>}
                  {file.versions > 1 && <em className="files-tag">v{file.version}</em>}
                </span>
              </button>
              <div className="files-item__menu">
                <button type="button" className="chat-icon-btn chat-icon-btn--sm" aria-label={`Options for ${file.name}`} onClick={() => setMenu(menu === file.id ? "" : file.id)}><DotsThreeVertical size={18} weight="bold" /></button>
                {menu === file.id && (
                  <div className="chat-menu" role="menu" onMouseLeave={() => setMenu("")}>
                    <a role="menuitem" href={fileUrl(apiBase, file.id, true)}><DownloadSimple size={16} /> Download</a>
                    {side === "client" && <button type="button" role="menuitem" onClick={() => void act(file, "rename")}><PencilSimple size={16} /> Rename</button>}
                    {(side === "staff" || file.uploadedBy === "client") && <button type="button" role="menuitem" onClick={() => void act(file, "new-version")}><ArrowsClockwise size={16} /> Upload new version</button>}
                    {file.versions > 1 && <button type="button" role="menuitem" onClick={() => void act(file, "versions")}><ClockCounterClockwise size={16} /> All versions ({file.versions})</button>}
                    {side === "client" && data.folders.length > 0 && (
                      <div className="chat-menu__group">
                        <span><ArrowsLeftRight size={14} /> Move to</span>
                        {file.folderId && <button type="button" role="menuitem" onClick={() => void act(file, "move", "")}>All files</button>}
                        {data.folders.filter((item) => item.id !== file.folderId).map((item) => <button type="button" role="menuitem" key={item.id} onClick={() => void act(file, "move", item.id)}>{item.name}</button>)}
                      </div>
                    )}
                    {(side === "staff" || file.uploadedBy === "client") && <button type="button" role="menuitem" className="is-danger" onClick={() => void act(file, "delete")}><Trash size={16} /> Delete</button>}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && !shown.length && (
        <button type="button" className="files-empty" onClick={() => input.current?.click()}>
          <CloudArrowUp size={46} weight="duotone" />
          <strong>{query ? "No files match your search." : folder === "team" ? "Nothing from the team yet." : "Drop files here, or tap to upload."}</strong>
          <span>Drawings, photos, PDFs, videos, Office files, DWG, IFC or ZIP — up to {maxFileMb} MB each.</span>
        </button>
      )}
      {!data && <div className="chat-skeleton" style={{ height: 320 }} />}

      {viewer && <FileViewer files={viewer.files} index={viewer.index} apiBase={apiBase} onClose={() => setViewer(null)} onIndex={(index) => setViewer((current) => current && { ...current, index })} />}
      {versions && (
        <div className="portal-modal" role="dialog" aria-modal="true" aria-label="Versions" onClick={(event) => { if (event.target === event.currentTarget) setVersions(null); }}>
          <div className="portal-modal__card">
            <header className="portal-modal__head"><h2>Versions of “{versions.file.name}”</h2><button type="button" className="chat-icon-btn" onClick={() => setVersions(null)} aria-label="Close"><X size={18} /></button></header>
            <ol className="files-versions">
              {versions.list.map((item) => (
                <li key={item.id}>
                  <span className="files-versions__n">v{item.version}</span>
                  <span><strong>{item.uploadedByName || (item.uploadedBy === "staff" ? "Our team" : "You")}</strong><small>{new Date(item.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {formatBytes(item.originalSize || item.size)}</small></span>
                  <a className="portal-link" href={fileUrl(apiBase, item.id, true)}>Download</a>
                  {versions.list.length > 1 && (side === "staff" || item.uploadedBy === "client") && (
                    <button type="button" className="portal-link portal-link--danger" onClick={async () => {
                      if (!window.confirm(`Delete version ${item.version}?`)) return;
                      await call(`${apiBase}/files/${item.id}?version=only`, { method: "DELETE" }).catch(() => undefined);
                      setVersions(null);
                      void load();
                    }}>Delete</button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
