"use client";

/* eslint-disable @next/next/no-img-element -- private files are served through short-lived signed links */
import { useEffect, useRef, useState } from "react";
import {
  ArrowSquareOut, Check, Checks, DownloadSimple, File, FileAudio, FileDoc, FilePdf, FilePpt, FileText, FileVideo, FileXls, FileZip, Pause, Play, VideoCamera,
} from "@/components/icons";
import { ChangeOrderIcon, DrawingFileIcon, MilestoneIcon, SignOffIcon } from "@/components/icons/custom";
import { formatBytes, kindOfMime } from "@/lib/portal/file-types";
import type { ChatMessage } from "@/lib/portal/chat";
import type { PortalFileItem } from "@/lib/portal/files";

export function FileGlyph({ file, size = 22 }: { file: Pick<PortalFileItem, "mime" | "name">; size?: number }) {
  const kind = kindOfMime(file.mime, file.name);
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (kind === "pdf") return <FilePdf size={size} weight="duotone" />;
  if (kind === "video") return <FileVideo size={size} weight="duotone" />;
  if (kind === "audio") return <FileAudio size={size} weight="duotone" />;
  if (kind === "sheet") return <FileXls size={size} weight="duotone" />;
  if (kind === "slides") return <FilePpt size={size} weight="duotone" />;
  if (kind === "archive") return <FileZip size={size} weight="duotone" />;
  if (kind === "drawing") return <DrawingFileIcon size={size} weight="duotone" />;
  if (kind === "text") return <FileText size={size} weight="duotone" />;
  if (kind === "document" && ["doc", "docx"].includes(extension)) return <FileDoc size={size} weight="duotone" />;
  return <File size={size} weight="duotone" />;
}

export function fileUrl(apiBase: string, id: string, download = false) {
  return `${apiBase}/files/${id}${download ? "?download=1" : ""}`;
}

/** Images and videos as a tidy grid; documents as file cards. */
export function MessageFiles({ files, apiBase, onOpen }: { files: PortalFileItem[]; apiBase: string; onOpen: (file: PortalFileItem) => void }) {
  const media = files.filter((file) => file.kind === "image" || file.kind === "video");
  const other = files.filter((file) => file.kind !== "image" && file.kind !== "video");
  return (
    <>
      {media.length > 0 && (
        <div className={`chat-media chat-media--${Math.min(media.length, 4)}`}>
          {media.slice(0, 4).map((file, index) => (
            <button type="button" key={file.id} className="chat-media__item" onClick={() => onOpen(file)} aria-label={`Open ${file.name}`}>
              {file.kind === "image" ? <img src={fileUrl(apiBase, file.id)} alt="" loading="lazy" /> : <video src={`${fileUrl(apiBase, file.id)}#t=0.5`} preload="metadata" muted playsInline />}
              {file.kind === "video" && <span className="chat-media__play"><Play size={22} weight="fill" /></span>}
              {index === 3 && media.length > 4 && <span className="chat-media__more">+{media.length - 4}</span>}
            </button>
          ))}
        </div>
      )}
      {other.map((file) => (
        <div className="chat-file" key={file.id}>
          <button type="button" className="chat-file__open" onClick={() => onOpen(file)}>
            <span className="chat-file__icon"><FileGlyph file={file} /></span>
            <span className="chat-file__text"><strong>{file.name}</strong><small>{formatBytes(file.originalSize || file.size)}{file.version > 1 ? ` · version ${file.version}` : ""}</small></span>
          </button>
          <a className="chat-file__download" href={fileUrl(apiBase, file.id, true)} aria-label={`Download ${file.name}`} title="Download"><DownloadSimple size={18} /></a>
        </div>
      ))}
    </>
  );
}

function clock(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

/** Voice note bubble: play / pause, the recorded waveform (tap to jump), elapsed time. */
export function VoicePlayer({ src, peaks, duration, mine }: { src: string; peaks: number[]; duration: number; mine: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const total = duration || audio.current?.duration || 0;
  const bars = peaks.length ? peaks : Array(48).fill(0.3);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = () => {
    const element = audio.current;
    if (!element) return;
    if (element.paused) {
      document.querySelectorAll<HTMLAudioElement>("audio[data-voice]").forEach((other) => other !== element && other.pause());
      void element.play();
    } else element.pause();
  };
  return (
    <div className={`chat-voice${mine ? " is-mine" : ""}`}>
      <button type="button" className="chat-voice__play" onClick={toggle} aria-label={playing ? "Pause voice note" : "Play voice note"}>
        {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
      </button>
      <div
        className="chat-voice__wave"
        role="slider"
        aria-label="Position"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        onClick={(event) => {
          const element = audio.current;
          if (!element || !total) return;
          const rect = event.currentTarget.getBoundingClientRect();
          element.currentTime = ((event.clientX - rect.left) / rect.width) * total;
        }}
      >
        {bars.map((peak, index) => (
          <span key={index} style={{ height: `${Math.round(18 + peak * 82)}%` }} className={total && index / bars.length <= position / total ? "is-played" : ""} />
        ))}
      </div>
      <span className="chat-voice__time">{clock(playing || position ? position : total)}</span>
      <button type="button" className="chat-voice__speed" onClick={() => { const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; setSpeed(next); if (audio.current) audio.current.playbackRate = next; }}>{speed}×</button>
      <audio
        ref={audio}
        data-voice
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPosition(0); }}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      />
    </div>
  );
}

export function CallCard({ message }: { message: ChatMessage }) {
  const url = String(message.meta.url || "");
  return (
    <div className="chat-card chat-card--call">
      <span className="chat-card__icon"><VideoCamera size={24} weight="duotone" /></span>
      <div>
        <strong>Video call</strong>
        <p>{message.authorName} opened a private video room. It works in the browser on phone or computer — no app or account needed.</p>
        <a className="chat-card__action" href={url} target="_blank" rel="noopener noreferrer">Join the call <ArrowSquareOut size={15} /></a>
      </div>
    </div>
  );
}

export function QuoteCard({ message, href, money }: { message: ChatMessage; href: string; money: (value: number, currency: string) => string }) {
  const meta = message.meta as { ref?: string; title?: string; total?: number; currency?: string; kind?: string; revision?: number; response?: string };
  const isChange = meta.kind === "change_order";
  const response = meta.response;
  return (
    <div className={`chat-card chat-card--quote${response ? ` is-${response}` : ""}`}>
      <span className="chat-card__icon">{response === "accepted" ? <SignOffIcon size={24} weight="duotone" /> : isChange ? <ChangeOrderIcon size={24} weight="duotone" /> : <SignOffIcon size={24} weight="duotone" />}</span>
      <div>
        <small className="chat-card__eyebrow">{isChange ? "Change order" : "Quote"} · {meta.ref}{meta.revision && meta.revision > 1 ? ` · revision ${meta.revision}` : ""}</small>
        <strong>{response ? message.body : meta.title}</strong>
        {!response && typeof meta.total === "number" && <p className="chat-card__amount">{money(meta.total, meta.currency || "RWF")}</p>}
        <a className="chat-card__action" href={href}>{response ? "View" : "Review"} {isChange ? "change order" : "quote"} →</a>
      </div>
    </div>
  );
}

export function MilestoneCard({ message, href }: { message: ChatMessage; href: string }) {
  const meta = message.meta as { title?: string; project?: string; photos?: number };
  return (
    <div className="chat-card chat-card--milestone">
      <span className="chat-card__icon"><MilestoneIcon size={24} weight="duotone" /></span>
      <div>
        <small className="chat-card__eyebrow">Milestone reached · {meta.project}</small>
        <strong>{meta.title}</strong>
        {meta.photos ? <p>{meta.photos} site photo{meta.photos === 1 ? "" : "s"} added.</p> : null}
        <a className="chat-card__action" href={href}>See progress →</a>
      </div>
    </div>
  );
}

/** ✓ sent · ✓✓ read */
export function Ticks({ read }: { read: boolean }) {
  return <span className={`chat-ticks${read ? " is-read" : ""}`} aria-label={read ? "Read" : "Sent"} title={read ? "Read" : "Sent"}>{read ? <Checks size={15} weight="bold" /> : <Check size={15} weight="bold" />}</span>;
}
