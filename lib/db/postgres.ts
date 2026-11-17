import "server-only";

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const globalForPostgres = globalThis as typeof globalThis & {
  pcgPool?: Pool;
  pcgSchemaPromise?: Promise<void>;
  pcgCompletedMigrations?: Set<string>;
};

export function postgresEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!postgresEnabled()) throw new Error("DATABASE_URL is required to use PostgreSQL.");
  if (!globalForPostgres.pcgPool) {
    globalForPostgres.pcgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
    globalForPostgres.pcgPool.on("error", (error) => console.error("Unexpected PostgreSQL pool error.", error));
  }
  return globalForPostgres.pcgPool;
}

export async function ensurePostgresSchema() {
  if (!globalForPostgres.pcgSchemaPromise) {
    globalForPostgres.pcgSchemaPromise = getPool().query(`
      CREATE TABLE IF NOT EXISTS pcg_migrations (
        name TEXT PRIMARY KEY,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS pcg_site_content (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        content JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS pcg_homepage_content (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        content JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS pcg_reservations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        enquiry_type TEXT NOT NULL CHECK (enquiry_type IN ('personal', 'company')),
        company TEXT NOT NULL DEFAULT '',
        project_type TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 240),
        status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
        customer_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        admin_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS pcg_reservation_active_slot
        ON pcg_reservations(date, time) WHERE status = 'confirmed';
      CREATE INDEX IF NOT EXISTS pcg_reservation_schedule
        ON pcg_reservations(status, date, time);
      CREATE INDEX IF NOT EXISTS pcg_reservation_email_created
        ON pcg_reservations(email, created_at);
      CREATE TABLE IF NOT EXISTS pcg_admin_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK (role IN ('admin', 'editor')),
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pcg_insight_subscribers (
        email TEXT PRIMARY KEY,
        source_insight TEXT NOT NULL,
        subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        unsubscribed_at TIMESTAMPTZ
      );
    `).then(() => undefined).catch((error) => {
      globalForPostgres.pcgSchemaPromise = undefined;
      throw error;
    });
  }
  await globalForPostgres.pcgSchemaPromise;
}

export async function pgQuery<Row extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<Row>> {
  await ensurePostgresSchema();
  return getPool().query<Row>(text, values);
}

export async function pgTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensurePostgresSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function runOnceMigration(name: string, work: (client: PoolClient) => Promise<void>) {
  const completed = globalForPostgres.pcgCompletedMigrations ??= new Set<string>();
  if (completed.has(name)) return;
  await pgTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [name]);
    const result = await client.query("SELECT 1 FROM pcg_migrations WHERE name = $1", [name]);
    if (result.rowCount) return;
    await work(client);
    await client.query("INSERT INTO pcg_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [name]);
  });
  completed.add(name);
}
