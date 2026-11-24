import { SiteHeaderNav } from "@/components/site-header-nav";
import { getFeatures } from "@/lib/features";
import { getSiteContent } from "@/lib/site-content/store";

export async function SiteHeader() {
  const [{ brand, header, socialLinks }, features] = await Promise.all([getSiteContent().then((content) => content.siteSettings), getFeatures()]);
  return <SiteHeaderNav settings={{ brand, header, socialLinks }} signupOpen={features.signup.enabled} />;
}
