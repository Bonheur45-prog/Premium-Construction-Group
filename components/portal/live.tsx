"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * One live connection per open tab (Server-Sent Events). Components subscribe to the events they
 * care about. Reconnects on its own after network drops; when the tab comes back to the front it
 * tells subscribers to refresh, in case something was missed while the phone was asleep.
 */
export type LiveEvent =
  | { type: "message" | "message-update"; conversationId: string; message: unknown }
  | { type: "conversation"; conversationId: string }
  | { type: "read"; conversationId: string; side: "client" | "staff"; seq: number }
  | { type: "typing"; conversationId: string; side: "client" | "staff"; name: string }
  | { type: "presence"; clientId?: string; online: boolean; side: "client" | "staff" }
  | { type: "files" }
  | { type: "quote"; quoteId: string }
  | { type: "project"; projectId: string }
  | { type: "resync" };

type Listener = (event: LiveEvent) => void;
type LiveState = { subscribe: (listener: Listener) => () => void; connected: boolean; staffOnline: boolean; onlineClients: Set<string> };

const LiveContext = createContext<LiveState>({ subscribe: () => () => {}, connected: false, staffOnline: false, onlineClients: new Set() });

export function LiveProvider({ url, children }: { url: string; children: ReactNode }) {
  const listeners = useRef(new Set<Listener>());
  const [connected, setConnected] = useState(false);
  const [staffOnline, setStaffOnline] = useState(false);
  const [onlineClients, setOnlineClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: number | undefined;
    let attempts = 0;
    const emit = (event: LiveEvent) => listeners.current.forEach((listener) => listener(event));
    const connect = () => {
      source = new EventSource(url);
      source.addEventListener("hello", (event) => {
        attempts = 0;
        setConnected(true);
        const data = JSON.parse((event as MessageEvent).data) as { staffOnline?: boolean; onlineClients?: string[] };
        setStaffOnline(Boolean(data.staffOnline));
        if (data.onlineClients) setOnlineClients(new Set(data.onlineClients));
        emit({ type: "resync" });
      });
      source.addEventListener("live", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as LiveEvent;
        if (data.type === "presence") {
          if (data.side === "staff") setStaffOnline(data.online);
          else if (data.clientId) setOnlineClients((current) => { const next = new Set(current); if (data.online) next.add(data.clientId!); else next.delete(data.clientId!); return next; });
        }
        emit(data);
      });
      source.onerror = () => {
        setConnected(false);
        source?.close();
        attempts += 1;
        retry = window.setTimeout(connect, Math.min(30_000, 1000 * 2 ** Math.min(attempts, 5)));
      };
    };
    connect();
    const onVisible = () => { if (document.visibilityState === "visible") emit({ type: "resync" }); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { source?.close(); window.clearTimeout(retry); document.removeEventListener("visibilitychange", onVisible); };
  }, [url]);

  const subscribe = useCallback((listener: Listener) => { listeners.current.add(listener); return () => { listeners.current.delete(listener); }; }, []);
  const value = useMemo<LiveState>(() => ({ connected, staffOnline, onlineClients, subscribe }), [connected, staffOnline, onlineClients, subscribe]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  return useContext(LiveContext);
}

/** Runs `handler` for every live event while the component is mounted. */
export function useLiveEvents(handler: Listener) {
  const { subscribe } = useLive();
  const saved = useRef(handler);
  useEffect(() => { saved.current = handler; });
  useEffect(() => subscribe((event) => saved.current(event)), [subscribe]);
}
