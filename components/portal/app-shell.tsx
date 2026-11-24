"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowSquareOut, Bell, CalendarCheck, ChatsCircle, FolderSimple, List, Receipt, SignOut, SquaresFour, Tray, X } from "@/components/icons";
import { MilestoneIcon, StorageIcon } from "@/components/icons/custom";
import { LiveProvider, useLive, useLiveEvents } from "@/components/portal/live";
import { usePush } from "@/components/portal/push";
import type { PortalFeatures } from "@/lib/features-shared";
import { formatBytes } from "@/lib/portal/file-types";

type Brand = { logo: string; primaryName: string; secondaryName: string };
type Usage = { usedBytes: number; quotaBytes: number };

/** The signed-in client space: sidebar on computers, tab bar on phones, one live connection for everything. */
export function PortalAppShell({ children, name, email, brand, features, initialUnread, initialUsage }: {
  children: ReactNode; name: string; email: string; brand: Brand; features: PortalFeatures; initialUnread: number; initialUsage: Usage | null;
}) {
  return (
    <LiveProvider url="/api/portal/live">
      <Shell name={name} email={email} brand={brand} features={features} initialUnread={initialUnread} initialUsage={initialUsage}>{children}</Shell>
    </LiveProvider>
  );
}

function Shell({ children, name, email, brand, features, initialUnread, initialUsage }: Omit<Parameters<typeof PortalAppShell>[0], "children"> & { children: ReactNode }) {
  const pathname = usePathname();
  const live = useLive();
  const [unread, setUnread] = useState(initialUnread);
  const [usage, setUsage] = useState(initialUsage);
  const [drawer, setDrawer] = useState(false);
  const push = usePush("/api/portal/push", features.push.enabled);

  const refreshUnread = useCallback(async () => {
    if (!features.chat.enabled) return;
    const response = await fetch("/api/portal/conversations", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const data = (await response.json()) as { conversations: Array<{ unread: number }> };
    setUnread(data.conversations.reduce((sum, item) => sum + item.unread, 0));
  }, [features.chat.enabled]);
  const refreshUsage = useCallback(async () => {
    if (!features.files.enabled) return;
    const response = await fetch("/api/portal/files", { cache: "no-store" }).catch(() => null);
    if (response?.ok) setUsage(((await response.json()) as { usage: Usage }).usage);
  }, [features.files.enabled]);

  useLiveEvents((event) => {
    if (event.type === "message" || event.type === "read" || event.type === "resync" || event.type === "conversation") void refreshUnread();
    if (event.type === "files" || event.type === "resync") void refreshUsage();
  });
  useEffect(() => setDrawer(false), [pathname]);

  const nav = [
    { href: "/account", label: "Overview", icon: <SquaresFour size={21} weight="duotone" />, show: true, active: pathname === "/account" },
    { href: "/account/messages", label: "Messages", icon: <ChatsCircle size={21} weight="duotone" />, show: features.chat.enabled, active: pathname.startsWith("/account/messages"), badge: unread },
    { href: "/account/files", label: "Files", icon: <FolderSimple size={21} weight="duotone" />, show: features.files.enabled, active: pathname.startsWith("/account/files") },
    { href: "/account/projects", label: "Progress", icon: <MilestoneIcon size={21} weight="duotone" />, show: features.progress.enabled, active: pathname.startsWith("/account/projects") },
    { href: "/account/quotes", label: "Quotes", icon: <Receipt size={21} weight="duotone" />, show: features.quotes.enabled, active: pathname.startsWith("/account/quotes") },
    { href: "/account/meetings", label: "Meetings", icon: <CalendarCheck size={21} weight="duotone" />, show: features.portalMeetings.enabled, active: pathname.startsWith("/account/meetings") },
    { href: "/account/requests", label: "Requests", icon: <Tray size={21} weight="duotone" />, show: true, active: pathname.startsWith("/account/requests") },
  ].filter((item) => item.show);
  const tabs = nav.slice(0, 4);
  const percent = usage ? Math.min(100, Math.round((usage.usedBytes / usage.quotaBytes) * 100)) : 0;
  const fullScreen = pathname.startsWith("/account/messages");

  const sidebar = (
    <>
      <Link className="ps-brand" href="/account" aria-label="Client space home">
        <span className="ps-brand__mark"><Image src={brand.logo} alt="" width={122} height={77} unoptimized /></span>
        <span className="ps-brand__name"><strong>{brand.primaryName}</strong><span>Client space</span></span>
      </Link>
      <nav className="ps-nav" aria-label="Client space">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className={item.active ? "is-active" : ""} aria-current={item.active ? "page" : undefined}>
            {item.icon}<span>{item.label}</span>{item.badge ? <em className="ps-badge">{item.badge > 99 ? "99+" : item.badge}</em> : null}
          </Link>
        ))}
      </nav>
      <div className="ps-foot">
        <p className={`ps-team${live.staffOnline ? " is-online" : ""}`}><i />{live.staffOnline ? "Our team is online" : "Team offline — we reply in working hours"}</p>
        {usage && features.files.enabled && (
          <Link href="/account/files" className="ps-storage">
            <span className="ps-storage__label"><StorageIcon size={17} weight="duotone" /> Storage</span>
            <span className="ps-storage__bar"><i style={{ width: `${percent}%` }} className={percent > 90 ? "is-full" : ""} /></span>
            <small>{formatBytes(usage.usedBytes)} of {formatBytes(usage.quotaBytes)} used</small>
          </Link>
        )}
        {push.supported && push.available && !push.enabled && (
          <button type="button" className="ps-alerts" onClick={() => void push.enable()}><Bell size={17} weight="duotone" /> Turn on alerts on this device</button>
        )}
        <div className="ps-me">
          <Link href="/account/profile" className="ps-me__link"><span className="ps-avatar">{name.slice(0, 1).toUpperCase()}</span><span><strong>{name}</strong><small>{email}</small></span></Link>
          <button type="button" className="ps-icon" aria-label="Sign out" title="Sign out" onClick={async () => { await fetch("/api/account/session", { method: "DELETE" }); window.location.assign("/account/login"); }}><SignOut size={19} /></button>
        </div>
        <Link href="/" className="ps-site">Back to the website <ArrowSquareOut size={14} /></Link>
      </div>
    </>
  );

  return (
    <div className={`ps${fullScreen ? " ps--full" : ""}`}>
      <aside className="ps-side">{sidebar}</aside>
      {drawer && (
        <div className="ps-drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={(event) => { if (event.target === event.currentTarget) setDrawer(false); }}>
          <aside className="ps-side ps-side--drawer">
            <button type="button" className="ps-icon ps-drawer__close" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={20} /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className="ps-main" id="main-content">{children}</main>
      <nav className="ps-tabs" aria-label="Client space">
        {tabs.map((item) => (
          <Link key={item.href} href={item.href} className={item.active ? "is-active" : ""}>
            {item.icon}<span>{item.label}</span>{item.badge ? <em className="ps-badge">{item.badge > 99 ? "99+" : item.badge}</em> : null}
          </Link>
        ))}
        <button type="button" onClick={() => setDrawer(true)} className={nav.slice(4).some((item) => item.active) || pathname.startsWith("/account/profile") ? "is-active" : ""}><List size={21} /><span>More</span></button>
      </nav>
    </div>
  );
}

