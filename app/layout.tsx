import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Premium Construction Group | Built with intent",
    template: "%s | Premium Construction Group",
  },
  description:
    "Thoughtful construction, clear communication, and enduring quality. Discover Premium Construction Group and start a conversation about your next project.",
  applicationName: "Premium Construction Group",
  openGraph: {
    type: "website",
    title: "Premium Construction Group | Built with intent",
    description:
      "Thoughtful construction, clear communication, and enduring quality.",
    siteName: "Premium Construction Group",
  },
};

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
