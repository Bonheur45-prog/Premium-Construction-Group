"use client";

import { useState, type FormEvent } from "react";

type EnquiryType = "personal" | "company";

export function ContactEnquiryForm() {
  const [enquiryType, setEnquiryType] = useState<EnquiryType>("personal");
  const [status, setStatus] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(
      "This form is ready for your enquiry, but it is not connected to an inbox yet. Your message has not been sent.",
    );
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
          <input name="firstName" autoComplete="given-name" placeholder="Your first name" required />
        </label>
        <label className="contact-field">
          <span>Last name <i>*</i></span>
          <input name="lastName" autoComplete="family-name" placeholder="Your last name" required />
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
          <textarea name="message" rows={5} placeholder="Share your ideas, location, timeline, or any early questions..." required />
        </label>
      </div>

      <div className="contact-form__submit-row">
        <p>Fields marked <i>*</i> are required.</p>
        <button className="button button--dark contact-form__submit" type="submit">
          Send enquiry <span aria-hidden="true">↗</span>
        </button>
      </div>
      {status && <p className="contact-form__status" role="status">{status}</p>}
    </form>
  );
}
