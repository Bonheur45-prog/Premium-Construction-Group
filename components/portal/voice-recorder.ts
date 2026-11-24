"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hold-to-record voice notes. Opus audio at 32 kbps: one minute is about 240 KB.
 * Chrome/Android/Firefox record WebM-Opus; iPhone Safari records MP4-AAC — both play everywhere we need.
 */
export type VoiceNote = { file: File; seconds: number; peaks: number[] };

function pickType() {
  const options = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
  return options.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) || "";
}

export function useVoiceRecorder(maxSeconds = 300) {
  const [state, setState] = useState<"idle" | "recording" | "denied" | "unsupported">("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const peaks = useRef<number[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  const started = useRef(0);
  const finish = useRef<((note: VoiceNote | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    window.clearInterval(timer.current);
    if (frame.current) cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setLevel(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    const type = pickType();
    if (!type || !navigator.mediaDevices?.getUserMedia) { setState("unsupported"); return false; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setState("denied");
      return false;
    }
    chunks.current = [];
    peaks.current = [];
    const media = new MediaRecorder(stream.current, { mimeType: type, audioBitsPerSecond: 32_000 });
    media.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
    media.onstop = () => {
      const duration = Math.max(1, Math.round((Date.now() - started.current) / 1000));
      const blob = new Blob(chunks.current, { type: media.mimeType });
      const extension = media.mimeType.includes("mp4") ? "m4a" : media.mimeType.includes("ogg") ? "ogg" : "weba";
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      const note = blob.size > 800 ? { file: new File([blob], `voice-note-${stamp}.${extension}`, { type: blob.type }), seconds: duration, peaks: compress(peaks.current) } : null;
      finish.current?.(note);
      finish.current = null;
    };
    // Live level meter for the recording waveform.
    const audio = new AudioContext();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 256;
    audio.createMediaStreamSource(stream.current).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const value of data) peak = Math.max(peak, Math.abs(value - 128));
      const normalised = Math.min(1, peak / 64);
      peaks.current.push(normalised);
      setLevel(normalised);
      frame.current = requestAnimationFrame(tick);
    };
    tick();
    started.current = Date.now();
    media.start(250);
    recorder.current = media;
    setSeconds(0);
    setState("recording");
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started.current) / 1000);
      setSeconds(elapsed);
      if (elapsed >= maxSeconds) recorder.current?.state === "recording" && recorder.current.stop();
    }, 250);
    return true;
  }, [maxSeconds]);

  /** Stops and returns the note (or null if cancelled / too short). */
  const stop = useCallback((keep: boolean) => new Promise<VoiceNote | null>((resolve) => {
    const media = recorder.current;
    setState("idle");
    if (!media || media.state !== "recording") { cleanup(); resolve(null); return; }
    finish.current = keep ? resolve : () => resolve(null);
    media.stop();
    cleanup();
  }), [cleanup]);

  return { state, seconds, level, start, stop };
}

/** 48 bars for the message bubble's waveform. */
function compress(values: number[]) {
  const bars = 48;
  if (!values.length) return Array(bars).fill(0.15);
  const size = Math.max(1, Math.floor(values.length / bars));
  return Array.from({ length: bars }, (_, index) => {
    const slice = values.slice(index * size, index * size + size);
    return slice.length ? Math.max(0.12, Math.min(1, Math.max(...slice))) : 0.12;
  }).map((value) => Math.round(value * 100) / 100);
}
