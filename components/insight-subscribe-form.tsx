"use client";

import { useState, type FormEvent } from "react";

type InsightSubscribeFormProps = { sourceInsight: string };

export function InsightSubscribeForm({ sourceInsight }: InsightSubscribeFormProps) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    setPending(true);
    setStatus("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/insights/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          sourceInsight,
          consent: form.get("consent") === "on",
          website: form.get("website"),
        }),
      });
      const result = await response.json() as { ok?: boolean; status?: string; updatesEnabled?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "We could not save your subscription. Please try again.");
      setStatus(result.status === "already"
        ? result.updatesEnabled ? "You are already subscribed to PCG insight updates." : "Your subscription is saved. Email updates are not enabled on this site yet."
        : result.updatesEnabled ? "You’re subscribed. We’ll send new PCG insights to your inbox." : "Your subscription is saved. Email updates are not enabled on this site yet.");
      formElement.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We could not save your subscription. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="insight-subscribe" aria-labelledby="insight-subscribe-title">
      <div className="insight-subscribe__copy">
        <p className="section-kicker section-kicker--light"><span>Stay in the loop</span><span className="section-kicker__rule" /></p>
        <h2 id="insight-subscribe-title">More useful thinking,<br /><em>delivered occasionally.</em></h2>
        <p>Subscribe for new construction perspectives and PCG updates. We’ll only use your email for insight updates, and you can unsubscribe at any time.</p>
      </div>
      <form className="insight-subscribe__form" onSubmit={handleSubmit}>
        <label className="insight-subscribe__email-label" htmlFor="insight-subscribe-email">Email address</label>
        <div className="insight-subscribe__input-row">
          <input id="insight-subscribe-email" type="email" name="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required />
          <button className="button button--primary" type="submit" disabled={pending}>
            {pending ? "Subscribing…" : "Subscribe"}<span aria-hidden="true">↗</span>
          </button>
        </div>
        <label className="insight-subscribe__consent">
          <input type="checkbox" name="consent" required />
          <span>I agree to receive occasional new insight updates by email.</span>
        </label>
        <div className="insight-subscribe__honeypot" aria-hidden="true">
          <label htmlFor="insight-subscribe-website">Leave this field empty</label>
          <input id="insight-subscribe-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <p className="insight-subscribe__message" aria-live="polite" role={error ? "alert" : "status"}>{error || status}</p>
      </form>
    </section>
  );
}
