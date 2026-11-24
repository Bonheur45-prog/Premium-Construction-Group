import { pgQuery } from "@/lib/db/postgres";
import { requireFeature } from "@/lib/features";
import { clientViewer, route } from "@/lib/portal/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Meetings booked with the client's email address — upcoming first, then the most recent past ones. */
export const GET = route(async (request: Request) => {
  const { client } = await clientViewer(request);
  await requireFeature("portalMeetings");
  const result = await pgQuery<{ id: string; date: string; time: string; duration_minutes: number; status: string; project_type: string; message: string }>(
    "SELECT id, date, time, duration_minutes, status, project_type, message FROM pcg_reservations WHERE lower(email) = lower($1) ORDER BY date DESC, time DESC LIMIT 50",
    [client.email],
  );
  return {
    meetings: result.rows.map((row) => ({ id: row.id, date: row.date, time: row.time, durationMinutes: row.duration_minutes, status: row.status, topic: row.project_type, note: row.message })),
    me: { name: client.name, email: client.email, phone: client.phone, company: client.company },
  };
});
