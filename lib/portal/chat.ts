import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { getClientById, type Client } from "@/lib/clients/store";
import { pgQuery } from "@/lib/db/postgres";
import { getFeatures } from "@/lib/features";
import { type Actor, filesByIds, type PortalFileItem } from "@/lib/portal/files";
import { notifyNewMessage } from "@/lib/portal/notify";
import { isOnline, onlineClientIds, publishBoth } from "@/lib/portal/realtime";
import { HttpError } from "@/lib/server/http";

/**
 * The chat room: conversations between one client and the whole team (all staff see all
 * conversations). Messages carry text, files, voice notes, video-call invitations, quotes and
 * milestone updates. Internal notes are visible to staff only.
 */
export type ConversationStatus = "open" | "waiting" | "closed";
export type MessageKind = "text" | "voice" | "call" | "quote" | "milestone" | "meeting" | "system";

type ConversationRow = {
  id: string; client_id: string; subject: string; status: ConversationStatus; request_id: string | null; project_id: string | null; assigned_to: string;
  created_by_type: "client" | "staff"; last_message_at: Date; last_preview: string; client_read_seq: string; staff_read_seq: string; created_at: Date;
};
type MessageRow = {
  seq: string; id: string; conversation_id: string; author_type: "client" | "staff" | "system"; author_id: string; author_name: string; kind: MessageKind;
  body: string; file_ids: string[]; meta: Record<string, unknown>; reply_to: string; internal: boolean; pinned: boolean; edited_at: Date | null; deleted_at: Date | null; created_at: Date;
};

export type ConversationSummary = {
  id: string; clientId: string; clientName: string; clientCompany: string; subject: string; status: ConversationStatus; assignedTo: string;
  lastMessageAt: string; lastPreview: string; unread: number; clientOnline: boolean; createdAt: string; requestId: string | null; projectId: string | null;
};
export type ChatMessage = {
  id: string; seq: number; conversationId: string; authorType: "client" | "staff" | "system"; authorId: string; authorName: string; kind: MessageKind;
  body: string; files: PortalFileItem[]; meta: Record<string, unknown>; replyTo: { id: string; authorName: string; excerpt: string } | null;
  internal: boolean; pinned: boolean; editedAt: string | null; deleted: boolean; createdAt: string;
};
export type Viewer = { side: "client"; client: Client } | { side: "staff"; actor: Actor };

const preview = (kind: MessageKind, body: string, files: number) =>
  kind === "voice" ? "🎙 Voice note" : kind === "call" ? "Video call invitation" : kind === "quote" ? body || "Quote" : body ? body.replace(/\s+/g, " ").slice(0, 140) : files ? `${files} file${files === 1 ? "" : "s"}` : "";

function summary(row: ConversationRow & { client_name: string; client_company: string; unread: string }): ConversationSummary {
  return {
    id: row.id, clientId: row.client_id, clientName: row.client_name, clientCompany: row.client_company, subject: row.subject, status: row.status, assignedTo: row.assigned_to,
    lastMessageAt: row.last_message_at.toISOString(), lastPreview: row.last_preview, unread: Number(row.unread), clientOnline: isOnline(`client:${row.client_id}`),
    createdAt: row.created_at.toISOString(), requestId: row.request_id, projectId: row.project_id,
  };
}

async function toMessages(rows: MessageRow[], clientId: string, viewer: Viewer): Promise<ChatMessage[]> {
  const fileIds = [...new Set(rows.flatMap((row) => (row.deleted_at ? [] : row.file_ids)))];
  const files = new Map((await filesByIds(fileIds, clientId)).map((file) => [file.id, file]));
  const replyIds = [...new Set(rows.map((row) => row.reply_to).filter(Boolean))];
  const replies = new Map<string, MessageRow>();
  if (replyIds.length) {
    const result = await pgQuery<MessageRow>("SELECT * FROM pcg_messages WHERE id = ANY($1)", [replyIds]);
    result.rows.forEach((row) => replies.set(row.id, row));
  }
  return rows
    .filter((row) => viewer.side === "staff" || !row.internal)
    .map((row) => {
      const reply = row.reply_to ? replies.get(row.reply_to) : undefined;
      return {
        id: row.id, seq: Number(row.seq), conversationId: row.conversation_id, authorType: row.author_type, authorId: row.author_id, authorName: row.author_name, kind: row.kind,
        body: row.deleted_at ? "" : row.body, files: row.deleted_at ? [] : row.file_ids.map((id) => files.get(id)).filter((file): file is PortalFileItem => Boolean(file)),
        meta: row.deleted_at ? {} : row.meta, internal: row.internal, pinned: row.pinned && !row.deleted_at, editedAt: row.edited_at?.toISOString() || null, deleted: Boolean(row.deleted_at),
        createdAt: row.created_at.toISOString(),
        replyTo: reply && (viewer.side === "staff" || !reply.internal) ? { id: reply.id, authorName: reply.author_name, excerpt: reply.deleted_at ? "Message deleted" : preview(reply.kind, reply.body, reply.file_ids.length) } : null,
      };
    });
}

export async function listConversations(viewer: Viewer, { search = "", status = "" }: { search?: string; status?: string } = {}) {
  const values: unknown[] = [];
  const where: string[] = [];
  if (viewer.side === "client") { values.push(viewer.client.id); where.push(`c.client_id = $${values.length}`); }
  if (status === "open" || status === "waiting" || status === "closed") { values.push(status); where.push(`c.status = $${values.length}`); }
  if (search.trim()) {
    values.push(`%${search.trim().slice(0, 80)}%`, search.trim().slice(0, 80));
    const like = `$${values.length - 1}`, query = `$${values.length}`;
    where.push(`(c.subject ILIKE ${like} OR cl.name ILIKE ${like} OR cl.company ILIKE ${like} OR EXISTS (
      SELECT 1 FROM pcg_messages sm WHERE sm.conversation_id = c.id AND sm.deleted_at IS NULL ${viewer.side === "client" ? "AND NOT sm.internal" : ""}
        AND (sm.body ILIKE ${like} OR to_tsvector('simple', sm.body) @@ plainto_tsquery('simple', ${query}))))`);
  }
  const side = viewer.side;
  const result = await pgQuery<ConversationRow & { client_name: string; client_company: string; unread: string }>(
    `SELECT c.*, cl.name AS client_name, cl.company AS client_company,
       (SELECT COUNT(*) FROM pcg_messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL AND m.author_type <> '${side}'
         AND m.seq > c.${side}_read_seq ${side === "client" ? "AND NOT m.internal" : ""}) AS unread
     FROM pcg_conversations c JOIN pcg_clients cl ON cl.id = c.client_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY c.last_message_at DESC LIMIT 200`,
    values,
  );
  return result.rows.map(summary);
}

async function conversationFor(id: string, viewer: Viewer) {
  const result = await pgQuery<ConversationRow & { client_name: string; client_company: string; unread: string }>(
    `SELECT c.*, cl.name AS client_name, cl.company AS client_company, '0' AS unread FROM pcg_conversations c JOIN pcg_clients cl ON cl.id = c.client_id WHERE c.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row || (viewer.side === "client" && row.client_id !== viewer.client.id)) throw new HttpError(404, "Conversation not found.");
  return row;
}

export async function getConversation(id: string, viewer: Viewer, { before }: { before?: number } = {}) {
  const row = await conversationFor(id, viewer);
  const values: unknown[] = [id];
  let filter = "";
  if (before) { values.push(before); filter = `AND seq < $2`; }
  const messages = await pgQuery<MessageRow>(
    `SELECT * FROM (SELECT * FROM pcg_messages WHERE conversation_id = $1 ${filter} ${viewer.side === "client" ? "AND NOT internal" : ""} ORDER BY seq DESC LIMIT 60) recent ORDER BY seq`,
    values,
  );
  const pinned = await pgQuery<MessageRow>(`SELECT * FROM pcg_messages WHERE conversation_id = $1 AND pinned AND deleted_at IS NULL ${viewer.side === "client" ? "AND NOT internal" : ""} ORDER BY seq DESC LIMIT 20`, [id]);
  return {
    conversation: summary(row),
    readSeq: { client: Number(row.client_read_seq), staff: Number(row.staff_read_seq) },
    messages: await toMessages(messages.rows, row.client_id, viewer),
    pinned: await toMessages(pinned.rows, row.client_id, viewer),
    hasMore: messages.rows.length === 60,
  };
}

export async function createConversation(input: { clientId: string; subject: unknown; actor: Actor; requestId?: string | null; projectId?: string | null }) {
  if (!(await getFeatures()).chat.enabled) throw new HttpError(404, "Messages are switched off at the moment.");
  const subject = String(input.subject || "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (subject.length < 3) throw new HttpError(400, "Give the conversation a short subject, for example “Kicukiro villa – drawings”.");
  const id = randomUUID();
  await pgQuery(
    `INSERT INTO pcg_conversations (id, client_id, subject, status, request_id, project_id, created_by_type, assigned_to) VALUES ($1, $2, $3, 'open', $4, $5, $6, $7)`,
    [id, input.clientId, subject, input.requestId || null, input.projectId || null, input.actor.type, input.actor.type === "staff" ? input.actor.name : ""],
  );
  publishBoth(input.clientId, { type: "conversation", conversationId: id });
  return id;
}

/** Posts a message, updates the conversation and alerts the other side. */
export async function sendMessage(conversationId: string, viewer: Viewer, input: {
  body?: unknown; fileIds?: unknown; replyTo?: unknown; kind?: MessageKind; meta?: Record<string, unknown>; internal?: boolean; origin: string;
}) {
  const features = await getFeatures();
  if (!features.chat.enabled) throw new HttpError(404, "Messages are switched off at the moment.");
  const conversation = await conversationFor(conversationId, viewer);
  const kind: MessageKind = input.kind || "text";
  if (kind === "voice" && !features.chat.voiceNotes) throw new HttpError(400, "Voice notes are switched off.");
  if (kind === "call" && !features.chat.videoCalls) throw new HttpError(400, "Video calls are switched off.");
  const body = String(input.body ?? "").replace(/\r\n/g, "\n").trim().slice(0, 8000);
  const fileIds = Array.isArray(input.fileIds) ? [...new Set(input.fileIds.filter((id): id is string => typeof id === "string"))].slice(0, 20) : [];
  const files = await filesByIds(fileIds, conversation.client_id);
  if (files.length !== fileIds.length) throw new HttpError(400, "One of the files is no longer available. Remove it and try again.");
  if (!body && !files.length && kind === "text") throw new HttpError(400, "Write a message or attach a file.");
  const replyTo = typeof input.replyTo === "string" ? input.replyTo : "";
  const internal = viewer.side === "staff" && Boolean(input.internal);
  const author = viewer.side === "client"
    ? { type: "client" as const, id: viewer.client.id, name: viewer.client.name }
    : { type: viewer.actor.type === "staff" ? ("staff" as const) : ("system" as const), id: viewer.actor.id, name: viewer.actor.name };
  const id = randomUUID();
  const inserted = await pgQuery<MessageRow>(
    `INSERT INTO pcg_messages (id, conversation_id, author_type, author_id, author_name, kind, body, file_ids, meta, reply_to, internal)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [id, conversationId, author.type, author.id, author.name, kind, body, JSON.stringify(fileIds), JSON.stringify(input.meta || {}), replyTo, internal],
  );
  const seq = Number(inserted.rows[0].seq);
  const text = preview(kind, body, files.length);
  if (!internal) {
    // A client message re-opens the conversation; a team reply marks it as waiting on the client.
    const status = author.type === "client" ? "open" : conversation.status === "closed" ? "closed" : "waiting";
    await pgQuery(
      `UPDATE pcg_conversations SET last_message_at = NOW(), last_preview = $2, status = $3, ${author.type === "client" ? "client_read_seq" : "staff_read_seq"} = $4 WHERE id = $1`,
      [conversationId, `${author.type === "staff" ? "Team: " : ""}${text}`.slice(0, 160), status, seq],
    );
  }
  const [message] = await toMessages(inserted.rows, conversation.client_id, viewer.side === "client" ? viewer : { side: "staff", actor: viewer.actor });
  publishBoth(conversation.client_id, { type: "message", conversationId, message }, { staffOnly: internal });
  publishBoth(conversation.client_id, { type: "conversation", conversationId }, { staffOnly: internal });
  if (!internal && author.type !== "system") {
    const client = viewer.side === "client" ? viewer.client : await getClientById(conversation.client_id);
    if (client) {
      notifyNewMessage({
        conversationId, subject: conversation.subject, seq, to: author.type === "client" ? "staff" : "client",
        client: { id: client.id, name: client.name, email: client.email, notifyEmail: client.notifyEmail }, fromName: author.name, preview: text, origin: input.origin,
      });
    }
  }
  return message;
}

async function ownMessage(messageId: string, viewer: Viewer) {
  const result = await pgQuery<MessageRow & { client_id: string }>(
    "SELECT m.*, c.client_id FROM pcg_messages m JOIN pcg_conversations c ON c.id = m.conversation_id WHERE m.id = $1",
    [messageId],
  );
  const row = result.rows[0];
  if (!row || (viewer.side === "client" && (row.client_id !== viewer.client.id || row.internal))) throw new HttpError(404, "Message not found.");
  return row;
}

async function republish(row: MessageRow & { client_id: string }, viewer: Viewer) {
  const fresh = await pgQuery<MessageRow>("SELECT * FROM pcg_messages WHERE id = $1", [row.id]);
  const [message] = await toMessages(fresh.rows, row.client_id, { side: "staff", actor: { type: "staff", id: "", name: "" } });
  publishBoth(row.client_id, { type: "message-update", conversationId: row.conversation_id, message }, { staffOnly: row.internal });
  void viewer;
  return message;
}

function assertAuthor(row: MessageRow, viewer: Viewer, editMinutes: number) {
  const mine = viewer.side === "client" ? row.author_type === "client" && row.author_id === viewer.client.id : row.author_type === "staff" && row.author_id === viewer.actor.id;
  if (!mine) throw new HttpError(403, "You can only change your own messages.");
  if (row.deleted_at) throw new HttpError(400, "This message was deleted.");
  if (row.kind !== "text" && row.kind !== "voice") throw new HttpError(400, "This kind of message can't be changed.");
  if (Date.now() - row.created_at.getTime() > editMinutes * 60_000) throw new HttpError(400, `Messages can be changed for ${editMinutes} minutes after sending.`);
}

export async function editMessage(messageId: string, viewer: Viewer, body: unknown) {
  const features = await getFeatures();
  const row = await ownMessage(messageId, viewer);
  assertAuthor(row, viewer, features.chat.editMinutes);
  if (row.kind !== "text") throw new HttpError(400, "Only written messages can be edited.");
  const text = String(body ?? "").trim().slice(0, 8000);
  if (!text && !row.file_ids.length) throw new HttpError(400, "A message can't be empty — delete it instead.");
  await pgQuery("UPDATE pcg_messages SET body = $2, edited_at = NOW() WHERE id = $1", [messageId, text]);
  return republish(row, viewer);
}

export async function deleteMessage(messageId: string, viewer: Viewer) {
  const features = await getFeatures();
  const row = await ownMessage(messageId, viewer);
  assertAuthor(row, viewer, features.chat.editMinutes);
  await pgQuery("UPDATE pcg_messages SET deleted_at = NOW(), pinned = FALSE WHERE id = $1", [messageId]);
  return republish(row, viewer);
}

export async function pinMessage(messageId: string, viewer: Viewer, pinned: boolean) {
  const row = await ownMessage(messageId, viewer);
  if (row.deleted_at) throw new HttpError(400, "This message was deleted.");
  await pgQuery("UPDATE pcg_messages SET pinned = $2 WHERE id = $1", [messageId, pinned]);
  return republish(row, viewer);
}

export async function markRead(conversationId: string, viewer: Viewer, seq: unknown) {
  const conversation = await conversationFor(conversationId, viewer);
  const value = Math.floor(Number(seq));
  if (!Number.isFinite(value) || value <= 0) return;
  const column = viewer.side === "client" ? "client_read_seq" : "staff_read_seq";
  const result = await pgQuery<{ seq: string }>(`UPDATE pcg_conversations SET ${column} = GREATEST(${column}, $2) WHERE id = $1 RETURNING ${column} AS seq`, [conversationId, value]);
  publishBoth(conversation.client_id, { type: "read", conversationId, side: viewer.side, seq: Number(result.rows[0]?.seq || value) });
}

export async function typing(conversationId: string, viewer: Viewer) {
  const conversation = await conversationFor(conversationId, viewer);
  publishBoth(conversation.client_id, { type: "typing", conversationId, side: viewer.side, name: viewer.side === "client" ? viewer.client.name : viewer.actor.name });
}

export async function updateConversation(conversationId: string, viewer: Viewer, changes: { status?: unknown; subject?: unknown; assignedTo?: unknown }) {
  const conversation = await conversationFor(conversationId, viewer);
  const sets: string[] = [];
  const values: unknown[] = [conversationId];
  if (changes.subject !== undefined) {
    const subject = String(changes.subject).replace(/\s+/g, " ").trim().slice(0, 120);
    if (subject.length >= 3) { values.push(subject); sets.push(`subject = $${values.length}`); }
  }
  if (changes.status === "open" || changes.status === "waiting" || changes.status === "closed") {
    if (viewer.side === "client" && changes.status === "waiting") throw new HttpError(400, "Not allowed.");
    values.push(changes.status); sets.push(`status = $${values.length}`);
  }
  if (viewer.side === "staff" && typeof changes.assignedTo === "string") { values.push(changes.assignedTo.slice(0, 60)); sets.push(`assigned_to = $${values.length}`); }
  if (!sets.length) return;
  await pgQuery(`UPDATE pcg_conversations SET ${sets.join(", ")} WHERE id = $1`, values);
  publishBoth(conversation.client_id, { type: "conversation", conversationId });
}

/** A private video room on Jitsi Meet (free, no account needed). The link is posted in the chat. */
export async function startCall(conversationId: string, viewer: Viewer, origin: string) {
  const room = `PCG-${randomBytes(9).toString("base64url")}`;
  return sendMessage(conversationId, viewer, { kind: "call", body: "", meta: { url: `https://meet.jit.si/${room}`, room }, origin });
}

/** System entries (quote sent, milestone completed…) posted into the client's main conversation. */
export async function postSystemMessage(clientId: string, input: { kind: MessageKind; body: string; meta: Record<string, unknown>; conversationId?: string | null; origin: string; subject?: string }) {
  if (!(await getFeatures()).chat.enabled) return null;
  let conversationId = input.conversationId || null;
  if (!conversationId) {
    const latest = await pgQuery<{ id: string }>("SELECT id FROM pcg_conversations WHERE client_id = $1 AND status <> 'closed' ORDER BY last_message_at DESC LIMIT 1", [clientId]);
    conversationId = latest.rows[0]?.id || (await createConversation({ clientId, subject: input.subject || "Project updates", actor: { type: "staff", id: "", name: "Premium Construction Group" } }));
  }
  return sendMessage(conversationId, { side: "staff", actor: { type: "staff", id: "", name: "Premium Construction Group" } }, { kind: input.kind, body: input.body, meta: input.meta, origin: input.origin });
}

export function onlineClients() {
  return onlineClientIds();
}

export async function unreadTotals(viewer: Viewer) {
  const list = await listConversations(viewer);
  return list.reduce((total, item) => total + item.unread, 0);
}
