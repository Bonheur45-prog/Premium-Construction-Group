import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PortalHeader } from "@/components/portal/portal-header";
import { getCurrentClient } from "@/lib/clients/session";
import { getSiteContent } from "@/lib/site-content/store";

/** Every signed-in portal page. Signed-out visitors are sent to the sign-in page. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const client = await getCurrentClient();
  if (!client) redirect("/account/login");
  const { brand } = (await getSiteContent()).siteSettings;
  return (
    <div className="portal">
      <PortalHeader name={client.name} brand={brand} />
      <main className="portal-shell portal-main" id="main-content">{children}</main>
      <footer className="portal-shell portal-footer">
        <span>© {new Date().getFullYear()} {brand.primaryName} {brand.secondaryName}</span>
        <span>Your documents are private to you and our team.</span>
      </footer>
    </div>
  );
}
