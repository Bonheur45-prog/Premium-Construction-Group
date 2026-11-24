import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PortalAppShell } from "@/components/portal/app-shell";
import { getCurrentClient } from "@/lib/clients/session";
import { postgresEnabled } from "@/lib/db/postgres";
import { getFeatures } from "@/lib/features";
import { portalFeatures } from "@/lib/features-shared";
import { listConversations } from "@/lib/portal/chat";
import { usage } from "@/lib/portal/files";
import { getSiteContent } from "@/lib/site-content/store";

/** Every signed-in page of the client space. Signed-out visitors are sent to the sign-in page. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  const [features, content] = await Promise.all([getFeatures(), getSiteContent()]);
  const db = postgresEnabled();
  const [conversations, used] = await Promise.all([
    db && features.chat.enabled ? listConversations({ side: "client", client }).catch(() => []) : Promise.resolve([]),
    db && features.files.enabled ? usage(client.id).catch(() => null) : Promise.resolve(null),
  ]);
  return (
    <div className="portal">
      <PortalAppShell
        name={client.name}
        email={client.email}
        brand={content.siteSettings.brand}
        features={portalFeatures(features)}
        initialUnread={conversations.reduce((sum, item) => sum + item.unread, 0)}
        initialUsage={used}
      >
        {children}
      </PortalAppShell>
    </div>
  );
}
