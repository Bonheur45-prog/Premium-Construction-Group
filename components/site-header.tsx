import { SiteHeaderNav } from "@/components/site-header-nav";
import { getSiteContent } from "@/lib/site-content/store";

export async function SiteHeader() {
  const { brand, header } = (await getSiteContent()).siteSettings;
  return <SiteHeaderNav settings={{ brand, header }} />;
}
