import "server-only";

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { Reservation, ReservationInput, ReservationStatus } from "@/lib/reservations/types";

const globalForReservations = globalThis as typeof globalThis & {
  reservationDatabase?: DatabaseSync;
};

function getDatabase() {
  if (globalForReservations.reservationDatabase) return globalForReservations.reservationDatabase;

  const databasePath = process.env.RESERVATIONS_DB_PATH || join(process.cwd(), "data", "reservations.sqlite");
  mkdirSync(join(databasePath, ".."), { recursive: true });

  const database = new DatabaseSync(databasePath, { timeout: 5000 });
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      enquiry_type TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      project_type TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      customer_email_sent INTEGER NOT NULL DEFAULT 0,
      admin_email_sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS reservation_active_slot
      ON reservations(date, time) WHERE status = 'confirmed';
    CREATE INDEX IF NOT EXISTS reservation_schedule
      ON reservations(status, date, time);
  `);

  globalForReservations.reservationDatabase = database;
  return database;
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
    date: String(row.date),
    time: String(row.time),
    status: row.status === "cancelled" ? "cancelled" : "confirmed",
    customerEmailSent: Boolean(row.customer_email_sent),
    adminEmailSent: Boolean(row.admin_email_sent),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function getBookedTimes(date: string, excludeReservationId?: string) {
  const rows = getDatabase()
    .prepare(
      `SELECT time FROM reservations
       WHERE date = ? AND status = 'confirmed' AND (? IS NULL OR id != ?)`,
    )
    .all(date, excludeReservationId ?? null, excludeReservationId ?? null) as Array<{ time: string }>;

  return rows.map((row) => row.time);
}

export function listReservations() {
  const rows = getDatabase()
    .prepare(
      `SELECT * FROM reservations
       ORDER BY CASE WHEN status = 'confirmed' THEN 0 ELSE 1 END, date ASC, time ASC, created_at DESC`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map(fromRow);
}

export function getReservation(id: string) {
  const row = getDatabase().prepare("SELECT * FROM reservations WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? fromRow(row) : null;
}

export class ReservationSlotUnavailableError extends Error {
  constructor() {
    super("That time has just been reserved. Please choose another time.");
    this.name = "ReservationSlotUnavailableError";
  }
}

export function createReservation(input: ReservationInput) {
  const database = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  try {
    database
      .prepare(
        `INSERT INTO reservations (
          id, name, email, phone, enquiry_type, company, project_type, message,
          date, time, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      )
      .run(
        id,
        input.name,
        input.email,
        input.phone,
        input.enquiryType,
        input.company,
        input.projectType,
        input.message,
        input.date,
        input.time,
        now,
        now,
      );
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new ReservationSlotUnavailableError();
    }
    throw error;
  }

  return getReservation(id)!;
}

export function moveReservation(id: string, date: string, time: string) {
  const database = getDatabase();
  const current = getReservation(id);
  if (!current || current.status !== "confirmed") return null;
  if (current.date === date && current.time === time) return current;

  try {
    database
      .prepare(
        `UPDATE reservations SET date = ?, time = ?, customer_email_sent = 0,
         admin_email_sent = 0, updated_at = ? WHERE id = ? AND status = 'confirmed'`,
      )
      .run(date, time, new Date().toISOString(), id);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new ReservationSlotUnavailableError();
    }
    throw error;
  }

  return getReservation(id);
}

export function setReservationEmailStatus(id: string, customerEmailSent: boolean, adminEmailSent: boolean) {
  getDatabase()
    .prepare(
      "UPDATE reservations SET customer_email_sent = ?, admin_email_sent = ?, updated_at = ? WHERE id = ?",
    )
    .run(Number(customerEmailSent), Number(adminEmailSent), new Date().toISOString(), id);
}

export function cancelReservation(id: string) {
  const database = getDatabase();
  database
    .prepare(
      `UPDATE reservations SET status = 'cancelled', customer_email_sent = 0,
       admin_email_sent = 0, updated_at = ? WHERE id = ? AND status = 'confirmed'`,
    )
    .run(new Date().toISOString(), id);
  return getReservation(id);
}

export function setReservationCancelledEmailStatus(id: string, customerEmailSent: boolean, adminEmailSent: boolean) {
  setReservationEmailStatus(id, customerEmailSent, adminEmailSent);
}

export function isReservationStatus(value: unknown): value is ReservationStatus {
  return value === "confirmed" || value === "cancelled";
}
