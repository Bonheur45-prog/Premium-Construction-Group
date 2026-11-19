import "server-only";

import { pgQuery, postgresEnabled } from "@/lib/db/postgres";

export type ActivityActor = { type: "staff" | "client" | "system" | "visitor"; id?: string; name?: string };

export type ActivityEntry = {
  id: string;
  actorType: ActivityActor["type"];
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
};

/** Records who did what, for the dashboard's activity feed. Never throws: logging must not break the action itself. */
export async function logActivity(actor: ActivityActor, action: string, summary: string, target: { type?: string; id?: string } = {}) {
  if (!postgresEnabled()) return;
  try {
    await pgQuery(
      "INSERT INTO pcg_activity (actor_type, actor_id, actor_name, action, target_type, target_id, summary) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [actor.type, actor.id || "", (actor.name || "").slice(0, 120), action.slice(0, 60), (target.type || "").slice(0, 40), (target.id || "").slice(0, 80), summary.slice(0, 300)],
    );
    // Keep the log lean: drop entries older than a year now and then.
    if (Math.random() < 0.02) await pgQuery("DELETE FROM pcg_activity WHERE created_at < NOW() - INTERVAL '365 days'");
  } catch (error) {
    console.error("Activity could not be logged.", error);
  }
}

export async function recentActivity(limit = 20): Promise<ActivityEntry[]> {
  if (!postgresEnabled()) return [];
  const result = await pgQuery(
    "SELECT id, actor_type, actor_name, action, target_type, target_id, summary, created_at FROM pcg_activity ORDER BY created_at DESC LIMIT $1",
    [Math.min(Math.max(limit, 1), 100)],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    actorType: row.actor_type,
    actorName: row.actor_name,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    summary: row.summary,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

/** Paged activity log for CMS → Activity (filter by who: staff, client, visitor). */
export async function activityPage({ actorType, offset = 0, limit = 50 }: { actorType?: string; offset?: number; limit?: number }) {
  if (!postgresEnabled()) return { items: [] as ActivityEntry[], total: 0 };
  const values: unknown[] = [];
  let where = "";
  if (actorType && ["staff", "client", "visitor", "system"].includes(actorType)) { values.push(actorType); where = "WHERE actor_type = $1"; }
  const total = await pgQuery<{ count: string }>(`SELECT COUNT(*)::text AS count FROM pcg_activity ${where}`, values);
  values.push(Math.min(Math.max(limit, 1), 100), Math.max(offset, 0));
  const rows = await pgQuery(`SELECT id, actor_type, actor_name, action, target_type, target_id, summary, created_at FROM pcg_activity ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return {
    total: Number(total.rows[0]?.count || 0),
    items: rows.rows.map((row) => ({
      id: String(row.id), actorType: row.actor_type, actorName: row.actor_name, action: row.action,
      targetType: row.target_type, targetId: row.target_id, summary: row.summary, createdAt: new Date(row.created_at).toISOString(),
    })) as ActivityEntry[],
  };
}
