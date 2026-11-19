"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/** Google Analytics 4, switched on from CMS → Site settings → Analytics. Never loads on admin or client-account pages. */
export function SiteAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname() || "";
  const id = /^G-[A-Z0-9]{4,20}$/.test(measurementId.trim()) ? measurementId.trim() : "";
  if (!id || pathname.startsWith("/admin") || pathname.startsWith("/account")) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="pcg-ga" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
