import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pgQuery, pgTransaction, postgresEnabled } from "@/lib/db/postgres";
import {
  CATEGORY_LABEL, STATUS_LABEL, isRequestStatus,
  type PortalEvent, type PortalFile, type PortalRequestDetail, type PortalRequestSummary, type RequestPriority, type RequestStatus,
} from "@/lib/portal/constants";
import { HttpError } from "@/lib/server/http";

/** Client requests ("projects in conversation"): one record per enquiry/quote/job, with a timeline and documents. */

type Viewer = { type: "client"; clientId: string } | { type: "staff" };

export type NewRequestInput = {
  clientId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  company: string;
  category: string;
  title: string;
  description: string;
  location: string;
  budget: string;
  timeline: string;
  source: "portal" | "enquiry" | "reservation" | "staff";
  sourceId?: string;
  createdBy: { type: "client" | "staff"; id: string; name: string };
};

function requireDatabase() {
  if (!postgresEnabled()) throw new HttpError(503, "Requests are not available right now.");
}

const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : "");

function summaryFromRow(row: Record<string, unknown>, viewer: Viewer): PortalRequestSummary {
  const seen = viewer.type === "client" ? row.client_last_seen_at : row.staff_last_seen_at;
  const otherSide = viewer.type === "client" ? row.last_staff_activity_at : row.last_client_activity_at;
  return {
    id: String(row.id),
    ref: String(row.ref),
    title: String(row.title),
    category: String(row.category),
    status: isRequestStatus(row.status) ? row.status : "received",
    progress: Number(row.progress || 0),
    location: String(row.location || ""),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    unread: otherSide && (!seen || new Date(otherSide as string) > new Date(seen as string)) ? Number(row.unread_count || 1) : 0,
    lastActivity: iso(row.updated_at),
  };
}

async function nextRef(client: PoolClient) {
  const result = await client.query<{ n: string }>("SELECT nextval('pcg_request_ref_seq')::text AS n");
  return `PCG-${new Date().getFullYear()}-${result.rows[0].n.padStart(4, "0")}`;
}

async function insertEvent(client: PoolClient, requestId: string, event: { kind: PortalEvent["kind"]; authorType: PortalEvent["authorType"]; authorId?: string; authorName: string; body: string; visibility: "client" | "internal"; meta?: PortalEvent["meta"] }) {
  const id = randomUUID();
  await client.query(
    "INSERT INTO pcg_request_events (id, request_id, kind, author_type, author_id, author_name, body, visibility, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)",
    [id, requestId, event.kind, event.authorType, event.authorId || "", event.authorName.slice(0, 120), event.body.slice(0, 10_000), event.visibility, JSON.stringify(event.meta || {})],
  );
  const column = event.visibility === "internal" ? null : event.authorType === "client" ? "last_client_activity_at" : event.authorType === "staff" ? "last_staff_activity_at" : null;
  await client.query(`UPDATE pcg_requests SET updated_at = NOW()${column ? `, ${column} = NOW()` : ""} WHERE id = $1`, [requestId]);
  return id;
}

export async function createRequest(input: NewRequestInput) {
  requireDatabase();
  if (!CATEGORY_LABEL[input.category]) throw new HttpError(400, "Choose what kind of request this is.");
  return pgTransaction(async (client) => {
    const id = randomUUID();
    const ref = await nextRef(client);
    await client.query(
      `INSERT INTO pcg_requests (id, ref, client_id, contact_name, contact_email, contact_phone, company, category, title, description, location, budget, timeline, source, source_id, last_client_activity_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, CASE WHEN $16 THEN NOW() ELSE NULL END)`,
      [id, ref, input.clientId, input.contactName, input.contactEmail.toLowerCase(), input.contactPhone, input.company, input.category, input.title, input.description, input.location, input.budget, input.timeline, input.source, input.sourceId || "", input.createdBy.type === "client"],
    );
    await insertEvent(client, id, {
      kind: "system", authorType: "system", authorName: "", visibility: "client",
      body: input.source === "enquiry" ? "Request opened from your website enquiry." : input.createdBy.type === "staff" ? `Request opened by ${input.createdBy.name}.` : "Request submitted.",
    });
    return { id, ref };
  });
}

/** Requests a client can see (their own). */
export async function listClientRequests(clientId: string) {
  requireDatabase();
  const result = await pgQuery(
    `SELECT r.*, (SELECT COUNT(*) FROM pcg_request_events e WHERE e.request_id = r.id AND e.visibility = 'client' AND e.author_type = 'staff' AND (r.client_last_seen_at IS NULL OR e.created_at > r.client_last_seen_at))::int AS unread_count
     FROM pcg_requests r WHERE r.client_id = $1 ORDER BY r.updated_at DESC`,
    [clientId],
  );
  return result.rows.map((row) => summaryFromRow(row, { type: "client", clientId }));
}

export type StaffRequestRow = PortalRequestSummary & { contactName: string; contactEmail: string; company: string; priority: RequestPriority; assignedTo: string; clientId: string | null; source: string };

export async function listStaffRequests({ status, search, assigned }: { status?: string; search?: string; assigned?: string } = {}): Promise<StaffRequestRow[]> {
  requireDatabase();
  const where: string[] = [];
  const values: unknown[] = [];
  if (status === "open") where.push("r.status NOT IN ('completed','closed')");
  else if (status === "waiting") where.push("r.last_client_activity_at IS NOT NULL AND (r.staff_last_seen_at IS NULL OR r.last_client_activity_at > r.staff_last_seen_at) AND r.status <> 'closed'");
  else if (isRequestStatus(status)) { values.push(status); where.push(`r.status = $${values.length}`); }
  if (assigned) { values.push(assigned); where.push(`r.assigned_to = $${values.length}`); }
  if (search) {
    values.push(`%${search.toLowerCase().slice(0, 80)}%`);
    where.push(`(lower(r.ref) LIKE $${values.length} OR lower(r.title) LIKE $${values.length} OR lower(r.contact_name) LIKE $${values.length} OR lower(r.contact_email) LIKE $${values.length} OR lower(r.company) LIKE $${values.length} OR lower(r.location) LIKE $${values.length})`);
  }
  const result = await pgQuery(
    `SELECT r.*, (SELECT COUNT(*) FROM pcg_request_events e WHERE e.request_id = r.id AND e.author_type = 'client' AND (r.staff_last_seen_at IS NULL OR e.created_at > r.staff_last_seen_at))::int AS unread_count
     FROM pcg_requests r ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY CASE r.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, r.updated_at DESC LIMIT 500`,
    values,
  );
  return result.rows.map((row) => ({
    ...summaryFromRow(row, { type: "staff" }),
    contactName: String(row.contact_name),
    contactEmail: String(row.contact_email),
    company: String(row.company || ""),
    priority: row.priority as RequestPriority,
    assignedTo: String(row.assigned_to || ""),
    clientId: row.client_id ? String(row.client_id) : null,
    source: String(row.source),
  }));
}

async function loadRow(where: string, value: string) {
  const result = await pgQuery(`SELECT * FROM pcg_requests WHERE ${where} = $1`, [value]);
  return result.rows[0] as Record<string, unknown> | undefined;
}

/** Full request for a viewer. Clients only see their own requests and never internal notes or internal files. */
export async function getRequestDetail(key: { id?: string; ref?: string }, viewer: Viewer): Promise<PortalRequestDetail | null> {
  requireDatabase();
  const row = key.id ? await loadRow("id", key.id) : key.ref ? await loadRow("ref", key.ref.toUpperCase()) : undefined;
  if (!row) return null;
  if (viewer.type === "client" && row.client_id !== viewer.clientId) return null;
  const clientOnly = viewer.type === "client" ? "AND visibility = 'client'" : "";
  const [events, files] = await Promise.all([
    pgQuery(`SELECT * FROM pcg_request_events WHERE request_id = $1 ${clientOnly} ORDER BY created_at ASC`, [row.id]),
    pgQuery(`SELECT * FROM pcg_request_files WHERE request_id = $1 ${clientOnly} ORDER BY created_at DESC`, [row.id]),
  ]);
  return {
    ...summaryFromRow(row, viewer),
    description: String(row.description || ""),
    budget: String(row.budget || ""),
    timeline: String(row.timeline || ""),
    priority: row.priority as RequestPriority,
    contactName: String(row.contact_name),
    contactEmail: String(row.contact_email),
    contactPhone: String(row.contact_phone || ""),
    company: String(row.company || ""),
    clientId: row.client_id ? String(row.client_id) : null,
    assignedTo: viewer.type === "staff" ? String(row.assigned_to || "") : "",
    source: String(row.source),
    events: events.rows.map((event) => ({
      id: String(event.id),
      kind: event.kind,
      authorType: event.author_type,
      authorName: String(event.author_name || ""),
      body: String(event.body || ""),
      visibility: event.visibility,
      meta: (event.meta || {}) as PortalEvent["meta"],
      createdAt: iso(event.created_at),
    })),
    files: files.rows.map((file) => ({
      id: String(file.id),
      eventId: String(file.event_id || ""),
      uploadedByType: file.uploaded_by_type,
      uploadedByName: String(file.uploaded_by_name || ""),
      category: String(file.category),
      filename: String(file.filename),
      mime: String(file.mime),
      sizeBytes: Number(file.size_bytes || 0),
      visibility: file.visibility,
      createdAt: iso(file.created_at),
    })) as PortalFile[],
  };
}

export async function markSeen(requestId: string, side: "client" | "staff") {
  await pgQuery(`UPDATE pcg_requests SET ${side === "client" ? "client_last_seen_at" : "staff_last_seen_at"} = NOW() WHERE id = $1`, [requestId]);
}

export async function addEvent(requestId: string, event: Parameters<typeof insertEvent>[2]) {
  requireDatabase();
  return pgTransaction((client) => insertEvent(client, requestId, event));
}

/** Staff changes: status (adds a timeline entry the client sees), priority, assignee, progress, details. */
export async function updateRequest(requestId: string, changes: { status?: RequestStatus; priority?: RequestPriority; assignedTo?: string; progress?: number; title?: string; note?: string }, staff: { id: string; name: string }) {
  requireDatabase();
  return pgTransaction(async (client) => {
    const current = await client.query("SELECT status, progress FROM pcg_requests WHERE id = $1 FOR UPDATE", [requestId]);
    if (!current.rowCount) throw new HttpError(404, "This request no longer exists.");
    const before = current.rows[0] as { status: RequestStatus; progress: number };
    const sets: string[] = [];
    const values: unknown[] = [requestId];
    const push = (column: string, value: unknown) => { values.push(value); sets.push(`${column} = $${values.length}`); };
    if (changes.status && changes.status !== before.status) {
      push("status", changes.status);
      if (changes.status === "completed" && changes.progress === undefined) push("progress", 100);
    }
    if (changes.priority) push("priority", changes.priority);
    if (changes.assignedTo !== undefined) push("assigned_to", changes.assignedTo);
    if (changes.progress !== undefined) push("progress", Math.max(0, Math.min(100, Math.round(changes.progress))));
    if (changes.title) push("title", changes.title);
    if (sets.length) await client.query(`UPDATE pcg_requests SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1`, values);
    let statusChanged = false;
    if (changes.status && changes.status !== before.status) {
      statusChanged = true;
      await insertEvent(client, requestId, {
        kind: "status", authorType: "staff", authorId: staff.id, authorName: staff.name, visibility: "client",
        body: changes.note || "", meta: { from: before.status, to: changes.status },
      });
    } else if (changes.progress !== undefined && changes.progress !== before.progress && changes.note) {
      await insertEvent(client, requestId, { kind: "update", authorType: "staff", authorId: staff.id, authorName: staff.name, visibility: "client", body: changes.note, meta: { progress: changes.progress } });
    }
    return { statusChanged, from: before.status, to: changes.status || before.status };
  });
}

export async function addFileRecord(file: { requestId: string; eventId: string; uploadedByType: "client" | "staff"; uploadedById: string; uploadedByName: string; category: string; filename: string; mime: string; sizeBytes: number; storage: "r2" | "local"; objectKey: string; visibility: "client" | "internal" }) {
  const id = randomUUID();
  await pgQuery(
    "INSERT INTO pcg_request_files (id, request_id, event_id, uploaded_by_type, uploaded_by_id, uploaded_by_name, category, filename, mime, size_bytes, storage, object_key, visibility) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
    [id, file.requestId, file.eventId, file.uploadedByType, file.uploadedById, file.uploadedByName, file.category, file.filename, file.mime, file.sizeBytes, file.storage, file.objectKey, file.visibility],
  );
  return id;
}

export async function linkFilesToEvent(eventId: string, fileIds: string[]) {
  if (!fileIds.length) return;
  await pgQuery("UPDATE pcg_request_files SET event_id = $1 WHERE id = ANY($2::text[])", [eventId, fileIds]);
  await pgQuery("UPDATE pcg_request_events SET meta = jsonb_set(meta, '{fileIds}', to_jsonb($2::text[])) WHERE id = $1", [eventId, fileIds]);
}

export async function getFileForDownload(fileId: string) {
  requireDatabase();
  const result = await pgQuery(
    "SELECT f.*, r.client_id FROM pcg_request_files f JOIN pcg_requests r ON r.id = f.request_id WHERE f.id = $1",
    [fileId],
  );
  return result.rows[0] as (Record<string, unknown> & { client_id: string | null; visibility: string; storage: string; object_key: string; filename: string; mime: string; request_id: string }) | undefined;
}

export async function requestContacts(requestId: string) {
  const result = await pgQuery(
    "SELECT r.ref, r.title, r.contact_name, r.contact_email, c.notify_email, c.email_verified_at FROM pcg_requests r LEFT JOIN pcg_clients c ON c.id = r.client_id WHERE r.id = $1",
    [requestId],
  );
  const row = result.rows[0];
  return row ? { ref: String(row.ref), title: String(row.title), name: String(row.contact_name), email: String(row.contact_email), notify: row.notify_email !== false } : null;
}

export function statusLabel(status: string) {
  return isRequestStatus(status) ? STATUS_LABEL[status] : status;
}

export async function upcomingMeetingsForEmail(email: string) {
  if (!postgresEnabled()) return [];
  const today = new Date().toISOString().slice(0, 10);
  const result = await pgQuery("SELECT id, date, time, project_type FROM pcg_reservations WHERE lower(email) = $1 AND status = 'confirmed' AND date >= $2 ORDER BY date, time LIMIT 5", [email.toLowerCase(), today]);
  return result.rows.map((row) => ({ id: String(row.id), date: String(row.date), time: String(row.time), projectType: String(row.project_type) }));
}
