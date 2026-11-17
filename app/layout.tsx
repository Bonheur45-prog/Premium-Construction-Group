import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import { getSiteContent } from "@/lib/site-content/store";
import "./globals.css";

const roboto = localFont({
  src: "./fonts/Roboto-Bold.woff2",
  weight: "700",
  variable: "--font-roboto",
  display: "swap",
});

const ubuntu = localFont({
  src: [
    { path: "./fonts/Ubuntu-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Ubuntu-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-ubuntu",
  display: "swap",
});

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
    <html lang="en" className={`${roboto.variable} ${ubuntu.variable}`}>
      <body>{children}</body>
    </html>
  );
}
