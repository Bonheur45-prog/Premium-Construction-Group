"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AdminHomeEditor } from "@/components/admin-home-editor";
import { AdminPagesEditor } from "@/components/admin-pages-editor";
import { AdminReservationsConsole } from "@/components/admin-reservations-console";
import { AdminUsersConsole } from "@/components/admin-users-console";
import { AdminOverview } from "@/components/admin/overview";
import { AdminMediaLibrary } from "@/components/admin/media-library";
import { EnquiriesInbox, type EnquiryRecord } from "@/components/admin/enquiries-inbox";
import { RequestsBoard } from "@/components/admin/requests-board";
import { ClientsConsole } from "@/components/admin/clients-console";
import { ActivityLog } from "@/components/admin/activity-log";
import { cmsFetch } from "@/components/admin/format";
import { CollectionList } from "@/components/admin/cms/collection-list";
import { EntryEditor } from "@/components/admin/cms/entry-editor";
import { TrashList } from "@/components/admin/cms/trash";
import { SiteSettingsEditor } from "@/components/admin/site-settings";
import { COLLECTIONS, isCollectionId, type CollectionId } from "@/lib/cms/collections";
import "@/app/account/portal.css";
import "@/app/admin/cms.css";

export type AdminTab = "overview" | "website" | "pages" | CollectionId | "media" | "header" | "footer" | "settings" | "trash" | "requests" | "clients" | "enquiries" | "reservations" | "users" | "activity";
type SignedInUser = { id: string; username: string; role: "admin" | "editor" };
type Badges = Partial<Record<AdminTab, number>>;

type NavItem = { id: AdminTab; label: string; href: string; hint: string; icon: ReactNode; adminOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const icon = (path: ReactNode) => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">{path}</svg>;

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { id: "overview", label: "Overview", href: "/admin", hint: "Today at a glance, setup checklist and activity", icon: icon(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" /><rect x="13.5" y="11" width="7" height="9.5" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /></>) },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "services", label: "Services", href: "/admin/services", hint: COLLECTIONS.services.description, icon: icon(<><path d="M14.5 5.5a4 4 0 0 0-5 5L4 16v4h4l5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z" /></>) },
      { id: "projects", label: "Projects", href: "/admin/projects", hint: COLLECTIONS.projects.description, icon: icon(<><path d="M3.5 20.5h17M5.5 20.5V9l6.5-4.5L18.5 9v11.5" /><path d="M9.5 20.5v-5h5v5M9.5 11.5h5" /></>) },
      { id: "insights", label: "Blog", href: "/admin/insights", hint: COLLECTIONS.insights.description, icon: icon(<><path d="M5 19.5 6 15 16 5a2.1 2.1 0 0 1 3 3L9 18z" /><path d="M14 7l3 3M4 21h16" /></>) },
      { id: "testimonials", label: "Testimonials", href: "/admin/testimonials", hint: COLLECTIONS.testimonials.description, icon: icon(<><path d="M4.5 5.5h15v10h-8l-4 3.5v-3.5h-3z" /><path d="M8.5 10.5h7" /></>) },
      { id: "partners", label: "Partners & clients", href: "/admin/partners", hint: COLLECTIONS.partners.description, icon: icon(<><circle cx="8" cy="12" r="4.5" /><circle cx="16" cy="12" r="4.5" /></>) },
      { id: "team", label: "Team", href: "/admin/team", hint: COLLECTIONS.team.description, icon: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0m2-10.5a3.5 3.5 0 0 1 0 6.8m1 1.7a5 5 0 0 1 3 2" /></>) },
      { id: "jobs", label: "Careers", href: "/admin/jobs", hint: COLLECTIONS.jobs.description, icon: icon(<><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3.5 12.5h17" /></>) },
      { id: "media", label: "Media library", href: "/admin/media", hint: "All images and videos in one place", icon: icon(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5-5 3.5 3.5L15 14l5 5" /></>) },
    ],
  },
  {
    label: "Website",
    items: [
      { id: "website", label: "Home page", href: "/admin/home", hint: "Hero slides, sections and colours", icon: icon(<><rect x="3.5" y="4.5" width="17" height="12" rx="2" /><path d="M8 20h8m-4-3.5V20M3.5 8h17" /></>) },
      { id: "pages", label: "Other pages", href: "/admin/pages", hint: "About, Our approach, Contact and custom pages", icon: icon(<><path d="M7 3.5h7l4.5 4.5v12a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-16a.5.5 0 0 1 .5-.5Z" /><path d="M14 3.5V8h4.5M9 12h6m-6 3h6" /></>) },
      { id: "header", label: "Header & menu", href: "/admin/header", hint: "Logo, menu links and the main button", icon: icon(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9h17M7 6.8h4" /></>) },
      { id: "footer", label: "Footer", href: "/admin/footer", hint: "Footer columns, links and invitation band", icon: icon(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 15h17M7 17.2h4" /></>) },
      { id: "settings", label: "Site settings", href: "/admin/settings", hint: "Contact details, social media, Google and sharing", icon: icon(<><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M6 18l1.8-1.8M16.2 7.8 18 6" /></>) },
    ],
  },
  {
    label: "Clients",
    items: [
      { id: "requests", label: "Requests", href: "/admin/requests", hint: "Client requests: stages, messages, documents", icon: icon(<><path d="M4 5.5h16M4 12h16M4 18.5h10" /><circle cx="18.5" cy="18.5" r="2.5" /></>) },
      { id: "clients", label: "Client accounts", href: "/admin/clients", hint: "Everyone with a portal account", icon: icon(<><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>) },
      { id: "enquiries", label: "Enquiries", href: "/admin/enquiries", hint: "Messages from the contact form — reply by email", icon: icon(<><path d="M3.5 6.5h17v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" /><path d="m3.5 6.5 8.5 7 8.5-7" /></>) },
      { id: "reservations", label: "Meetings", href: "/admin/reservations", hint: "Booked meetings, availability and rescheduling", icon: icon(<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" /></>) },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "users", label: "Team & access", href: "/admin/users", hint: "CMS accounts and roles", adminOnly: true, icon: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0m2-10.5a3.5 3.5 0 0 1 0 6.8m1 1.7a5 5 0 0 1 3 2" /></>) },
      { id: "activity", label: "Activity log", href: "/admin/activity", hint: "Who did what, and when", adminOnly: true, icon: icon(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>) },
      { id: "trash", label: "Trash", href: "/admin/trash", hint: "Restore anything you deleted", icon: icon(<><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" /></>) },
    ],
  },
];

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`cms-brand${inverse ? " cms-brand--inverse" : ""}`} href="/" aria-label="Premium Construction Group website">
      <span className="cms-brand__mark"><Image src="/premium-mark.png" alt="" width={122} height={77} priority /></span>
      <span className="cms-brand__name"><strong>Premium</strong><span>Construction Group</span></span>
    </Link>
  );
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function CommandPalette({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? items.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(term)) : items;
  }, [items, query]);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => setActive(0), [query]);

  function go(item: NavItem | undefined) {
    if (!item) return;
    window.location.assign(item.href);
    onClose();
  }

  return (
    <div className="cms-palette" role="dialog" aria-modal="true" aria-label="Go to" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="cms-palette__panel">
        <input
          ref={input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Jump to a section…"
          aria-label="Search sections"
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, matches.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
            if (event.key === "Enter") go(matches[active]);
          }}
        />
        <ul>
          {matches.map((item, index) => (
            <li key={item.id}>
              <button type="button" className={index === active ? "is-active" : ""} onMouseEnter={() => setActive(index)} onClick={() => go(item)}>
                {item.icon}<span><strong>{item.label}</strong><small>{item.hint}</small></span><kbd>↵</kbd>
              </button>
            </li>
          ))}
          {!matches.length && <li className="cms-palette__empty">Nothing matches “{query}”.</li>}
        </ul>
      </div>
    </div>
  );
}

export function AdminWorkspace({ initialTab = "overview", entryId }: { initialTab?: AdminTab; entryId?: string }) {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<SignedInUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginUsername, setLoginUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [badges, setBadges] = useState<Badges>({});

  useEffect(() => setActiveTab(initialTab), [initialTab]);
  useEffect(() => {
    if ((activeTab === "users" || activeTab === "activity") && currentUser && currentUser.role !== "admin") setActiveTab("overview");
  }, [activeTab, currentUser]);

  const visibleGroups = useMemo(
    () => NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => !item.adminOnly || currentUser?.role === "admin") })).filter((group) => group.items.length),
    [currentUser],
  );
  const flatItems = useMemo(() => visibleGroups.flatMap((group) => group.items), [visibleGroups]);
  const activeItem = flatItems.find((item) => item.id === activeTab);

  const checkSession = useCallback(async () => {
    setCheckingSession(true);
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      if (response.ok) {
        const result = await response.json();
        setCurrentUser(result.user as SignedInUser);
        setAuthenticated(true);
      } else {
        setCurrentUser(null);
        setAuthenticated(false);
        if (response.status !== 401) {
          const result = await response.json().catch(() => ({}));
          setLoginError(result.error || "The admin workspace could not be checked.");
        }
      }
    } catch {
      setCurrentUser(null);
      setAuthenticated(false);
      setLoginError("The admin workspace could not be reached. Try again.");
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
    const handleSessionExpired = () => { setAuthenticated(false); setCurrentUser(null); };
    window.addEventListener("admin-session-expired", handleSessionExpired);
    return () => window.removeEventListener("admin-session-expired", handleSessionExpired);
  }, [checkSession]);

  // Sidebar counters (new enquiries, clients waiting for a reply …), refreshed every 90 seconds.
  useEffect(() => {
    if (!authenticated) return;
    let stopped = false;
    async function refresh() {
      try {
        const response = await fetch("/api/admin/overview", { cache: "no-store" });
        if (!response.ok || stopped) return;
        const data = await response.json();
        setBadges({ reservations: data.stats.upcomingMeetings || 0, enquiries: data.stats.newEnquiries || 0, requests: data.stats.awaitingReply || 0 });
      } catch { /* badges are a nicety */ }
    }
    void refresh();
    const timer = window.setInterval(refresh, 90_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [authenticated]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setLoginError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      setLoginUsername("");
      setPassword("");
      await checkSession();
    } catch (reason) {
      setLoginError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setSigningIn(false);
    }
  }

  async function openRequestFromEnquiry(enquiry: EnquiryRecord) {
    const result = await cmsFetch<{ ref: string }>("/api/admin/requests", { method: "POST", body: JSON.stringify({ enquiryId: enquiry.id }) });
    return result.ref;
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setCurrentUser(null);
    setLoginUsername("");
    setPassword("");
  }

  if (checkingSession) {
    return <div className="cms-loading"><span className="cms-loading__bar" /><p>Opening your workspace…</p></div>;
  }

  if (!authenticated) {
    return (
      <div className="cms-login">
        <aside className="cms-login__art" aria-hidden="true">
          <BrandMark inverse />
          <div className="cms-login__drawing">
            <svg viewBox="0 0 400 300" fill="none">
              <path d="M40 250h320M70 250V120l90-60 90 60v130M250 250V150h80v100M110 250v-60h50v60M110 150h50M200 140h20v30h-20z" />
              <path className="dim" d="M40 270h320M40 265v10M360 265v10M20 250V60M15 250h10M15 60h10" />
              <text x="200" y="290">ELEVATION · NTS</text>
              <text x="8" y="160" transform="rotate(-90 8 160)">H 12.40 m</text>
            </svg>
          </div>
          <p className="cms-login__quote">Every page, project and client conversation, managed in one place.</p>
        </aside>
        <main className="cms-login__panel">
          <div className="cms-login__card">
            <p className="cms-eyebrow">Private workspace</p>
            <h1>Welcome <em>back.</em></h1>
            <p className="cms-muted">Sign in with your CMS username and password.</p>
            <form onSubmit={handleLogin} className="cms-form">
              <label className="cms-field">
                <span>Username</span>
                <input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={32} value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} required />
              </label>
              <label className="cms-field">
                <span>Password</span>
                <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              {loginError && <p className="cms-alert cms-alert--error" role="alert">{loginError}</p>}
              <button className="cms-btn cms-btn--primary cms-btn--block" type="submit" disabled={signingIn}>{signingIn ? "Signing in…" : "Sign in"} <span aria-hidden="true">→</span></button>
            </form>
            <Link className="cms-link-muted" href="/">← Back to the website</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`cms${menuOpen ? " cms--menu-open" : ""}`}>
      <aside className="cms-sidebar" aria-label="CMS navigation">
        <div className="cms-sidebar__top">
          <BrandMark inverse />
          <button type="button" className="cms-sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
        </div>
        <button type="button" className="cms-sidebar__search" onClick={() => setPaletteOpen(true)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <span>Jump to…</span><kbd>Ctrl K</kbd>
        </button>
        <nav className="cms-nav">
          {visibleGroups.map((group, groupIndex) => (
            <div className="cms-nav__group" key={group.label}>
              <p className="cms-nav__label"><span>{String(groupIndex + 1).padStart(2, "0")}</span>{group.label}</p>
              {group.items.map((item) => (
                <Link key={item.id} href={item.href} className={`cms-nav__item${activeTab === item.id ? " is-active" : ""}`} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                  {item.icon}<span>{item.label}</span>
                  {Boolean(badges[item.id]) && <em className="cms-nav__badge">{badges[item.id]! > 99 ? "99+" : badges[item.id]}</em>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        {currentUser && (
          <div className="cms-sidebar__user">
            <span className="cms-avatar" aria-hidden="true">{currentUser.username.slice(0, 1).toUpperCase()}</span>
            <span><strong>{currentUser.username}</strong><small>{currentUser.role === "admin" ? "Administrator" : "Content editor"}</small></span>
            <button type="button" onClick={() => void handleLogout()} title="Sign out" aria-label="Sign out">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M14 4.5h4.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H14M10 8l-4 4 4 4M6 12h10" /></svg>
            </button>
          </div>
        )}
      </aside>
      <div className="cms-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <div className="cms-main">
        <header className="cms-topbar">
          <button type="button" className="cms-topbar__menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
          </button>
          <div className="cms-topbar__title">
            <p className="cms-eyebrow">PCG / {activeItem?.label || "Workspace"}</p>
            <h1>{activeTab === "overview" ? <>{greeting()}, <em>{currentUser?.username}.</em></> : entryId && isCollectionId(activeTab) ? `Edit ${COLLECTIONS[activeTab].singular}` : activeItem?.label}</h1>
          </div>
          <div className="cms-topbar__actions">
            <Link className="cms-btn cms-btn--ghost" href="/" target="_blank" rel="noreferrer">View website <span aria-hidden="true">↗</span></Link>
          </div>
        </header>
        <div className="cms-content">
          {activeTab === "overview" && <AdminOverview />}
          {activeTab === "website" && <AdminHomeEditor embedded />}
          {activeTab === "pages" && <AdminPagesEditor />}
          {isCollectionId(activeTab) && (entryId ? <EntryEditor id={entryId} /> : <CollectionList collection={activeTab} />)}
          {(activeTab === "header" || activeTab === "footer" || activeTab === "settings") && <SiteSettingsEditor screen={activeTab} />}
          {activeTab === "trash" && <TrashList isAdmin={currentUser?.role === "admin"} />}
          {activeTab === "media" && <AdminMediaLibrary />}
          {activeTab === "requests" && <RequestsBoard />}
          {activeTab === "clients" && <ClientsConsole isAdmin={currentUser?.role === "admin"} />}
          {activeTab === "enquiries" && <EnquiriesInbox onConvert={openRequestFromEnquiry} />}
          {activeTab === "reservations" && <AdminReservationsConsole embedded />}
          {activeTab === "users" && currentUser?.role === "admin" && <AdminUsersConsole />}
          {activeTab === "activity" && currentUser?.role === "admin" && <ActivityLog />}
        </div>
      </div>
      {paletteOpen && <CommandPalette items={flatItems} onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
