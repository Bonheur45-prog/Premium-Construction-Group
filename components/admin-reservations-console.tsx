"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type Reservation = {
  id: string;
  name: string;
  email: string;
  phone: string;
  enquiryType: "personal" | "company";
  company: string;
  projectType: string;
  message: string;
  date: string;
  time: string;
  status: "confirmed" | "cancelled";
  customerEmailSent: boolean;
  adminEmailSent: boolean;
  createdAt: string;
};

function formatDate(date: string, time: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(`${date}T${time}:00+02:00`));
}

function dateInSouthAfrica() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeInSouthAfrica() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

export function AdminReservationsConsole({ embedded = false }: { embedded?: boolean } = {}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loginError, setLoginError] = useState("");
  const [pageError, setPageError] = useState("");
  const [password, setPassword] = useState("");
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editTimes, setEditTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");

  async function loadReservations() {
    setLoadingReservations(true);
    setPageError("");
    try {
      const response = await fetch("/api/admin/reservations", { cache: "no-store" });
      if (response.status === 401) {
        setAuthenticated(false);
        window.dispatchEvent(new Event("admin-session-expired"));
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load reservations.");
      setReservations(result.reservations as Reservation[]);
      setAuthenticated(true);
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "Could not load reservations.");
    } finally {
      setLoadingReservations(false);
      setCheckingSession(false);
    }
  }

  useEffect(() => {
    void loadReservations();
  }, []);

  useEffect(() => {
    if (!editingId || !editDate) {
      setEditTimes([]);
      return;
    }
    const controller = new AbortController();
    setLoadingTimes(true);
    fetch(`/api/admin/reservations/availability?date=${encodeURIComponent(editDate)}&reservationId=${encodeURIComponent(editingId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load meeting times.");
        setEditTimes(result.availableTimes as string[]);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setEditTimes([]);
        setPageError(reason instanceof Error ? reason.message : "Could not load meeting times.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingTimes(false);
      });
    return () => controller.abort();
  }, [editingId, editDate]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      setPassword("");
      await loadReservations();
    } catch (reason) {
      setLoginError(reason instanceof Error ? reason.message : "Could not sign in.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setReservations([]);
    setEditingId("");
  }

  function beginReschedule(reservation: Reservation) {
    setNotice("");
    setPageError("");
    setEditDate(reservation.date);
    setEditTime(reservation.time);
    setEditingId(reservation.id);
  }

  async function saveReschedule(reservation: Reservation) {
    if (!editDate || !editTime) {
      setPageError("Choose an available date and time.");
      return;
    }
    setSavingId(reservation.id);
    setPageError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/reservations/${encodeURIComponent(reservation.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: editDate, time: editTime }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not change the meeting time.");
      if (!result.unchanged) {
        setReservations((current) => current.map((item) => item.id === reservation.id ? result.reservation as Reservation : item));
        setNotice(
          result.notifications?.customer && result.notifications?.admin
            ? "New time saved. The client and admin inbox were emailed."
            : "New time saved, but one or more email notifications could not be delivered.",
        );
      }
      setEditingId("");
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "Could not change the meeting time.");
    } finally {
      setSavingId("");
    }
  }

  async function cancelReservation(reservation: Reservation) {
    const confirmed = window.confirm(`Cancel ${reservation.name}'s meeting on ${formatDate(reservation.date, reservation.time)}? The client will be emailed.`);
    if (!confirmed) return;
    setSavingId(reservation.id);
    setPageError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/reservations/${encodeURIComponent(reservation.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not cancel the meeting.");
      setReservations((current) => current.map((item) => item.id === reservation.id ? result.reservation as Reservation : item));
      setNotice(
        result.notifications?.customer && result.notifications?.admin
          ? "Reservation cancelled. The client and admin inbox were emailed."
          : "Reservation cancelled, but one or more email notifications could not be delivered.",
      );
      setEditingId("");
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "Could not cancel the meeting.");
    } finally {
      setSavingId("");
    }
  }

  async function retryNotifications(reservation: Reservation) {
    setSavingId(reservation.id);
    setPageError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/reservations/${encodeURIComponent(reservation.id)}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not resend the email notifications.");
      setReservations((current) => current.map((item) => item.id === reservation.id ? result.reservation as Reservation : item));
      setNotice(
        result.notifications?.customer && result.notifications?.admin
          ? "Email notifications sent to the client and admin inbox."
          : "One or more email notifications could not be delivered. Check the email settings and try again.",
      );
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "Could not resend the email notifications.");
    } finally {
      setSavingId("");
    }
  }

  if (checkingSession) {
    if (embedded) return <div className="admin-embedded-status">Loading reservations…</div>;
    return <div className="admin-screen"><p className="admin-loading">Loading reservation dashboard…</p></div>;
  }

  if (!authenticated) {
    if (embedded) return <div className="admin-embedded-status" role="alert">Your admin session could not be verified. Sign in again to continue.</div>;
    return (
      <div className="admin-screen">
        <div className="admin-login-card">
          <Link className="admin-brand" href="/" aria-label="Premium Construction Group home"><span>PCG</span><i>.</i></Link>
          <p className="admin-kicker">Private workspace</p>
          <h1>Reservation<br /><em>dashboard.</em></h1>
          <p className="admin-login-card__intro">Sign in to review upcoming client meetings and manage reservations.</p>
          <form onSubmit={handleLogin} className="admin-login-form">
            <label htmlFor="admin-password">Dashboard password</label>
            <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {loginError && <p className="admin-error" role="alert">{loginError}</p>}
            <button className="button button--dark" type="submit">Sign in <span aria-hidden="true">↗</span></button>
          </form>
          <Link className="admin-back-link" href="/admin">← Admin dashboard</Link>
        </div>
      </div>
    );
  }

  const today = dateInSouthAfrica();
  const now = timeInSouthAfrica();
  const upcomingCount = reservations.filter((reservation) =>
    reservation.status === "confirmed" && (reservation.date > today || (reservation.date === today && reservation.time > now)),
  ).length;
  const orderedReservations = [...reservations].sort((a, b) => {
    const rank = (reservation: Reservation) => reservation.status === "cancelled" ? 2 : reservation.date < today || (reservation.date === today && reservation.time <= now) ? 1 : 0;
    const statusOrder = rank(a) - rank(b);
    if (statusOrder !== 0) return statusOrder;
    const dateOrder = `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
    return rank(a) === 1 ? -dateOrder : dateOrder;
  });

  return (
    <div className={embedded ? "admin-reservations-embedded" : "admin-screen admin-screen--dashboard"}>
      {!embedded && <header className="admin-topbar">
        <Link className="admin-brand" href="/" aria-label="Premium Construction Group home"><span>PCG</span><i>.</i></Link>
        <div className="admin-topbar__right">
          <Link href="/admin">Admin dashboard</Link>
          <span>Reservations</span>
          <button type="button" onClick={handleLogout}>Sign out <span aria-hidden="true">↗</span></button>
        </div>
      </header>}
      <main className="admin-dashboard shell">
        <div className="admin-dashboard__heading">
          <div>
            <p className="admin-kicker">Client meetings</p>
            <h1>Reservation<br /><em>dashboard.</em></h1>
            <p>Review, reschedule, and keep every conversation moving.</p>
          </div>
          <div className="admin-count-card"><strong>{upcomingCount.toString().padStart(2, "0")}</strong><span>upcoming<br />meetings</span></div>
        </div>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        {pageError && <p className="admin-error admin-error--page" role="alert">{pageError}</p>}
        <div className="admin-list-heading">
          <h2>All reservations <span>{reservations.length.toString().padStart(2, "0")}</span></h2>
          <button type="button" className="admin-refresh" onClick={() => void loadReservations()} disabled={loadingReservations}>
            {loadingReservations ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
        {orderedReservations.length === 0 ? (
          <div className="admin-empty"><span>PCG / 01</span><h3>No meetings reserved yet.</h3><p>New client reservations will appear here, and the team will receive an email notification.</p></div>
        ) : (
          <div className="admin-reservation-list">
            {orderedReservations.map((reservation) => (
              <article className={`admin-reservation${reservation.status === "cancelled" ? " is-cancelled" : ""}`} key={reservation.id}>
                <div className="admin-reservation__date">
                  <span>{reservation.date}</span>
                  <strong>{reservation.time}</strong>
                  <small>{reservation.status === "confirmed" ? "SAST · 60 min" : "Cancelled"}</small>
                </div>
                <div className="admin-reservation__body">
                  <div className="admin-reservation__topline">
                    <div><p>{reservation.enquiryType === "company" && reservation.company ? reservation.company : reservation.projectType}</p><h3>{reservation.name}</h3></div>
                    <span className={`admin-status admin-status--${reservation.status}`}>{reservation.status}</span>
                  </div>
                  <div className="admin-reservation__contact">
                    <a href={`mailto:${reservation.email}`}>{reservation.email}</a>
                    {reservation.phone && <a href={`tel:${reservation.phone}`}>{reservation.phone}</a>}
                  </div>
                  {reservation.message && <p className="admin-reservation__message">{reservation.message}</p>}
                  <p className="admin-reservation__delivery">
                    Client email {reservation.customerEmailSent ? "sent" : "not sent"} · Admin email {reservation.adminEmailSent ? "sent" : "not sent"}
                  </p>
                  {(!reservation.customerEmailSent || !reservation.adminEmailSent) && (
                    <button type="button" className="admin-reservation__retry" disabled={savingId === reservation.id} onClick={() => void retryNotifications(reservation)}>
                      {savingId === reservation.id ? "Sending…" : "Retry email notifications"} <span aria-hidden="true">↗</span>
                    </button>
                  )}
                  {reservation.status === "confirmed" && (
                    <div className="admin-reservation__actions">
                      <button type="button" onClick={() => editingId === reservation.id ? setEditingId("") : beginReschedule(reservation)}>
                        {editingId === reservation.id ? "Close schedule" : "Change date or time"} <span aria-hidden="true">↗</span>
                      </button>
                      <button type="button" className="admin-reservation__cancel" disabled={savingId === reservation.id} onClick={() => void cancelReservation(reservation)}>
                        Cancel meeting
                      </button>
                    </div>
                  )}
                  {editingId === reservation.id && (
                    <div className="admin-reschedule">
                      <label>
                        <span>New date</span>
                        <input type="date" value={editDate} min={dateInSouthAfrica()} onChange={(event) => { setEditDate(event.target.value); setEditTime(""); }} />
                      </label>
                      <label>
                        <span>Available time</span>
                        <select value={editTime} onChange={(event) => setEditTime(event.target.value)} disabled={loadingTimes || !editTimes.length}>
                          <option value="">{loadingTimes ? "Loading…" : editTimes.length ? "Choose a time" : "No available times"}</option>
                          {editTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                        </select>
                      </label>
                      <button type="button" className="button button--dark" disabled={!editTime || savingId === reservation.id} onClick={() => void saveReschedule(reservation)}>
                        {savingId === reservation.id ? "Saving…" : "Confirm new time"} <span aria-hidden="true">↗</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="admin-timezone-note">Meeting times are shown in South Africa Standard Time (SAST).</p>
      </main>
    </div>
  );
}
