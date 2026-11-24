import { redirect } from "next/navigation";
import { PortalDashboard } from "@/components/portal/dashboard";
import { getCurrentClient } from "@/lib/clients/session";
import { listClientRequests, upcomingMeetingsForEmail } from "@/lib/requests/store";
import { getSiteContent } from "@/lib/site-content/store";

export const metadata = { title: "Requests" };

/** Formal requests (a new build, a renovation, a site visit…) and their stage, one card each. */
export default async function RequestsPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  const [requests, meetings, content] = await Promise.all([
    client.verified ? listClientRequests(client.id) : Promise.resolve([]),
    upcomingMeetingsForEmail(client.email),
    getSiteContent(),
  ]);
  const { contact } = content.siteSettings;
  return (
    <div className="ps-page">
      <PortalDashboard
        name={client.name}
        verified={client.verified}
        requests={requests}
        meetings={meetings}
        contact={{ email: contact.email, phone: contact.phone, whatsapp: "", openingHours: contact.openingHours }}
      />
    </div>
  );
}
