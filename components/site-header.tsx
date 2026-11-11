"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Projects", href: "/projects" },
  { label: "Insights", href: "/insights" },
  { label: "Our approach", href: "/#approach" },
];

export function SiteHeader() {
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
          <span>Premium Construction Group Ltd</span>
          <span className="topline__note">
            Considered construction. Enduring value.
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="shell site-header__inner">
          <Link className="brand" href="/" aria-label="Premium Construction Group home">
            <span className="brand__mark">
              <Image
                src="/premium-mark.png"
                alt=""
                width={122}
                height={77}
                priority
              />
            </span>
            <span className="brand__name">
              <strong>Premium</strong>
              <span>Construction Group</span>
            </span>
          </Link>

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
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isCurrentPage(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              className="button button--small button--nav"
              href="/contact"
              aria-current={isCurrentPage("/contact") ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              Start a project <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
