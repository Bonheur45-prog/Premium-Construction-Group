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
          {currentUser && <span className="admin-workspace__identity">{currentUser.username}</span>}
          <Link href="/" target="_blank" rel="noreferrer">View website ↗</Link>
          <button type="button" onClick={() => void handleLogout()}>Sign out</button>
        </div>
      </header>
      <nav className="admin-workspace__tabs" aria-label="Admin dashboard sections">
        <Link className={activeTab === "website" ? "is-active" : ""} href="/admin/home" aria-current={activeTab === "website" ? "page" : undefined}>Website</Link>
        <Link className={activeTab === "pages" ? "is-active" : ""} href="/admin/pages" aria-current={activeTab === "pages" ? "page" : undefined}>Pages</Link>
        <Link className={activeTab === "reservations" ? "is-active" : ""} href="/admin/reservations" aria-current={activeTab === "reservations" ? "page" : undefined}>Reservations</Link>
        {currentUser?.role === "admin" && <Link className={activeTab === "users" ? "is-active" : ""} href="/admin/users" aria-current={activeTab === "users" ? "page" : undefined}>Users</Link>}
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
