"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type CmsUser = { id: string; username: string; role: "admin" | "editor"; createdAt: string };

export function AdminUsersConsole() {
  const [users, setUsers] = useState<CmsUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CmsUser["role"]>("editor");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
      if (!response.ok) throw new Error(result.error || "CMS users could not be loaded.");
      setUsers(result.users as CmsUser[]);
      setStatus("");
    } catch (reason) {
      setError(true);
      setStatus(reason instanceof Error ? reason.message : "CMS users could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(false);
    setStatus("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const result = await response.json();
      if (response.status === 401) window.dispatchEvent(new Event("admin-session-expired"));
      if (!response.ok) throw new Error(result.error || "The account could not be created.");
      setUsers((current) => [...current, result.user as CmsUser].sort((a, b) => a.username.localeCompare(b.username)));
      setUsername("");
      setPassword("");
      setRole("editor");
      setStatus(`Account “${(result.user as CmsUser).username}” created.`);
    } catch (reason) {
      setError(true);
      setStatus(reason instanceof Error ? reason.message : "The account could not be created.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="admin-dashboard shell admin-users-console">
      <div className="admin-home-heading">
        <div><p className="admin-kicker">Access management</p><h1>CMS<br /><em>users.</em></h1></div>
        <p>Create username and password accounts for people who need access to the dashboard.</p>
      </div>
      {status && <p className={`admin-home-status${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>{status}</p>}

      <section className="admin-users-card" aria-labelledby="create-cms-user-title">
        <div className="admin-users-card__heading"><p className="admin-kicker">New account</p><h2 id="create-cms-user-title">Create a user</h2></div>
        <form className="admin-user-form" onSubmit={(event) => void createUser(event)}>
          <label className="admin-home-field"><span>Username</span><input autoComplete="off" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" value={username} onChange={(event) => setUsername(event.target.value)} /><small>3–32 letters, numbers, dots, dashes, or underscores.</small></label>
          <label className="admin-home-field"><span>Password</span><input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><small>Use at least 12 characters. The password is stored as a salted hash.</small></label>
          <label className="admin-home-field"><span>Access</span><select value={role} onChange={(event) => setRole(event.target.value as CmsUser["role"])}><option value="editor">Editor · manage site and reservations</option><option value="admin">Administrator · also manage users</option></select></label>
          <button className="button button--dark" type="submit" disabled={creating}>{creating ? "Creating…" : "Create account"}</button>
        </form>
      </section>

      <section className="admin-users-card admin-users-list" aria-labelledby="cms-users-title">
        <div className="admin-users-card__heading"><p className="admin-kicker">Current access</p><h2 id="cms-users-title">Users {users.length > 0 && <span>({users.length})</span>}</h2></div>
        {loading ? <p className="admin-users-empty">Loading accounts…</p> : users.length ? (
          <ul>
            {users.map((user) => <li key={user.id}><span><strong>{user.username}</strong><small>Created {user.createdAt.slice(0, 10)}</small></span><span className={`admin-users-role is-${user.role}`}>{user.role === "admin" ? "Administrator" : "Editor"}</span></li>)}
          </ul>
        ) : <p className="admin-users-empty">No CMS accounts were found.</p>}
      </section>
    </main>
  );
}
