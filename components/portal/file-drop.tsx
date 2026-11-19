"use client";

import { useRef, useState, type DragEvent } from "react";
import { formatBytes } from "@/components/portal/portal-fetch";
import { PORTAL_FILE_ACCEPT, PORTAL_FILE_MAX_MB } from "@/lib/portal/constants";

const ALLOWED = new Set(PORTAL_FILE_ACCEPT.split(",").map((extension) => extension.slice(1)));

/** Drag-and-drop file picker for business documents, used in the portal and the CMS. */
export function FileDrop({ files, onChange, max = 10, compact = false }: { files: File[]; onChange: (files: File[]) => void; max?: number; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState("");

  function add(list: FileList | File[]) {
    const incoming = Array.from(list);
    const rejected: string[] = [];
    const accepted = incoming.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const ok = ALLOWED.has(extension) && file.size > 0 && file.size <= PORTAL_FILE_MAX_MB * 1024 * 1024;
      if (!ok) rejected.push(file.name);
      return ok;
    });
    const next = [...files, ...accepted].slice(0, max);
    setProblem(rejected.length ? `Skipped ${rejected.join(", ")} — use PDF, images, Office, DWG/DXF or ZIP up to ${PORTAL_FILE_MAX_MB} MB.` : incoming.length + files.length > max ? `You can attach up to ${max} files at once.` : "");
    onChange(next);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) add(event.dataTransfer.files);
  }

  return (
    <div className={`file-drop${compact ? " file-drop--compact" : ""}${dragging ? " is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      {!compact && (
        <button type="button" className="file-drop__zone" onClick={() => input.current?.click()}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M14 3.5H7a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7.5z" /><path d="M14 3.5v4h4M12 11v6m-3-3 3-3 3 3" /></svg>
          <span><strong>Drop files here</strong> or click to choose</span>
          <small>PDF · images · Word · Excel · DWG/DXF · ZIP — up to {PORTAL_FILE_MAX_MB} MB each</small>
        </button>
      )}
      <input ref={input} type="file" multiple hidden accept={PORTAL_FILE_ACCEPT} onChange={(event) => { if (event.target.files) add(event.target.files); event.target.value = ""; }} />
      {compact && <button type="button" className="file-drop__attach" onClick={() => input.current?.click()} aria-label="Attach files"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m20 11.5-7.8 7.8a5 5 0 0 1-7-7l8.4-8.5a3.3 3.3 0 0 1 4.7 4.7L9.9 16.9a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" /></svg>Attach</button>}
      {files.length > 0 && (
        <ul className="file-drop__list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <span className="file-drop__ext">{file.name.split(".").pop()?.toUpperCase()}</span>
              <span className="file-drop__name">{file.name}</span>
              <span className="file-drop__size">{formatBytes(file.size)}</span>
              <button type="button" aria-label={`Remove ${file.name}`} onClick={() => onChange(files.filter((_, i) => i !== index))}>×</button>
            </li>
          ))}
        </ul>
      )}
      {problem && <p className="file-drop__problem">{problem}</p>}
    </div>
  );
}
