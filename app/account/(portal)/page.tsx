import { redirect } from "next/navigation";
import { PortalOverview } from "@/components/portal/overview";
import { getCurrentClient } from "@/lib/clients/session";
import { postgresEnabled } from "@/lib/db/postgres";
import { getFeatures } from "@/lib/features";
import { portalFeatures } from "@/lib/features-shared";
import { listConversations } from "@/lib/portal/chat";
import { listFiles } from "@/lib/portal/files";
import { listProjects } from "@/lib/portal/projects";
import { listQuotes } from "@/lib/portal/quotes";
import { upcomingMeetingsForEmail } from "@/lib/requests/store";

export const metadata = { title: "Overview" };

export default async function PortalHome() {
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  const features = await getFeatures();
  const db = postgresEnabled();
  const safe = <T,>(work: Promise<T>, fallback: T) => work.catch(() => fallback);
  const [conversations, projects, quotes, meetings, files] = await Promise.all([
    db && features.chat.enabled && client.verified ? safe(listConversations({ side: "client", client }), []) : [],
    db && features.progress.enabled ? safe(listProjects({ clientId: client.id }), []) : [],
    db && features.quotes.enabled ? safe(listQuotes({ clientId: client.id, forStaff: false }), []) : [],
    features.portalMeetings.enabled ? safe(upcomingMeetingsForEmail(client.email), []) : [],
    db && features.files.enabled ? safe(listFiles(client.id), null) : null,
  ]);
  return (
    <PortalOverview
      data={{
        name: client.name, verified: client.verified, features: portalFeatures(features), conversations, projects, quotes, meetings,
        usage: files?.usage || null, recentFiles: files?.files.filter((file) => !file.meta.voice).length || 0,
      }}
    />
  );
}
