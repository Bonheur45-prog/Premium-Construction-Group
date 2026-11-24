import type { Metadata, Viewport } from "next";
import "./portal.css";
import "./space.css";

export const metadata: Metadata = {
  title: { default: "Client space", template: "%s · Client space" },
  robots: { index: false, follow: false },
  manifest: "/account/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PCG Client", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#102d3d" };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
