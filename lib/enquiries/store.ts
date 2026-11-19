import "server-only";

import { randomUUID } from "node:crypto";
import { pgQuery, postgresEnabled } from "@/lib/db/postgres";
import { HttpError } from "@/lib/server/http";

/** Enquiries sent through the website's contact form, managed in CMS → Enquiries. */
export const ENQUIRY_PROJECT_TYPES: Record<string, string> = {
  "new-build": "New build",
  renovation: "Renovation or extension",
  design: "Design coordination",
  management: "Project management",
  other: "Something else",
};
export const ENQUIRY_STATUSES = ["new", "read", "replied", "archived", "converted"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  enquiryType: "personal" | "company";
  company: string;
  projectType: string;
  projectTypeLabel: string;
  message: string;
  status: EnquiryStatus;
  requestId: string;
  staffNotified: boolean;
  senderNotified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EnquiryInput = Pick<Enquiry, "name" | "email" | "phone" | "enquiryType" | "company" | "projectType" | "message">;

function fromRow(row: Record<string, unknown>): Enquiry {
  const projectType = String(row.project_type || "");
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone || ""),
    enquiryType: row.enquiry_type === "company" ? "company" : "personal",
    company: String(row.company || ""),
    projectType,
    projectTypeLabel: ENQUIRY_PROJECT_TYPES[projectType] || projectType,
    message: String(row.message || ""),
    status: (ENQUIRY_STATUSES as readonly string[]).includes(String(row.status)) ? (row.status as EnquiryStatus) : "new",
    requestId: String(row.request_id || ""),
    staffNotified: Boolean(row.staff_notified),
    senderNotified: Boolean(row.sender_notified),
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

function requireDatabase() {
  if (!postgresEnabled()) throw new HttpError(503, "Enquiries can't be saved right now. Please email or call us instead.");
}

export async function createEnquiry(input: EnquiryInput) {
  requireDatabase();
  const result = await pgQuery(
    `INSERT INTO pcg_enquiries (id, name, email, phone, enquiry_type, company, project_type, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [randomUUID(), input.name, input.email, input.phone, input.enquiryType, input.company, input.projectType, input.message],
  );
  return fromRow(result.rows[0]);
}

export async function setEnquiryDelivery(id: string, staffNotified: boolean, senderNotified: boolean) {
  await pgQuery("UPDATE pcg_enquiries SET staff_notified = $2, sender_notified = $3 WHERE id = $1", [id, staffNotified, senderNotified]);
}

export async function listEnquiries({ status, search }: { status?: string; search?: string } = {}) {
  requireDatabase();
  const where: string[] = [];
  const values: unknown[] = [];
  if (status === "open") where.push("status IN ('new','read')");
  else if (status && (ENQUIRY_STATUSES as readonly string[]).includes(status)) { values.push(status); where.push(`status = $${values.length}`); }
  if (search) {
    values.push(`%${search.toLowerCase().slice(0, 80)}%`);
    where.push(`(lower(name) LIKE $${values.length} OR lower(email) LIKE $${values.length} OR lower(company) LIKE $${values.length} OR lower(message) LIKE $${values.length})`);
  }
  const result = await pgQuery(`SELECT * FROM pcg_enquiries ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 300`, values);
  const counts = await pgQuery<{ status: string; count: string }>("SELECT status, COUNT(*)::text AS count FROM pcg_enquiries GROUP BY status");
  return {
    items: result.rows.map(fromRow),
    counts: Object.fromEntries(counts.rows.map((row) => [row.status, Number(row.count)])) as Partial<Record<EnquiryStatus, number>>,
  };
}

export async function getEnquiry(id: string) {
  requireDatabase();
  const result = await pgQuery("SELECT * FROM pcg_enquiries WHERE id = $1", [id]);
  return result.rowCount ? fromRow(result.rows[0]) : null;
}

export async function updateEnquiry(id: string, changes: { status?: EnquiryStatus; requestId?: string }) {
  requireDatabase();
  const result = await pgQuery(
    `UPDATE pcg_enquiries SET status = COALESCE($2, status), request_id = COALESCE($3, request_id), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, changes.status ?? null, changes.requestId ?? null],
  );
  if (!result.rowCount) throw new HttpError(404, "This enquiry no longer exists.");
  return fromRow(result.rows[0]);
}

export async function deleteEnquiry(id: string) {
  requireDatabase();
  await pgQuery("DELETE FROM pcg_enquiries WHERE id = $1", [id]);
}
