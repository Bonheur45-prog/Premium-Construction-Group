import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pgQuery, postgresEnabled } from "@/lib/db/postgres";
import { emailConfigured } from "@/lib/email/send";

type SubscriberRow = { email: string; source_insight: string; subscribed_at: string };

const globalForInsightSubscribers = globalThis as typeof globalThis & {
  insightSubscriberDatabase?: DatabaseSync;
};

function getDatabase() {
  if (globalForInsightSubscribers.insightSubscriberDatabase) return globalForInsightSubscribers.insightSubscriberDatabase;

  const databasePath = process.env.INSIGHTS_DB_PATH || join(process.cwd(), "data", "insights.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath, { timeout: 5000 });
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS insight_subscribers (
      email TEXT PRIMARY KEY,
      source_insight TEXT NOT NULL,
      subscribed_at TEXT NOT NULL,
      unsubscribed_at TEXT
    ) STRICT;
  `);
  globalForInsightSubscribers.insightSubscriberDatabase = database;
  return database;
}

export async function subscribeToInsights(email: string, sourceInsight: string) {
  const subscribedAt = new Date().toISOString();
  if (postgresEnabled()) {
    const inserted = await pgQuery<{ email: string }>(
      "INSERT INTO pcg_insight_subscribers (email, source_insight, subscribed_at) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING email",
      [email, sourceInsight, subscribedAt],
    );
    if (inserted.rowCount) return "subscribed" as const;

    const existing = await pgQuery<{ unsubscribed_at: string | null }>(
      "SELECT unsubscribed_at FROM pcg_insight_subscribers WHERE email = $1",
      [email],
    );
    if (!existing.rows[0]?.unsubscribed_at) return "already" as const;
    await pgQuery(
      "UPDATE pcg_insight_subscribers SET source_insight = $1, subscribed_at = $2, unsubscribed_at = NULL WHERE email = $3",
      [sourceInsight, subscribedAt, email],
    );
    return "subscribed" as const;
  }

  const database = getDatabase();
  const inserted = database.prepare(
    "INSERT INTO insight_subscribers (email, source_insight, subscribed_at) VALUES (?, ?, ?) ON CONFLICT (email) DO NOTHING",
  ).run(email, sourceInsight, subscribedAt);
  if (inserted.changes) return "subscribed" as const;

  const existing = database.prepare("SELECT unsubscribed_at FROM insight_subscribers WHERE email = ?").get(email) as { unsubscribed_at: string | null } | undefined;
  if (!existing?.unsubscribed_at) return "already" as const;
  database.prepare(
    "UPDATE insight_subscribers SET source_insight = ?, subscribed_at = ?, unsubscribed_at = NULL WHERE email = ?",
  ).run(sourceInsight, subscribedAt, email);
  return "subscribed" as const;
}

export async function getActiveInsightSubscribers(): Promise<SubscriberRow[]> {
  if (postgresEnabled()) {
    const result = await pgQuery<SubscriberRow>(
      "SELECT email, source_insight, subscribed_at::text FROM pcg_insight_subscribers WHERE unsubscribed_at IS NULL ORDER BY subscribed_at",
    );
    return result.rows;
  }
  return getDatabase().prepare(
    "SELECT email, source_insight, subscribed_at FROM insight_subscribers WHERE unsubscribed_at IS NULL ORDER BY subscribed_at",
  ).all() as SubscriberRow[];
}

export async function unsubscribeFromInsights(email: string) {
  if (postgresEnabled()) {
    const result = await pgQuery(
      "UPDATE pcg_insight_subscribers SET unsubscribed_at = NOW() WHERE email = $1 AND unsubscribed_at IS NULL",
      [email],
    );
    return Boolean(result.rowCount);
  }
  const result = getDatabase().prepare(
    "UPDATE insight_subscribers SET unsubscribed_at = ? WHERE email = ? AND unsubscribed_at IS NULL",
  ).run(new Date().toISOString(), email);
  return Boolean(result.changes);
}

function unsubscribeSecret() {
  return process.env.INSIGHT_UNSUBSCRIBE_SECRET || process.env.RESERVATION_SESSION_SECRET || "";
}

export function insightEmailDeliveryConfigured() {
  return Boolean(emailConfigured() && createInsightUnsubscribeToken("token-check@invalid.example"));
}

export function createInsightUnsubscribeToken(email: string) {
  const secret = unsubscribeSecret();
  if (secret.length < 32) return "";
  return createHmac("sha256", secret).update(email.toLowerCase()).digest("base64url");
}

export function verifyInsightUnsubscribeToken(email: string, token: string) {
  const expected = Buffer.from(createInsightUnsubscribeToken(email));
  const supplied = Buffer.from(token);
  return expected.length > 0 && expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
