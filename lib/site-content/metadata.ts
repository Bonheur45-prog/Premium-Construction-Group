import type { Metadata } from "next";
import { connection } from "next/server";
import { getSiteContent } from "@/lib/site-content/store";

export type ManagedPageKey = "home" | "about" | "approach" | "services" | "projects" | "insights" | "contact" | "reservations";

export async function getManagedPageMetadata(pageKey: ManagedPageKey): Promise<Metadata> {
  await connection();
  const content = await getSiteContent();
  const page = content.siteSettings.seo.pages[pageKey];
  return {
    title: page.title,
    description: page.description,
    applicationName: `${content.siteSettings.brand.primaryName} ${content.siteSettings.brand.secondaryName}`,
  };
}
