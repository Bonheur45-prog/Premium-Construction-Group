"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Clock } from "@/components/icons";
import { ReservationBookingForm } from "@/components/reservation-booking-form";

type Meeting = { id: string; date: string; time: string; durationMinutes: number; status: string; topic: string; note: string };
type Booking = { enabled: boolean; windowDays: number; durationMinutes: number; daysLabel: string; hoursLabel: string; timezoneLabel: string };

/** Meetings with the team: what's coming up, what happened, and booking without retyping your details. */
export function MeetingsView({ booking }: { booking: Booking }) {
  const [data, setData] = useState<{ meetings: Meeting[]; me: { name: string; email: string; phone: string; company: string } } | null>(null);
  const load = useCallback(() => fetch("/api/portal/meetings", { cache: "no-store" }).then((response) => response.json()).then(setData).catch(() => undefined), []);
  useEffect(() => { void load(); }, [load]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (data?.meetings || []).filter((meeting) => meeting.status === "confirmed" && meeting.date >= today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const past = (data?.meetings || []).filter((meeting) => !upcoming.includes(meeting)).slice(0, 8);
  return (
    <div className="ps-page">
      <header className="ps-page__head">
        <p className="portal-eyebrow">Meetings</p>
        <h1>Time with <em>our team.</em></h1>
        <p className="portal-muted">Book a conversation on site, at our office or by video. Your details are already filled in.</p>
      </header>
      <div className="meet-layout">
        <div className="meet-list">
          <h2 className="portal-section-title">Coming up <span>{upcoming.length}</span></h2>
          {upcoming.length ? (
            <ul className="meet-cards">
              {upcoming.map((meeting) => {
                const date = new Date(`${meeting.date}T${meeting.time}:00+02:00`);
                return (
                  <li key={meeting.id} className="meet-card">
                    <span className="meet-card__date"><small>{date.toLocaleDateString("en-GB", { month: "short", timeZone: "Africa/Kigali" })}</small><strong>{date.toLocaleDateString("en-GB", { day: "2-digit", timeZone: "Africa/Kigali" })}</strong></span>
                    <span className="meet-card__main"><strong>{date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Africa/Kigali" })} · {meeting.time}</strong><small><Clock size={14} /> {meeting.durationMinutes} minutes · Kigali time</small>{meeting.topic && <em>{meeting.topic}</em>}</span>
                  </li>
                );
              })}
            </ul>
          ) : <div className="ps-empty ps-empty--small"><CalendarCheck size={36} weight="duotone" /><p>No meetings booked. Choose a time on the right.</p></div>}
          {past.length > 0 && (
            <>
              <h2 className="portal-section-title">Earlier</h2>
              <ul className="meet-past">{past.map((meeting) => <li key={meeting.id}><span>{new Date(`${meeting.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {meeting.time}</span><em>{meeting.status === "cancelled" ? "Cancelled" : meeting.topic}</em></li>)}</ul>
            </>
          )}
        </div>
        <div className="meet-book booking-card">
          {data && <ReservationBookingForm {...booking} prefill={data.me} onBooked={() => void load()} />}
        </div>
      </div>
    </div>
  );
}
