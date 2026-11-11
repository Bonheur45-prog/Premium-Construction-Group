import "server-only";

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

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
  if (!existsSync(path)) return [];
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
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

export function listCmsUsers(): CmsUserSummary[] {
  return readUsers().map(publicUser).sort((a, b) => a.username.localeCompare(b.username));
}

export function hasCmsUsers() {
  try { return readUsers().length > 0; } catch { return false; }
}

export function getCmsUserById(id: string) {
  const user = readUsers().find((candidate) => candidate.id === id);
  return user ? publicUser(user) : null;
}

export function findCmsUserByUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;
  return readUsers().find((user) => user.username === normalized) || null;
}

export function verifyCmsPassword(user: StoredCmsUser, password: string) {
  const expected = Buffer.from(user.passwordHash, "base64url");
  const actual = Buffer.from(passwordDigest(password, user.salt), "base64url");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function bootstrapCmsAdmin() {
  const users = readUsers();
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
  saveUsers([user]);
  return user;
}

export function createCmsUser(usernameValue: string, password: string, role: CmsUserRole) {
  const username = normalizeUsername(usernameValue);
  if (!username) throw new Error("Use 3–32 characters: letters, numbers, dots, dashes, or underscores.");
  if (password.length < 12 || password.length > 128) throw new Error("Passwords must be 12–128 characters long.");
  if (role !== "admin" && role !== "editor") throw new Error("Choose a valid account role.");

  const users = readUsers();
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
  saveUsers([...users, user]);
  return publicUser(user);
}
