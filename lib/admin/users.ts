import "server-only";

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pgQuery, postgresEnabled, runOnceMigration } from "@/lib/db/postgres";

export type CmsUserRole = "admin" | "editor";
type StoredCmsUser = {
  id: string;
  username: string;
  role: CmsUserRole;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

export type CmsUserSummary = Pick<StoredCmsUser, "id" | "username" | "role" | "createdAt">;

function usersPath() {
  return process.env.ADMIN_USERS_PATH || join(process.cwd(), "data", "admin-users.json");
}

export function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) ? username : null;
}

function readUsers(): StoredCmsUser[] {
  const path = usersPath();
  if (!existsSync(/*turbopackIgnore: true*/ path)) return [];
  const parsed: unknown = JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("The CMS account file is invalid.");
  return parsed.filter((item): item is StoredCmsUser => Boolean(item) && typeof item === "object" &&
    typeof item.id === "string" && typeof item.username === "string" &&
    (item.role === "admin" || item.role === "editor") && typeof item.salt === "string" &&
    typeof item.passwordHash === "string" && typeof item.createdAt === "string");
}

function saveUsers(users: StoredCmsUser[]) {
  const path = usersPath();
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(users, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, path);
}

function passwordDigest(password: string, salt: string) {
  return scryptSync(password, Buffer.from(salt, "base64url"), 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("base64url");
}

function publicUser(user: StoredCmsUser): CmsUserSummary {
  return { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt };
}

function fromPgRow(row: Record<string, unknown>): StoredCmsUser {
  return {
    id: String(row.id), username: String(row.username), role: row.role === "admin" ? "admin" : "editor",
    salt: String(row.salt), passwordHash: String(row.password_hash),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

async function readPgUsers() {
  await runOnceMigration("legacy_admin_users_v1", async (client) => {
    for (const user of readUsers()) {
      await client.query(
        "INSERT INTO pcg_admin_users (id, username, role, salt, password_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
        [user.id, user.username, user.role, user.salt, user.passwordHash, user.createdAt],
      );
    }
  });
  const result = await pgQuery("SELECT id, username, role, salt, password_hash, created_at FROM pcg_admin_users");
  return result.rows.map(fromPgRow);
}

export async function listCmsUsers(): Promise<CmsUserSummary[]> {
  const users = postgresEnabled() ? await readPgUsers() : readUsers();
  return users.map(publicUser).sort((a, b) => a.username.localeCompare(b.username));
}

export async function hasCmsUsers() {
  try { return (postgresEnabled() ? await readPgUsers() : readUsers()).length > 0; } catch { return false; }
}

export async function getCmsUserById(id: string) {
  const users = postgresEnabled() ? await readPgUsers() : readUsers();
  const user = users.find((candidate) => candidate.id === id);
  return user ? publicUser(user) : null;
}

export async function findCmsUserByUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;
  const users = postgresEnabled() ? await readPgUsers() : readUsers();
  return users.find((user) => user.username === normalized) || null;
}

export function verifyCmsPassword(user: StoredCmsUser, password: string) {
  const expected = Buffer.from(user.passwordHash, "base64url");
  const actual = Buffer.from(passwordDigest(password, user.salt), "base64url");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function bootstrapCmsAdmin() {
  const users = postgresEnabled() ? await readPgUsers() : readUsers();
  if (users.length) return null;

  const password = process.env.ADMIN_DASHBOARD_PASSWORD || "";
  const username = normalizeUsername(process.env.ADMIN_DASHBOARD_USERNAME || "admin");
  if (!username || password.length < 12) return null;

  const user: StoredCmsUser = {
    id: randomUUID(),
    username,
    role: "admin",
    salt: randomBytes(16).toString("base64url"),
    passwordHash: "",
    createdAt: new Date().toISOString(),
  };
  user.passwordHash = passwordDigest(password, user.salt);
  if (postgresEnabled()) {
    await pgQuery(
      "INSERT INTO pcg_admin_users (id, username, role, salt, password_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (username) DO NOTHING",
      [user.id, user.username, user.role, user.salt, user.passwordHash, user.createdAt],
    );
    return (await findCmsUserByUsername(user.username))?.id === user.id ? user : null;
  }
  saveUsers([...users, user]);
  return user;
}

export async function createCmsUser(usernameValue: string, password: string, role: CmsUserRole) {
  const username = normalizeUsername(usernameValue);
  if (!username) throw new Error("Use 3–32 characters: letters, numbers, dots, dashes, or underscores.");
  if (password.length < 12 || password.length > 128) throw new Error("Passwords must be 12–128 characters long.");
  if (role !== "admin" && role !== "editor") throw new Error("Choose a valid account role.");

  const users = postgresEnabled() ? await readPgUsers() : readUsers();
  if (users.some((user) => user.username === username)) throw new Error("That username is already in use.");
  const user: StoredCmsUser = {
    id: randomUUID(),
    username,
    role,
    salt: randomBytes(16).toString("base64url"),
    passwordHash: "",
    createdAt: new Date().toISOString(),
  };
  user.passwordHash = passwordDigest(password, user.salt);
  if (postgresEnabled()) {
    try {
      await pgQuery(
        "INSERT INTO pcg_admin_users (id, username, role, salt, password_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
        [user.id, user.username, user.role, user.salt, user.passwordHash, user.createdAt],
      );
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") throw new Error("That username is already in use.");
      throw error;
    }
  } else {
    saveUsers([...users, user]);
  }
  return publicUser(user);
}
