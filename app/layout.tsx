import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { getSiteContent } from "@/lib/site-content/store";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { siteSettings } = await getSiteContent();
  const home = siteSettings.seo.pages.home;
  const siteName = `${siteSettings.brand.primaryName} ${siteSettings.brand.secondaryName}`;
  return {
    title: { default: home.title, template: `%s | ${siteName}` },
    description: home.description,
    applicationName: siteName,
    openGraph: { type: "website", title: home.title, description: home.description, siteName },
  };
}

export const viewport: Viewport = {
  themeColor: "#f7f6f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
