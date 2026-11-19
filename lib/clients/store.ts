import "server-only";

import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { pgQuery, pgTransaction, postgresEnabled } from "@/lib/db/postgres";
import { HttpError } from "@/lib/server/http";

/** Client (customer) accounts for the portal. Completely separate from CMS staff accounts. */
export type Client = {
  id: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  verified: boolean;
  status: "active" | "suspended";
  notifyEmail: boolean;
  sessionVersion: number;
  lastLoginAt: string | null;
  createdAt: string;
};

type ClientRow = Client & { salt: string; passwordHash: string };

export const PASSWORD_MIN = 10;

function digest(password: string, salt: string) {
  return scryptSync(password, Buffer.from(salt, "base64url"), 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("base64url");
}

function fromRow(row: Record<string, unknown>): ClientRow {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    phone: String(row.phone || ""),
    company: String(row.company || ""),
    verified: Boolean(row.email_verified_at),
    status: row.status === "suspended" ? "suspended" : "active",
    notifyEmail: row.notify_email !== false,
    sessionVersion: Number(row.session_version || 1),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string).toISOString() : null,
    createdAt: new Date(row.created_at as string).toISOString(),
    salt: String(row.salt),
    passwordHash: String(row.password_hash),
  };
}

export function publicClient(row: ClientRow): Client {
  const { salt: _salt, passwordHash: _hash, ...client } = row;
  void _salt; void _hash;
  return client;
}

function requireDatabase() {
  if (!postgresEnabled()) throw new HttpError(503, "Client accounts are not available right now.");
}

export function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN || password.length > 128) {
    throw new HttpError(400, `Use a password of at least ${PASSWORD_MIN} characters.`);
  }
  return password;
}

export async function createClient(input: { email: string; name: string; phone: string; company: string; password: string }) {
  requireDatabase();
  const salt = randomBytes(16).toString("base64url");
  try {
    const result = await pgQuery(
      "INSERT INTO pcg_clients (id, email, name, phone, company, salt, password_hash) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [randomUUID(), input.email.toLowerCase(), input.name, input.phone, input.company, salt, digest(input.password, salt)],
    );
    return publicClient(fromRow(result.rows[0]));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") throw new HttpError(409, "An account with this email already exists. Sign in, or reset your password.");
    throw error;
  }
}

export async function getClientRowByEmail(email: string) {
  requireDatabase();
  const result = await pgQuery("SELECT * FROM pcg_clients WHERE email = $1", [email.toLowerCase()]);
  return result.rowCount ? fromRow(result.rows[0]) : null;
}

export async function getClientById(id: string) {
  if (!postgresEnabled()) return null;
  const result = await pgQuery("SELECT * FROM pcg_clients WHERE id = $1", [id]);
  return result.rowCount ? publicClient(fromRow(result.rows[0])) : null;
}

/** Constant-time password check; also runs the hash for unknown emails so timing doesn't reveal which accounts exist. */
export function checkPassword(row: ClientRow | null, password: string) {
  const salt = row?.salt || "AAAAAAAAAAAAAAAAAAAAAA";
  const actual = Buffer.from(digest(password, salt), "base64url");
  if (!row) return false;
  const expected = Buffer.from(row.passwordHash, "base64url");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function recordLogin(id: string) {
  await pgQuery("UPDATE pcg_clients SET last_login_at = NOW() WHERE id = $1", [id]);
}

export async function updateClientProfile(id: string, changes: { name: string; phone: string; company: string; notifyEmail: boolean }) {
  const result = await pgQuery(
    "UPDATE pcg_clients SET name=$2, phone=$3, company=$4, notify_email=$5, updated_at=NOW() WHERE id=$1 RETURNING *",
    [id, changes.name, changes.phone, changes.company, changes.notifyEmail],
  );
  return publicClient(fromRow(result.rows[0]));
}

/** Sets a new password and signs the client out everywhere else (session version bump). */
export async function setClientPassword(id: string, password: string) {
  const salt = randomBytes(16).toString("base64url");
  const result = await pgQuery(
    "UPDATE pcg_clients SET salt=$2, password_hash=$3, session_version = session_version + 1, updated_at=NOW() WHERE id=$1 RETURNING *",
    [id, salt, digest(password, salt)],
  );
  return publicClient(fromRow(result.rows[0]));
}

export async function setClientStatus(id: string, status: "active" | "suspended") {
  const result = await pgQuery(
    `UPDATE pcg_clients SET status=$2, session_version = session_version + CASE WHEN $2 = 'suspended' THEN 1 ELSE 0 END, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, status],
  );
  if (!result.rowCount) throw new HttpError(404, "This client no longer exists.");
  return publicClient(fromRow(result.rows[0]));
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");

/** Issues a one-time token (verify: 3 days, reset: 1 hour). Older unused tokens of the same kind are invalidated. */
export async function issueClientToken(clientId: string, purpose: "verify" | "reset") {
  const token = randomBytes(32).toString("base64url");
  const hours = purpose === "verify" ? 72 : 1;
  await pgQuery("DELETE FROM pcg_client_tokens WHERE client_id = $1 AND purpose = $2", [clientId, purpose]);
  await pgQuery(
    "INSERT INTO pcg_client_tokens (token_hash, client_id, purpose, expires_at) VALUES ($1,$2,$3, NOW() + make_interval(hours => $4))",
    [hashToken(token), clientId, purpose, hours],
  );
  return token;
}

/** Uses up a token. Returns the client id, or null if the link is invalid, used or expired. */
export async function consumeClientToken(token: unknown, purpose: "verify" | "reset") {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  requireDatabase();
  const result = await pgQuery<{ client_id: string }>(
    "UPDATE pcg_client_tokens SET used_at = NOW() WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW() RETURNING client_id",
    [hashToken(token), purpose],
  );
  return result.rows[0]?.client_id || null;
}

/** Marks the email verified and attaches earlier requests/enquiries made with the same email. */
export async function verifyClientEmail(clientId: string) {
  return pgTransaction(async (client) => {
    const updated = await client.query("UPDATE pcg_clients SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $1 RETURNING *", [clientId]);
    if (!updated.rowCount) throw new HttpError(404, "This account no longer exists.");
    const row = fromRow(updated.rows[0]);
    const claimed = await client.query(
      "UPDATE pcg_requests SET client_id = $1, updated_at = NOW() WHERE client_id IS NULL AND lower(contact_email) = $2 RETURNING ref",
      [clientId, row.email],
    );
    return { client: publicClient(row), claimedRefs: claimed.rows.map((r) => String(r.ref)) };
  });
}

export type ClientListItem = Client & { requestCount: number; openCount: number };

export async function listClients(search = ""): Promise<ClientListItem[]> {
  requireDatabase();
  const values: unknown[] = [];
  let where = "";
  if (search) {
    values.push(`%${search.toLowerCase().slice(0, 80)}%`);
    where = "WHERE lower(c.name) LIKE $1 OR c.email LIKE $1 OR lower(c.company) LIKE $1 OR c.phone LIKE $1";
  }
  const result = await pgQuery(
    `SELECT c.*, COUNT(r.id)::int AS request_count, COUNT(r.id) FILTER (WHERE r.status NOT IN ('completed','closed'))::int AS open_count
     FROM pcg_clients c LEFT JOIN pcg_requests r ON r.client_id = c.id ${where}
     GROUP BY c.id ORDER BY c.created_at DESC LIMIT 500`,
    values,
  );
  return result.rows.map((row) => ({ ...publicClient(fromRow(row)), requestCount: Number(row.request_count), openCount: Number(row.open_count) }));
}
