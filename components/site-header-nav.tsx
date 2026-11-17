"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SocialIcons } from "@/components/social-icons";

type HeaderSettings = {
  brand: { legalName: string; primaryName: string; secondaryName: string; logo: string; strapline: string };
  header: { links: Array<{ id: string; label: string; href: string; enabled: boolean }>; ctaLabel: string; ctaHref: string };
};

export function SiteHeaderNav({ settings }: { settings: HeaderSettings }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isCurrentPage(href: string) {
    if (href.includes("#")) return false;
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="topline">
        <div className="shell topline__inner">
          <span>{settings.brand.legalName}</span>
          <span className="topline__note">{settings.brand.strapline}</span>
        </div>
      </div>
      <header className="site-header">
        <div className="shell site-header__inner">
          <Link className="brand" href="/" aria-label={`${settings.brand.legalName} home`}>
            <span className="brand__mark">
              <Image
                src={settings.brand.logo}
                alt=""
                width={122}
                height={77}
                priority
                unoptimized
              />
            </span>
            <span className="brand__name">
              <strong>{settings.brand.primaryName}</strong>
              <span>{settings.brand.secondaryName}</span>
            </span>
          </Link>

          <SocialIcons className="social-icons--mobile" />

          <button
            className={`menu-toggle${open ? " is-open" : ""}`}
            type="button"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
          </button>

          <nav
            className={`primary-nav${open ? " is-open" : ""}`}
            id="primary-navigation"
            aria-label="Main navigation"
          >
            {settings.header.links.filter((link) => link.enabled).map((link) => (
              <Link
                key={link.id}
                href={link.href}
                aria-current={isCurrentPage(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <SocialIcons className="social-icons--nav" />
            <Link
              className="button button--small button--nav"
              href={settings.header.ctaHref}
              aria-current={isCurrentPage(settings.header.ctaHref) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {settings.header.ctaLabel} <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
