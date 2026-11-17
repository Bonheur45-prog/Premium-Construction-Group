"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminHomeEditor } from "@/components/admin-home-editor";
import { AdminPagesEditor } from "@/components/admin-pages-editor";
import { AdminReservationsConsole } from "@/components/admin-reservations-console";
import { AdminUsersConsole } from "@/components/admin-users-console";

type AdminTab = "website" | "pages" | "reservations" | "users";
type SignedInUser = { id: string; username: string; role: "admin" | "editor" };

function AdminLogo() {
  return (
    <Link className="brand admin-workspace-brand" href="/" aria-label="Premium Construction Group home">
      <span className="brand__mark">
        <Image src="/premium-mark.png" alt="" width={122} height={77} priority />
      </span>
      <span className="brand__name">
        <strong>Premium</strong>
        <span>Construction Group</span>
      </span>
    </Link>
  );
}

export function AdminWorkspace({ initialTab = "website" }: { initialTab?: AdminTab }) {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<SignedInUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginUsername, setLoginUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => setActiveTab(initialTab), [initialTab]);
  useEffect(() => {
    if (activeTab === "users" && currentUser && currentUser.role !== "admin") setActiveTab("website");
  }, [activeTab, currentUser]);

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
      }
      if (!response.ok && response.status !== 401) {
        const result = await response.json();
        setLoginError(result.error || "The admin workspace could not be checked.");
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

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setCurrentUser(null);
    setLoginUsername("");
    setPassword("");
  }

  if (checkingSession) {
    return <div className="admin-screen"><p className="admin-loading">Checking admin session…</p></div>;
  }

  if (!authenticated) {
    return (
      <div className="admin-screen">
        <div className="admin-login-card">
          <AdminLogo />
          <p className="admin-kicker">Private workspace</p>
          <h1>Admin<br /><em>dashboard.</em></h1>
          <p className="admin-login-card__intro">Sign in with your CMS username and password to manage website content and client reservations.</p>
          <form onSubmit={handleLogin} className="admin-login-form">
            <label htmlFor="admin-workspace-username">Username</label>
            <input id="admin-workspace-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={32} value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} required />
            <label htmlFor="admin-workspace-password">Password</label>
            <input id="admin-workspace-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {loginError && <p className="admin-error" role="alert">{loginError}</p>}
            <button className="button button--dark" type="submit" disabled={signingIn}>{signingIn ? "Signing in…" : "Sign in"} <span aria-hidden="true">↗</span></button>
          </form>
          <Link className="admin-back-link" href="/">← Back to website</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-workspace">
      <header className="admin-workspace__topbar">
        <AdminLogo />
        <div className="admin-workspace__actions">
          {currentUser && (
            <div className="admin-workspace__identity">
              <span aria-hidden="true">{currentUser.username.slice(0, 1).toUpperCase()}</span>
              <span><strong>{currentUser.username}</strong><small>{currentUser.role === "admin" ? "Administrator" : "Content editor"}</small></span>
            </div>
          )}
          <Link href="/" target="_blank" rel="noreferrer">View website <span aria-hidden="true">↗</span></Link>
          <button type="button" onClick={() => void handleLogout()}>Sign out</button>
        </div>
      </header>
      <nav className="admin-workspace__tabs" aria-label="Admin dashboard sections">
        <span className="admin-workspace__nav-label">Manage</span>
        <Link className={activeTab === "website" ? "is-active" : ""} href="/admin/home" aria-current={activeTab === "website" ? "page" : undefined}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="12" rx="2" /><path d="M8 20h8m-4-3.5V20M3.5 8h17" /></svg><span>Website</span>
        </Link>
        <Link className={activeTab === "pages" ? "is-active" : ""} href="/admin/pages" aria-current={activeTab === "pages" ? "page" : undefined}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l4.5 4.5v12a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-16a.5.5 0 0 1 .5-.5Z" /><path d="M14 3.5V8h4.5M9 12h6m-6 3h6" /></svg><span>Pages</span>
        </Link>
        <Link className={activeTab === "reservations" ? "is-active" : ""} href="/admin/reservations" aria-current={activeTab === "reservations" ? "page" : undefined}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" /></svg><span>Reservations</span>
        </Link>
        {currentUser?.role === "admin" && (
          <Link className={activeTab === "users" ? "is-active" : ""} href="/admin/users" aria-current={activeTab === "users" ? "page" : undefined}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" /><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0m2-10.5a3.5 3.5 0 0 1 0 6.8m1 1.7a5 5 0 0 1 3 2" /></svg><span>Users</span>
          </Link>
        )}
      </nav>
      <div className="admin-workspace__content">
        {activeTab === "website" && <AdminHomeEditor embedded />}
        {activeTab === "pages" && <AdminPagesEditor />}
        {activeTab === "reservations" && <AdminReservationsConsole embedded />}
        {activeTab === "users" && currentUser?.role === "admin" && <AdminUsersConsole />}
      </div>
    </div>
  );
}
