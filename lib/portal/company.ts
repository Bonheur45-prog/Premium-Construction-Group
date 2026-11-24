import "server-only";

import { getSiteContent } from "@/lib/site-content/store";

/** The company details printed on quotes. */
export async function companyDetails() {
  const { brand, contact } = (await getSiteContent()).siteSettings;
  return { name: brand.legalName, email: contact.email, phone: contact.phone, address: contact.address.replace(/\s*\n\s*/g, ", ") };
}
