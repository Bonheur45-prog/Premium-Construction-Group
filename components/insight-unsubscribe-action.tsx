"use client";

import { useState } from "react";

export function InsightUnsubscribeAction({ email, token }: { email: string; token: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function unsubscribe() {
    if (pending || !email || !token) return;
    setPending(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/insights/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "We could not update your subscription.");
      setMessage("You have been unsubscribed from PCG insight updates.");
    } catch (unsubscribeError) {
      setError(true);
      setMessage(unsubscribeError instanceof Error ? unsubscribeError.message : "We could not update your subscription.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="insight-unsubscribe-action">
      <button className="button button--primary" type="button" onClick={unsubscribe} disabled={pending || !email || !token}>
        {pending ? "Updating…" : "Unsubscribe"}
      </button>
      <p aria-live="polite" role={error ? "alert" : "status"}>{message || (!email || !token ? "This unsubscribe link is incomplete." : "")}</p>
    </div>
  );
}
