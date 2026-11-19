"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<void> | null = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; reject(new Error("Turnstile failed to load")); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Reads the site key the server put in <meta name="pcg-turnstile">, so keys can change without a rebuild. */
export function turnstileSiteKeyFromPage() {
  if (typeof document === "undefined") return "";
  return document.querySelector<HTMLMetaElement>('meta[name="pcg-turnstile"]')?.content || "";
}

/**
 * Cloudflare Turnstile check for public forms. Renders nothing when Turnstile isn't configured.
 * Change `resetSignal` after each submit to get a fresh token.
 */
export function TurnstileField({ onToken, resetSignal = 0 }: { onToken: (token: string) => void; resetSignal?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const tokenHandler = useRef(onToken);
  tokenHandler.current = onToken;

  useEffect(() => {
    const siteKey = turnstileSiteKeyFromPage();
    if (!siteKey || !container.current) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !container.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        theme: "light",
        appearance: "interaction-only",
        callback: (token: string) => tokenHandler.current(token),
        "expired-callback": () => tokenHandler.current(""),
        "error-callback": () => tokenHandler.current(""),
      });
    }).catch(() => tokenHandler.current(""));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetSignal && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      tokenHandler.current("");
    }
  }, [resetSignal]);

  return <div ref={container} className="turnstile-field" />;
}
