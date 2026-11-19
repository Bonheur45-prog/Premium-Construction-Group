"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function PortalHeader({ name, brand }: { name: string; brand: { logo: string; primaryName: string; secondaryName: string } }) {
  const pathname = usePathname();
  const links = [
    { href: "/account", label: "My requests", active: pathname === "/account" || pathname.startsWith("/account/requests/") && !pathname.endsWith("/new") },
    { href: "/account/requests/new", label: "New request", active: pathname === "/account/requests/new" },
    { href: "/account/profile", label: "Profile", active: pathname === "/account/profile" },
  ];
  return (
    <header className="portal-header">
      <div className="portal-shell portal-header__inner">
        <Link className="portal-brand" href="/account" aria-label="Client portal home">
          <span className="portal-brand__mark"><Image src={brand.logo} alt="" width={122} height={77} unoptimized /></span>
          <span className="portal-brand__name"><strong>{brand.primaryName}</strong><span>Client portal</span></span>
        </Link>
        <nav className="portal-nav" aria-label="Client portal">
          {links.map((link) => <Link key={link.href} href={link.href} className={link.active ? "is-active" : ""} aria-current={link.active ? "page" : undefined}>{link.label}</Link>)}
        </nav>
        <div className="portal-header__me">
          <Link href="/" className="portal-header__site">Website ↗</Link>
          <Link href="/account/profile" className="portal-avatar" title={name} aria-label={`Profile: ${name}`}>{name.slice(0, 1).toUpperCase()}</Link>
        </div>
      </div>
    </header>
  );
}
