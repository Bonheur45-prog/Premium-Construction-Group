import { requireStaff } from "@/lib/admin/guard";
import { postgresEnabled, pgQuery } from "@/lib/db/postgres";
import { emailConfigured, staffNotifyEmail } from "@/lib/email/send";
import { mediaStats } from "@/lib/media/library";
import { r2Configured } from "@/lib/media/r2";
import { listReservations } from "@/lib/reservations/store";
import { turnstileEnabled } from "@/lib/security/turnstile";
import { recentActivity } from "@/lib/server/activity";
import { errorResponse, noStore } from "@/lib/server/http";
import { getSiteContent } from "@/lib/site-content/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function count(sql: string) {
  if (!postgresEnabled()) return 0;
  try {
    const result = await pgQuery<{ count: string }>(sql);
    return Number(result.rows[0]?.count || 0);
  } catch {
    return 0;
  }
}

/** Everything the dashboard's Overview needs in one round trip. */
export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    const [content, reservations, media, activity] = await Promise.all([getSiteContent(), listReservations(), mediaStats(), recentActivity(14)]);
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = reservations
      .filter((reservation) => reservation.status === "confirmed" && reservation.date >= today)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    const [newEnquiries, openRequests, awaitingReply, clients, newClients30] = await Promise.all([
      count("SELECT COUNT(*)::text AS count FROM pcg_enquiries WHERE status = 'new'"),
      count("SELECT COUNT(*)::text AS count FROM pcg_requests WHERE status NOT IN ('completed','closed')"),
      count("SELECT COUNT(*)::text AS count FROM pcg_requests WHERE last_client_activity_at IS NOT NULL AND (staff_last_seen_at IS NULL OR last_client_activity_at > staff_last_seen_at) AND status NOT IN ('closed')"),
      count("SELECT COUNT(*)::text AS count FROM pcg_clients"),
      count("SELECT COUNT(*)::text AS count FROM pcg_clients WHERE created_at > NOW() - INTERVAL '30 days'"),
    ]);

    const settings = content.siteSettings;
    const articles = content.insights.articles;
    const setup = [
      { id: "email", label: "Brevo email delivery", done: emailConfigured(), hint: "BREVO_API_KEY and MAIL_FROM_EMAIL in the server .env" },
      { id: "staffEmail", label: "Company inbox for notifications", done: Boolean(staffNotifyEmail()), hint: "STAFF_NOTIFY_EMAIL in the server .env" },
      { id: "r2Public", label: "Cloudflare R2 for website media", done: r2Configured("public"), hint: "R2_* keys, R2_PUBLIC_BUCKET and R2_PUBLIC_URL" },
      { id: "r2Private", label: "Private R2 bucket for client documents", done: r2Configured("private"), hint: "R2_PRIVATE_BUCKET" },
      { id: "turnstile", label: "Turnstile spam protection", done: turnstileEnabled(), hint: "TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY" },
      { id: "siteUrl", label: "Public website address", done: Boolean(settings.seo.siteUrl), hint: "Pages → Site settings → SEO → Site URL" },
      { id: "contact", label: "Company contact details", done: Boolean(settings.contact.email && settings.contact.phone), hint: "Pages → Site settings → Contact" },
      { id: "social", label: "Social media links", done: Object.values(settings.social).some(Boolean), hint: "Pages → Site settings → Social" },
      { id: "analytics", label: "Google Analytics", done: Boolean(settings.analytics.googleAnalyticsId), hint: "Pages → Site settings → Analytics" },
    ];

    return Response.json({
      user: { username: user.username, role: user.role },
      stats: {
        upcomingMeetings: upcoming.length,
        newEnquiries,
        openRequests,
        awaitingReply,
        clients,
        newClients30,
        mediaFiles: media.count,
        mediaBytes: media.bytes,
        publishedArticles: articles.filter((article) => article.status === "published").length,
        draftArticles: articles.filter((article) => article.status === "draft").length,
        customPages: content.customPages.length,
      },
      upcoming: upcoming.slice(0, 5).map(({ id, name, projectType, date, time, company }) => ({ id, name, projectType, date, time, company })),
      activity,
      setup,
    }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
