"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { TurnstileField } from "@/components/turnstile-field";

type EnquiryType = "personal" | "company";

export function ContactEnquiryForm() {
  // Arriving from the budget estimator (/contact?message=…): start the message with the estimate.
  const messageField = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("message");
    if (preset && messageField.current && !messageField.current.value) messageField.current.value = `${preset.slice(0, 600)}\n\n`;
  }, []);
  const [enquiryType, setEnquiryType] = useState<EnquiryType>("personal");
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setSending(true);
    setStatus(null);
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, enquiryType, turnstileToken }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your enquiry couldn't be sent. Please try again.");
      form.reset();
      setStatus({
        tone: "ok",
        text: result.acknowledged
          ? "Thank you, your enquiry has been received. We've emailed you a copy and will reply within two working days."
          : "Thank you, your enquiry has been received. We'll reply within two working days.",
      });
    } catch (reason) {
      setStatus({ tone: "error", text: reason instanceof Error ? reason.message : "Your enquiry couldn't be sent. Please try again." });
    } finally {
      setSending(false);
      setResetSignal((value) => value + 1);
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <fieldset className="contact-form__type">
        <legend>I&apos;m enquiring as</legend>
        <div className="contact-form__switch" role="group" aria-label="Enquiry type">
          <button
            type="button"
            className={enquiryType === "personal" ? "is-selected" : ""}
            aria-pressed={enquiryType === "personal"}
            onClick={() => setEnquiryType("personal")}
          >
            <svg className="contact-form__switch-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="6.5" r="3" />
              <path d="M4.5 17c.5-3.1 2.4-4.8 5.5-4.8s5 1.7 5.5 4.8" />
            </svg>
            Personal
          </button>
          <button
            type="button"
            className={enquiryType === "company" ? "is-selected" : ""}
            aria-pressed={enquiryType === "company"}
            onClick={() => setEnquiryType("company")}
          >
            <svg className="contact-form__switch-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none">
              <path d="M3 17.2h14M4.5 17V5.5L10 2.8l5.5 2.7V17M7.5 8h1m3 0h1M7.5 11.5h1m3 0h1M8.5 17v-2.8h3V17" />
            </svg>
            Company
          </button>
        </div>
      </fieldset>

      <div className="contact-form__fields">
        <label className="contact-field">
          <span>First name <i>*</i></span>
          <input name="firstName" maxLength={80} autoComplete="given-name" placeholder="Your first name" required />
        </label>
        <label className="contact-field">
          <span>Last name <i>*</i></span>
          <input name="lastName" maxLength={80} autoComplete="family-name" placeholder="Your last name" required />
        </label>
        <label className="contact-field">
          <span>Email address <i>*</i></span>
          <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </label>
        <label className="contact-field">
          <span>Phone number</span>
          <input name="phone" type="tel" autoComplete="tel" placeholder="Include your country code" />
        </label>
        {enquiryType === "company" && (
          <label className="contact-field contact-field--full">
            <span>Company name <i>*</i></span>
            <input name="company" autoComplete="organization" placeholder="Your company name" required />
          </label>
        )}
        <label className="contact-field contact-field--full">
          <span>What are you looking to build? <i>*</i></span>
          <select name="projectType" defaultValue="" required>
            <option value="" disabled>Select a project type</option>
            <option value="new-build">New build</option>
            <option value="renovation">Renovation or extension</option>
            <option value="design">Design coordination</option>
            <option value="management">Project management</option>
            <option value="other">Something else</option>
          </select>
        </label>
        <label className="contact-field contact-field--full">
          <span>A little more about your project <i>*</i></span>
          <textarea ref={messageField} name="message" rows={5} maxLength={5000} minLength={10} placeholder="Share your ideas, location, timeline, or any early questions..." required />
        </label>
      </div>

      <label className="contact-form__trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <TurnstileField onToken={setTurnstileToken} resetSignal={resetSignal} />
      <div className="contact-form__submit-row">
        <p>Fields marked <i>*</i> are required.</p>
        <button className="button button--dark contact-form__submit" type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send enquiry"} <span aria-hidden="true">↗</span>
        </button>
      </div>
      {status && <p className={`contact-form__status contact-form__status--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>{status.text}</p>}
    </form>
  );
}
