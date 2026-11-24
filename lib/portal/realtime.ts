import "server-only";

import { EventEmitter } from "node:events";

/**
 * Live updates for the client space (new messages, read ticks, typing, who's online).
 * The site runs as a single Node process (PM2 fork mode), so an in-memory bus is enough —
 * no Redis, no extra service. Browsers listen through one Server-Sent Events stream each.
 *
 * Channels: "client:<clientId>" — everything a client may see; "staff" — everything staff see.
 */
export type LiveEvent =
  | { type: "message"; conversationId: string; message: unknown }
  | { type: "message-update"; conversationId: string; message: unknown }
  | { type: "conversation"; conversationId: string }
  | { type: "read"; conversationId: string; side: "client" | "staff"; seq: number }
  | { type: "typing"; conversationId: string; side: "client" | "staff"; name: string }
  | { type: "presence"; clientId?: string; online: boolean; side: "client" | "staff" }
  | { type: "files" }
  | { type: "quote"; quoteId: string }
  | { type: "project"; projectId: string };

type Bus = { emitter: EventEmitter; online: Map<string, number> };
const globalBus = globalThis as unknown as { __pcgBus?: Bus };
const bus: Bus = globalBus.__pcgBus ??= { emitter: Object.assign(new EventEmitter(), {}), online: new Map() };
bus.emitter.setMaxListeners(0);

export function publish(channel: "staff" | `client:${string}`, event: LiveEvent) {
  bus.emitter.emit(channel, event);
}

/** Sends an event to the client concerned and to every staff member. */
export function publishBoth(clientId: string, event: LiveEvent, { staffOnly = false }: { staffOnly?: boolean } = {}) {
  if (!staffOnly) publish(`client:${clientId}`, event);
  publish("staff", event);
}

export function isOnline(key: `client:${string}` | "staff") {
  return (bus.online.get(key) || 0) > 0;
}

export function onlineClientIds() {
  return [...bus.online.entries()].filter(([key, count]) => key.startsWith("client:") && count > 0).map(([key]) => key.slice(7));
}

/**
 * An SSE response that streams the given channel until the browser disconnects.
 * A heartbeat every 25 s keeps proxies (Caddy, mobile networks) from closing the connection.
 */
export function liveStream(request: Request, channel: "staff" | `client:${string}`, hello: Record<string, unknown> = {}) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { cleanup(); }
      };
      const listener = (event: LiveEvent) => send("live", event);
      bus.emitter.on(channel, listener);
      // Clients also hear when the team comes online or goes offline.
      if (channel.startsWith("client:")) bus.emitter.on("clients", listener);
      const before = bus.online.get(channel) || 0;
      bus.online.set(channel, before + 1);
      if (before === 0 && channel.startsWith("client:")) publish("staff", { type: "presence", clientId: channel.slice(7), online: true, side: "client" });
      if (before === 0 && channel === "staff") bus.emitter.emit("clients", { type: "presence", online: true, side: "staff" } satisfies LiveEvent);
      send("hello", { ...hello, staffOnline: isOnline("staff") });
      const heartbeat = setInterval(() => { try { controller.enqueue(encoder.encode(": ping\n\n")); } catch { cleanup(); } }, 25_000);
      let closed = false;
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        bus.emitter.off(channel, listener);
        bus.emitter.off("clients", listener);
        const after = Math.max((bus.online.get(channel) || 1) - 1, 0);
        bus.online.set(channel, after);
        if (after === 0 && channel.startsWith("client:")) publish("staff", { type: "presence", clientId: channel.slice(7), online: false, side: "client" });
        if (after === 0 && channel === "staff") bus.emitter.emit("clients", { type: "presence", online: false, side: "staff" } satisfies LiveEvent);
        try { controller.close(); } catch { /* already closed */ }
      };
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
