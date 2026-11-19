import "server-only";

import { createHash } from "node:crypto";
import { pgQuery, postgresEnabled } from "@/lib/db/postgres";

const memory = new Map<string, number[]>();

/**
 * Sliding-window limit shared by sign-up, login, password reset, enquiries and uploads.
 * Returns true when the action is allowed (and records it). Keys are hashed so no raw IPs or emails are stored.
 */
export async function takeRateLimit(scope: string, identifier: string, limit: number, windowSeconds: number) {
  const key = `${scope}:${createHash("sha256").update(identifier.toLowerCase()).digest("base64url").slice(0, 32)}`;

  if (!postgresEnabled()) {
    const now = Date.now();
    const recent = (memory.get(key) || []).filter((time) => time > now - windowSeconds * 1000);
    if (recent.length >= limit) return false;
    recent.push(now);
    memory.set(key, recent);
    return true;
  }

  const result = await pgQuery<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM pcg_rate_events WHERE key = $1 AND created_at > NOW() - make_interval(secs => $2)",
    [key, windowSeconds],
  );
  if (Number(result.rows[0]?.count || 0) >= limit) return false;
  await pgQuery("INSERT INTO pcg_rate_events (key) VALUES ($1)", [key]);
  if (Math.random() < 0.02) await pgQuery("DELETE FROM pcg_rate_events WHERE created_at < NOW() - INTERVAL '2 days'");
  return true;
}
