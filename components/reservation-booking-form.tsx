"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

const TIME_ZONE = "Africa/Kigali";

type Availability = { availableTimes: string[]; min: string; max: string };

function getDateInKigali(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getBookingMaxDate(windowDays: number) {
  const today = getDateInKigali(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const lastDate = new Date(Date.UTC(year, month - 1, day + windowDays));
  return [
    lastDate.getUTCFullYear(),
    String(lastDate.getUTCMonth() + 1).padStart(2, "0"),
    String(lastDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function formatBookingDate(date: string, time: string) {
  const scheduled = new Date(`${date}T${time}:00+02:00`);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(scheduled);
}

export function ReservationBookingForm({
  enabled,
  windowDays = 90,
  durationMinutes = 60,
  daysLabel = "Weekdays",
  hoursLabel = "09:00–17:00",
  timezoneLabel = "CAT",
}: {
  enabled: boolean;
  windowDays?: number;
  durationMinutes?: number;
  daysLabel?: string;
  hoursLabel?: string;
  timezoneLabel?: string;
}) {
  const [enquiryType, setEnquiryType] = useState<"personal" | "company">("personal");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{
    date: string;
    time: string;
    customerEmailSent: boolean;
    adminEmailSent: boolean;
  } | null>(null);

  useEffect(() => {
    if (!date || !enabled) {
      setAvailability(null);
      setTime("");
      return;
    }

    const controller = new AbortController();
    setLoadingTimes(true);
    setError("");
    setTime("");

    fetch(`/api/reservations/availability?date=${encodeURIComponent(date)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load available times.");
        setAvailability(result as Availability);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setAvailability({ availableTimes: [], min: "", max: "" });
        setError(reason instanceof Error ? reason.message : "Could not load available times.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingTimes(false);
      });

    return () => controller.abort();
  }, [date, enabled]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    if (!time) {
      setError("Choose an available meeting time to continue.");
      return;
    }

    setSubmitting(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const payload = {
      name: `${String(values.get("firstName") || "").trim()} ${String(values.get("lastName") || "").trim()}`.trim(),
      email: values.get("email"),
      phone: values.get("phone"),
      enquiryType,
      company: values.get("company"),
      projectType: values.get("projectType"),
      message: values.get("message"),
      date,
      time,
      website: values.get("website"),
    };

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not save your reservation.");
      setConfirmation({
        date: result.reservation.date,
        time: result.reservation.time,
        customerEmailSent: Boolean(result.notifications?.customer),
        adminEmailSent: Boolean(result.notifications?.admin),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not save your reservation.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div className="booking-confirmation" role="status">
        <span className="booking-confirmation__icon" aria-hidden="true">✓</span>
        <p className="booking-form__eyebrow">Reservation confirmed</p>
        <h3>You&apos;re on our calendar.</h3>
        <p className="booking-confirmation__time">{formatBookingDate(confirmation.date, confirmation.time)}</p>
        <p>
          {confirmation.customerEmailSent
            ? "A confirmation has been emailed to you, and our team can see your booking."
            : "Your booking is saved and our team can see it. We couldn't email you a confirmation this time, so please keep a note of the date and time above."}
        </p>
        <button className="text-link booking-confirmation__again" type="button" onClick={() => window.location.reload()}>
          Make another reservation <span aria-hidden="true">↗</span>
        </button>
      </div>
    );
  }

  const minDate = getDateInKigali(new Date());
  const maxDate = getBookingMaxDate(windowDays);

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <div className="booking-form__identity">
        <div className="booking-form__choice" role="group" aria-label="Reservation type">
          <button type="button" className={enquiryType === "personal" ? "is-selected" : ""} aria-pressed={enquiryType === "personal"} onClick={() => setEnquiryType("personal")}>
            <span aria-hidden="true">01</span> Personal
          </button>
          <button type="button" className={enquiryType === "company" ? "is-selected" : ""} aria-pressed={enquiryType === "company"} onClick={() => setEnquiryType("company")}>
            <span aria-hidden="true">02</span> Company
          </button>
        </div>
        <p>{enabled ? "We'll use these details to confirm your meeting." : "Online booking is not open yet. Please contact our team to arrange a meeting."}</p>
      </div>

      {!enabled && (
        <p className="booking-form__availability" role="status">
          The reservation form is shown here. <Link href="/contact">Contact the team</Link> to arrange a meeting while online booking is being prepared.
        </p>
      )}

      <fieldset className="booking-form__fields" disabled={!enabled}>
        <label className="booking-field">
          <span>First name <i>*</i></span>
          <input name="firstName" autoComplete="given-name" placeholder="Your first name" required />
        </label>
        <label className="booking-field">
          <span>Last name <i>*</i></span>
          <input name="lastName" autoComplete="family-name" placeholder="Your last name" required />
        </label>
        <label className="booking-field">
          <span>Email address <i>*</i></span>
          <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </label>
        <label className="booking-field">
          <span>Phone number</span>
          <input name="phone" type="tel" autoComplete="tel" placeholder="Include your country code" />
        </label>
        {enquiryType === "company" && (
          <label className="booking-field booking-field--full">
            <span>Company name <i>*</i></span>
            <input name="company" autoComplete="organization" placeholder="Your company name" required />
          </label>
        )}
        <label className="booking-field booking-field--full">
          <span>What would you like to discuss? <i>*</i></span>
          <select name="projectType" defaultValue="" required>
            <option value="" disabled>Select a project topic</option>
            <option value="New build">New build</option>
            <option value="Renovation or extension">Renovation or extension</option>
            <option value="Design coordination">Design coordination</option>
            <option value="Project management">Project management</option>
            <option value="Construction delivery">Construction delivery</option>
            <option value="Something else">Something else</option>
          </select>
        </label>
        <label className="booking-field">
          <span>Choose a date <i>*</i></span>
          <input name="date" type="date" value={date} min={minDate} max={maxDate} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className="booking-field">
          <span>Available time <i>*</i></span>
          <select name="time" value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || loadingTimes || !availability?.availableTimes.length} required>
            <option value="">
              {!date ? "Choose a date first" : loadingTimes ? "Loading times…" : availability?.availableTimes.length ? "Select a time" : "No times available"}
            </option>
            {availability?.availableTimes.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
          </select>
        </label>
        <label className="booking-field booking-field--full">
          <span>What should our expert know? <small>Optional</small></span>
          <textarea name="message" rows={4} maxLength={1800} placeholder="Share a little about the project or any questions you would like to cover." />
        </label>
        <label className="booking-form__honeypot" aria-hidden="true">
          Leave this field blank
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </fieldset>

      {error && <p className="booking-form__message booking-form__message--error" role="alert">{error}</p>}
      <div className="booking-form__submit-row">
        <p>{enabled ? `${durationMinutes}-minute meetings · ${daysLabel} · Kigali time (${timezoneLabel})` : "Online booking is closed at the moment."}</p>
        <button className="button button--dark" type="submit" disabled={!enabled || submitting || loadingTimes}>
          {!enabled ? "Booking closed" : submitting ? "Reserving…" : "Reserve a meeting"} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p className="booking-form__timezone">{enabled ? `Available ${daysLabel.toLowerCase()} from ${hoursLabel} ${timezoneLabel}.` : "Your details will be available to enter here when online booking opens."}</p>
    </form>
  );
}
