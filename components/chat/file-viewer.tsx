"use client";

/* eslint-disable @next/next/no-img-element -- private files through short-lived signed links */
import { useEffect } from "react";
import { CaretLeft, CaretRight, DownloadSimple, X } from "@/components/icons";
import { FileGlyph, fileUrl } from "@/components/chat/message-parts";
import { formatBytes } from "@/lib/portal/file-types";
import type { PortalFileItem } from "@/lib/portal/files";

/** Full-screen preview: photos, PDFs, video and audio open in place; other files offer a download. */
export function FileViewer({ files, index, apiBase, onClose, onIndex, extra }: {
  files: PortalFileItem[]; index: number; apiBase: string; onClose: () => void; onIndex: (index: number) => void; extra?: React.ReactNode;
}) {
  const file = files[index];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index < files.length - 1) onIndex(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [index, files.length, onClose, onIndex]);
  if (!file) return null;
  const src = fileUrl(apiBase, file.id);
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={file.name} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <header className="viewer__bar">
        <span className="viewer__icon"><FileGlyph file={file} size={20} /></span>
        <span className="viewer__name"><strong>{file.name}</strong><small>{formatBytes(file.originalSize || file.size)} · {file.uploadedBy === "staff" ? `from ${file.uploadedByName || "our team"}` : file.uploadedByName}{file.version > 1 ? ` · version ${file.version}` : ""}</small></span>
        {extra}
        <a className="viewer__button" href={fileUrl(apiBase, file.id, true)} aria-label="Download"><DownloadSimple size={20} /><span>Download</span></a>
        <button type="button" className="viewer__button" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </header>
      <div className="viewer__stage" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        {file.kind === "image" && <img src={src} alt={file.name} />}
        {file.kind === "pdf" && <iframe src={src} title={file.name} />}
        {file.kind === "video" && <video src={src} controls autoPlay playsInline />}
        {file.kind === "audio" && <audio src={src} controls autoPlay />}
        {!["image", "pdf", "video", "audio"].includes(file.kind) && (
          <div className="viewer__card">
            <FileGlyph file={file} size={56} />
            <strong>{file.name}</strong>
            <p>This type of file can&apos;t be previewed in the browser. Download it to open it with the right program.</p>
            <a className="portal-btn portal-btn--primary" href={fileUrl(apiBase, file.id, true)}><DownloadSimple size={18} /> Download</a>
          </div>
        )}
      </div>
      {files.length > 1 && (
        <>
          <button type="button" className="viewer__nav viewer__nav--prev" disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Previous"><CaretLeft size={26} /></button>
          <button type="button" className="viewer__nav viewer__nav--next" disabled={index === files.length - 1} onClick={() => onIndex(index + 1)} aria-label="Next"><CaretRight size={26} /></button>
          <span className="viewer__count">{index + 1} / {files.length}</span>
        </>
      )}
    </div>
  );
}
