import { redirect } from "next/navigation";
import { PortalDashboard } from "@/components/portal/dashboard";
import { getCurrentClient } from "@/lib/clients/session";
import { listClientRequests, upcomingMeetingsForEmail } from "@/lib/requests/store";
import { getSiteContent } from "@/lib/site-content/store";

export const metadata = { title: "My requests" };

export default async function PortalHome({ searchParams }: { searchParams: Promise<{ welcome?: string; reset?: string }> }) {
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  const params = await searchParams;
  const [requests, meetings, content] = await Promise.all([
    client.verified ? listClientRequests(client.id) : Promise.resolve([]),
    upcomingMeetingsForEmail(client.email),
    getSiteContent(),
  ]);
  const { contact } = content.siteSettings;
  return (
    <PortalDashboard
      name={client.name}
      verified={client.verified}
      requests={requests}
      meetings={meetings}
      contact={{ email: contact.email, phone: contact.phone, whatsapp: contact.whatsapp, openingHours: contact.openingHours }}
      notice={params.welcome ? "welcome" : params.reset ? "reset" : undefined}
    />
  );
}
