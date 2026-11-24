import "server-only";

import { sendNotification, setVapidDetails } from "web-push";
import { pgQuery } from "@/lib/db/postgres";
import { sendEmail, staffNotifyEmail } from "@/lib/email/send";
import { renderEmail, renderText, type EmailBlock } from "@/lib/email/template";
import { getFeatures } from "@/lib/features";
import { isOnline } from "@/lib/portal/realtime";

/**
 * Notifications for the client space.
 *  - Phone / desktop alerts (Web Push) go out at once when the person isn't looking at the portal.
 *    Needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (mailto:…) in the server's .env.
 *  - One summary email follows if a message is still unread after 15 minutes, so nobody is flooded.
 */
export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady || !pushConfigured()) return vapidReady;
  setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@example.com", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  vapidReady = true;
  return true;
}

export async function saveSubscription(owner: { type: "client" | "staff"; id: string }, subscription: unknown) {
  const value = subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof value?.endpoint !== "string" || !/^https:\/\//.test(value.endpoint) || typeof value.keys?.p256dh !== "string" || typeof value.keys?.auth !== "string") return false;
  await pgQuery(
    `INSERT INTO pcg_push_subscriptions (endpoint, owner_type, owner_id, p256dh, auth) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET owner_type = EXCLUDED.owner_type, owner_id = EXCLUDED.owner_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [value.endpoint.slice(0, 1000), owner.type, owner.id, value.keys.p256dh.slice(0, 200), value.keys.auth.slice(0, 100)],
  );
  return true;
}

export async function removeSubscription(endpoint: unknown) {
  if (typeof endpoint === "string") await pgQuery("DELETE FROM pcg_push_subscriptions WHERE endpoint = $1", [endpoint]);
}

type Alert = { title: string; body: string; url: string; tag?: string };

export async function pushTo(owner: { type: "client" | "staff"; id?: string }, alert: Alert) {
  if (!(await getFeatures()).push.enabled || !ensureVapid()) return;
  const rows = owner.type === "staff"
    ? await pgQuery<{ endpoint: string; p256dh: string; auth: string }>("SELECT endpoint, p256dh, auth FROM pcg_push_subscriptions WHERE owner_type = 'staff'")
    : await pgQuery<{ endpoint: string; p256dh: string; auth: string }>("SELECT endpoint, p256dh, auth FROM pcg_push_subscriptions WHERE owner_type = 'client' AND owner_id = $1", [owner.id]);
  await Promise.all(rows.rows.map(async (row) => {
    try {
      await sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(alert), { TTL: 3600 });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await removeSubscription(row.endpoint); // the phone unsubscribed
    }
  }));
}

const pending = new Map<string, NodeJS.Timeout>();

/**
 * New message in a conversation: alert the other side now (if not online), and email them once if it's
 * still unread after 15 minutes. Several messages in a row produce one email.
 */
export function notifyNewMessage(input: {
  conversationId: string; subject: string; seq: number; to: "client" | "staff";
  client: { id: string; name: string; email: string; notifyEmail: boolean }; fromName: string; preview: string; origin: string;
}) {
  const url = input.to === "client" ? `/account/messages/${input.conversationId}` : `/admin/messages/${input.conversationId}`;
  const channel = input.to === "client" ? (`client:${input.client.id}` as const) : ("staff" as const);
  if (!isOnline(channel)) {
    void pushTo(input.to === "client" ? { type: "client", id: input.client.id } : { type: "staff" }, {
      title: input.to === "client" ? `${input.fromName} · ${input.subject}` : `${input.client.name} · ${input.subject}`,
      body: input.preview.slice(0, 140),
      url,
      tag: `conversation-${input.conversationId}`,
    }).catch(() => undefined);
  }
  const key = `${input.conversationId}:${input.to}`;
  if (pending.has(key)) return;
  pending.set(key, setTimeout(() => {
    pending.delete(key);
    void emailIfUnread(input, url).catch(() => undefined);
  }, 15 * 60 * 1000));
}

async function emailIfUnread(input: Parameters<typeof notifyNewMessage>[0], url: string) {
  const column = input.to === "client" ? "client_read_seq" : "staff_read_seq";
  const state = await pgQuery<{ read: string; unread: string }>(
    `SELECT c.${column} AS read,
       (SELECT COUNT(*) FROM pcg_messages m WHERE m.conversation_id = c.id AND m.seq > c.${column} AND m.deleted_at IS NULL
         AND m.author_type <> $2 ${input.to === "client" ? "AND NOT m.internal" : ""}) AS unread
     FROM pcg_conversations c WHERE c.id = $1`,
    [input.conversationId, input.to],
  );
  const unread = Number(state.rows[0]?.unread || 0);
  if (!unread) return;
  const heading = unread === 1 ? "You have a new message" : `You have ${unread} new messages`;
  const blocks: EmailBlock[] = [
    { type: "paragraph", text: input.to === "client" ? `${input.fromName} replied in “${input.subject}”.` : `${input.client.name} wrote in “${input.subject}”.` },
    { type: "quote", text: input.preview.slice(0, 400) },
    { type: "button", label: "Open the conversation", href: `${input.origin}${url}` },
    { type: "note", text: input.to === "client" ? "You're receiving this because a message is waiting for you in your client space. You can switch these emails off in your profile." : "Sent because a client message is still unread." },
  ];
  if (input.to === "client") {
    if (!input.client.notifyEmail) return;
    await sendEmail({ to: input.client.email, toName: input.client.name, subject: `${heading} · ${input.subject}`, html: renderEmail({ eyebrow: "Your client space", heading, preheader: input.preview.slice(0, 90), blocks }), text: renderText(heading, blocks), tags: ["portal-chat"] });
  } else {
    await sendEmail({ to: staffNotifyEmail(), subject: `${input.client.name}: ${input.subject}`, html: renderEmail({ eyebrow: "Client messages", heading, preheader: input.preview.slice(0, 90), blocks }), text: renderText(heading, blocks), replyTo: input.client.email, tags: ["portal-chat"] });
  }
}
