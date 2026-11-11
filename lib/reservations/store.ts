import "server-only";

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { pgQuery, postgresEnabled, runOnceMigration } from "@/lib/db/postgres";
import type { Reservation, ReservationInput } from "@/lib/reservations/types";

const globalForReservations = globalThis as typeof globalThis & {
  reservationDatabase?: DatabaseSync;
};

function getDatabase() {
  if (globalForReservations.reservationDatabase) return globalForReservations.reservationDatabase;

  const databasePath = process.env.RESERVATIONS_DB_PATH || join(process.cwd(), "data", "reservations.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath, { timeout: 5000 });
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
      enquiry_type TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', project_type TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60, status TEXT NOT NULL DEFAULT 'confirmed',
      customer_email_sent INTEGER NOT NULL DEFAULT 0, admin_email_sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS reservation_active_slot ON reservations(date, time) WHERE status = 'confirmed';
    CREATE INDEX IF NOT EXISTS reservation_schedule ON reservations(status, date, time);
  `);
  try {
    database.exec("ALTER TABLE reservations ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 60");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name")) throw error;
  }
  globalForReservations.reservationDatabase = database;
  return database;
}

function dateValue(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function fromRow(row: Record<string, unknown>): Reservation {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone),
    enquiryType: row.enquiry_type === "company" ? "company" : "personal",
    company: String(row.company),
    projectType: String(row.project_type),
    message: String(row.message),
    date: String(row.date).slice(0, 10),
    time: String(row.time).slice(0, 5),
    durationMinutes: Number(row.duration_minutes) || 60,
    status: row.status === "cancelled" ? "cancelled" : "confirmed",
    customerEmailSent: row.customer_email_sent === true || row.customer_email_sent === 1,
    adminEmailSent: row.admin_email_sent === true || row.admin_email_sent === 1,
    createdAt: dateValue(row.created_at),
    updatedAt: dateValue(row.updated_at),
  };
}

async function migrateLegacyReservations() {
  if (!postgresEnabled()) return;
  await runOnceMigration("legacy_reservations_v1", async (client) => {
    const databasePath = process.env.RESERVATIONS_DB_PATH || join(process.cwd(), "data", "reservations.sqlite");
    if (!existsSync(/*turbopackIgnore: true*/ databasePath)) return;
    const legacy = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const rows = legacy.prepare("SELECT * FROM reservations").all() as Array<Record<string, unknown>>;
      for (const row of rows) {
        const reservation = fromRow(row);
        await client.query(
          `INSERT INTO pcg_reservations (
            id, name, email, phone, enquiry_type, company, project_type, message,
            date, time, duration_minutes, status, customer_email_sent, admin_email_sent, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
          [
            reservation.id, reservation.name, reservation.email, reservation.phone, reservation.enquiryType,
            reservation.company, reservation.projectType, reservation.message, reservation.date, reservation.time,
            reservation.durationMinutes, reservation.status, reservation.customerEmailSent, reservation.adminEmailSent,
            reservation.createdAt, reservation.updatedAt,
          ],
        );
      }
    } finally {
      legacy.close();
    }
  });
}

export async function getBookedTimes(date: string, excludeReservationId?: string) {
  if (postgresEnabled()) {
    await migrateLegacyReservations();
    const result = await pgQuery<{ time: string }>(
      "SELECT time FROM pcg_reservations WHERE date = $1 AND status = 'confirmed' AND ($2::text IS NULL OR id <> $2)",
      [date, excludeReservationId ?? null],
    );
    return result.rows.map((row) => String(row.time).slice(0, 5));
  }
  const rows = getDatabase().prepare(
    "SELECT time FROM reservations WHERE date = ? AND status = 'confirmed' AND (? IS NULL OR id != ?)",
  ).all(date, excludeReservationId ?? null, excludeReservationId ?? null) as Array<{ time: string }>;
  return rows.map((row) => row.time);
}

export async function listReservations() {
  if (postgresEnabled()) {
    await migrateLegacyReservations();
    const result = await pgQuery(
      "SELECT * FROM pcg_reservations ORDER BY CASE WHEN status = 'confirmed' THEN 0 ELSE 1 END, date ASC, time ASC, created_at DESC",
    );
    return result.rows.map(fromRow);
  }
  const rows = getDatabase().prepare(
    "SELECT * FROM reservations ORDER BY CASE WHEN status = 'confirmed' THEN 0 ELSE 1 END, date ASC, time ASC, created_at DESC",
  ).all() as Array<Record<string, unknown>>;
  return rows.map(fromRow);
}

export async function hasReachedDailyReservationLimit(email: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (postgresEnabled()) {
    await migrateLegacyReservations();
    const result = await pgQuery<{ total: string }>(
      "SELECT COUNT(*) AS total FROM pcg_reservations WHERE email = $1 AND created_at >= $2",
      [email, since],
    );
    return Number(result.rows[0]?.total || 0) >= 3;
  }
  const row = getDatabase().prepare("SELECT COUNT(*) AS total FROM reservations WHERE email = ? AND created_at >= ?")
    .get(email, since) as { total: number };
  return row.total >= 3;
}

export async function getReservation(id: string) {
  if (postgresEnabled()) {
    await migrateLegacyReservations();
    const result = await pgQuery("SELECT * FROM pcg_reservations WHERE id = $1", [id]);
    return result.rows[0] ? fromRow(result.rows[0]) : null;
  }
  const row = getDatabase().prepare("SELECT * FROM reservations WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? fromRow(row) : null;
}

export class ReservationSlotUnavailableError extends Error {
  constructor() {
    super("That time has just been reserved. Please choose another time.");
    this.name = "ReservationSlotUnavailableError";
  }
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505") ||
    (error instanceof Error && error.message.includes("UNIQUE constraint failed"));
}

export async function createReservation(input: ReservationInput, durationMinutes = 60) {
  const id = randomUUID();
  const now = new Date().toISOString();
  try {
    if (postgresEnabled()) {
      await migrateLegacyReservations();
      await pgQuery(
        `INSERT INTO pcg_reservations (
          id, name, email, phone, enquiry_type, company, project_type, message, date, time,
          duration_minutes, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'confirmed',$12,$12)`,
        [id, input.name, input.email, input.phone, input.enquiryType, input.company, input.projectType, input.message, input.date, input.time, durationMinutes, now],
      );
    } else {
      getDatabase().prepare(
        `INSERT INTO reservations (
          id, name, email, phone, enquiry_type, company, project_type, message, date, time,
          duration_minutes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      ).run(id, input.name, input.email, input.phone, input.enquiryType, input.company, input.projectType, input.message, input.date, input.time, durationMinutes, now, now);
    }
  } catch (error) {
    if (isUniqueConflict(error)) throw new ReservationSlotUnavailableError();
    throw error;
  }
  return (await getReservation(id))!;
}

export async function moveReservation(id: string, date: string, time: string) {
  const current = await getReservation(id);
  if (!current || current.status !== "confirmed") return null;
  if (current.date === date && current.time === time) return current;
  const now = new Date().toISOString();
  try {
    if (postgresEnabled()) {
      await pgQuery(
        "UPDATE pcg_reservations SET date = $1, time = $2, customer_email_sent = FALSE, admin_email_sent = FALSE, updated_at = $3 WHERE id = $4 AND status = 'confirmed'",
        [date, time, now, id],
      );
    } else {
      getDatabase().prepare(
        "UPDATE reservations SET date = ?, time = ?, customer_email_sent = 0, admin_email_sent = 0, updated_at = ? WHERE id = ? AND status = 'confirmed'",
      ).run(date, time, now, id);
    }
  } catch (error) {
    if (isUniqueConflict(error)) throw new ReservationSlotUnavailableError();
    throw error;
  }
  return getReservation(id);
}

export async function setReservationEmailStatus(id: string, customerEmailSent: boolean, adminEmailSent: boolean) {
  if (postgresEnabled()) {
    await migrateLegacyReservations();
    await pgQuery(
      "UPDATE pcg_reservations SET customer_email_sent = $1, admin_email_sent = $2, updated_at = $3 WHERE id = $4",
      [customerEmailSent, adminEmailSent, new Date().toISOString(), id],
    );
    return;
  }
  getDatabase().prepare(
    "UPDATE reservations SET customer_email_sent = ?, admin_email_sent = ?, updated_at = ? WHERE id = ?",
  ).run(Number(customerEmailSent), Number(adminEmailSent), new Date().toISOString(), id);
}

export async function cancelReservation(id: string) {
  const now = new Date().toISOString();
  if (postgresEnabled()) {
    await migrateLegacyReservations();
    await pgQuery(
      "UPDATE pcg_reservations SET status = 'cancelled', customer_email_sent = FALSE, admin_email_sent = FALSE, updated_at = $1 WHERE id = $2 AND status = 'confirmed'",
      [now, id],
    );
  } else {
    getDatabase().prepare(
      "UPDATE reservations SET status = 'cancelled', customer_email_sent = 0, admin_email_sent = 0, updated_at = ? WHERE id = ? AND status = 'confirmed'",
    ).run(now, id);
  }
  return getReservation(id);
}
