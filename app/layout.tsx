import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import { buildRootMetadata, buildSiteStructuredData } from "@/lib/site-content/metadata";
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
  return buildRootMetadata(await getSiteContent());
}

export const viewport: Viewport = {
  themeColor: "#f7f6f2",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const siteStructuredData = buildSiteStructuredData(await getSiteContent());
  return (
    <html lang="en" className={`${roboto.variable} ${ubuntu.variable}`}>
      <body>
        {siteStructuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData).replace(/</g, "\\u003c") }} />}
        {children}
      </body>
    </html>
  );
}
