import "server-only";

import { getFeatures } from "@/lib/features";
import { portalFeatures } from "@/lib/features-shared";
import { companyDetails } from "@/lib/portal/company";
import type { PortalContext } from "@/components/admin-workspace";

/** What the CMS client-space screens need from the server (switches and company details). */
export async function adminPortalContext(extra: Partial<PortalContext> = {}): Promise<PortalContext> {
  const [features, company] = await Promise.all([getFeatures(), companyDetails()]);
  return { features: portalFeatures(features), company, ...extra };
}
