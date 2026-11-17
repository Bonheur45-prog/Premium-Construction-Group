import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SitePageTheme } from "@/components/site-page-theme";
import { InsightUnsubscribeAction } from "@/components/insight-unsubscribe-action";

export const metadata: Metadata = {
  title: "Unsubscribe | Insights",
  robots: { index: false, follow: false },
};

export default async function InsightUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const query = await searchParams;
  const email = query.email?.slice(0, 254) || "";
  const token = query.token?.slice(0, 128) || "";

  return (
    <SitePageTheme>
      <SiteHeader />
      <main id="main-content" className="insight-unsubscribe-page shell">
        <p className="eyebrow"><span /> Email preferences</p>
        <h1>Manage your <em>updates.</em></h1>
        <p>Use the button below to stop receiving new insight updates from Premium Construction Group.</p>
        <InsightUnsubscribeAction email={email} token={token} />
        <Link className="text-link" href="/insights">Back to insights <span aria-hidden="true">→</span></Link>
      </main>
      <SiteFooter />
    </SitePageTheme>
  );
}
