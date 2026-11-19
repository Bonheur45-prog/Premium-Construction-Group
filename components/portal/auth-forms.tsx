"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TurnstileField } from "@/components/turnstile-field";
import { portalFetch } from "@/components/portal/portal-fetch";

function safeNext(next: string | undefined) {
  return next && next.startsWith("/account") && !next.startsWith("//") ? next : "/account";
}

function Status({ state }: { state: { tone: "ok" | "error"; text: string } | null }) {
  if (!state) return null;
  return <p className={`portal-alert portal-alert--${state.tone}`} role={state.tone === "error" ? "alert" : "status"}>{state.text}</p>;
}

function PasswordField({ label, name, autoComplete, minLength }: { label: string; name: string; autoComplete: string; minLength?: number }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="portal-field">
      <span>{label}</span>
      <span className="portal-password">
        <input name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} maxLength={128} required />
        <button type="button" onClick={() => setShown((value) => !value)} aria-label={shown ? "Hide password" : "Show password"}>{shown ? "Hide" : "Show"}</button>
      </span>
      {minLength && <small>At least {minLength} characters. A short sentence works well.</small>}
    </label>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setState(null);
    try {
      await portalFetch("/api/account/session", { method: "POST", body: JSON.stringify(data) });
      window.location.assign(safeNext(next));
    } catch (reason) {
      setState({ tone: "error", text: reason instanceof Error ? reason.message : "You couldn't be signed in." });
      setBusy(false);
    }
  }
  return (
    <form className="portal-form" onSubmit={submit}>
      <label className="portal-field"><span>Email</span><input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <PasswordField label="Password" name="password" autoComplete="current-password" />
      <Link className="portal-form__aside" href="/account/forgot">Forgot your password?</Link>
      <Status state={state} />
      <button className="button button--dark portal-form__submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <span aria-hidden="true">→</span></button>
      <p className="portal-form__switch">New here? <Link href="/account/signup">Create a client account</Link></p>
    </form>
  );
}

export function SignupForm({ email = "" }: { email?: string }) {
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [reset, setReset] = useState(0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    setBusy(true);
    setState(null);
    try {
      await portalFetch("/api/account/signup", { method: "POST", body: JSON.stringify({ ...data, acceptTerms: form.get("acceptTerms") === "on", turnstileToken: token }) });
      window.location.assign("/account?welcome=1");
    } catch (reason) {
      setState({ tone: "error", text: reason instanceof Error ? reason.message : "Your account couldn't be created." });
      setBusy(false);
      setReset((value) => value + 1);
    }
  }
  return (
    <form className="portal-form" onSubmit={submit}>
      <div className="portal-form__row">
        <label className="portal-field"><span>Full name</span><input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
        <label className="portal-field"><span>Phone (optional)</span><input name="phone" type="tel" autoComplete="tel" maxLength={30} placeholder="+250 …" /></label>
      </div>
      <label className="portal-field"><span>Email</span><input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={email} /></label>
      <label className="portal-field"><span>Company (optional)</span><input name="company" autoComplete="organization" maxLength={160} /></label>
      <PasswordField label="Choose a password" name="password" autoComplete="new-password" minLength={10} />
      <label className="portal-check"><input type="checkbox" name="acceptTerms" required /><span>I agree that Premium Construction Group may store my details to manage my requests and contact me about them.</span></label>
      <label className="contact-form__trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <TurnstileField onToken={setToken} resetSignal={reset} />
      <Status state={state} />
      <button className="button button--dark portal-form__submit" type="submit" disabled={busy}>{busy ? "Creating your account…" : "Create account"} <span aria-hidden="true">→</span></button>
      <p className="portal-form__switch">Already have an account? <Link href="/account/login">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [reset, setReset] = useState(0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setState(null);
    try {
      await portalFetch("/api/account/forgot", { method: "POST", body: JSON.stringify({ ...data, turnstileToken: token }) });
      setState({ tone: "ok", text: "If an account uses that email, a reset link is on its way. It works for one hour — check your spam folder too." });
    } catch (reason) {
      setState({ tone: "error", text: reason instanceof Error ? reason.message : "Something went wrong." });
    } finally {
      setBusy(false);
      setReset((value) => value + 1);
    }
  }
  return (
    <form className="portal-form" onSubmit={submit}>
      <label className="portal-field"><span>Email</span><input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <TurnstileField onToken={setToken} resetSignal={reset} />
      <Status state={state} />
      <button className="button button--dark portal-form__submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"} <span aria-hidden="true">→</span></button>
      <p className="portal-form__switch"><Link href="/account/login">← Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) return setState({ tone: "error", text: "The two passwords don't match." });
    setBusy(true);
    setState(null);
    try {
      await portalFetch("/api/account/reset", { method: "POST", body: JSON.stringify({ token, password: form.get("password") }) });
      window.location.assign("/account?reset=1");
    } catch (reason) {
      setState({ tone: "error", text: reason instanceof Error ? reason.message : "Your password couldn't be changed." });
      setBusy(false);
    }
  }
  if (!token) return <p className="portal-alert portal-alert--error">This reset link is incomplete. <Link href="/account/forgot">Ask for a new one</Link>.</p>;
  return (
    <form className="portal-form" onSubmit={submit}>
      <PasswordField label="New password" name="password" autoComplete="new-password" minLength={10} />
      <PasswordField label="Repeat it" name="confirm" autoComplete="new-password" />
      <Status state={state} />
      <button className="button button--dark portal-form__submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Set new password"} <span aria-hidden="true">→</span></button>
    </form>
  );
}

export function VerifyRunner({ token }: { token: string }) {
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) { setState({ tone: "error", text: "This confirmation link is incomplete." }); return; }
    portalFetch<{ linked: string[] }>("/api/account/verify", { method: "POST", body: JSON.stringify({ token }) })
      .then((result) => {
        setState({ tone: "ok", text: result.linked.length ? `Email confirmed. We found ${result.linked.length} earlier request${result.linked.length === 1 ? "" : "s"} and added ${result.linked.length === 1 ? "it" : "them"} to your account.` : "Email confirmed. Your account is ready." });
        window.setTimeout(() => window.location.assign("/account"), 1800);
      })
      .catch((reason: Error) => setState({ tone: "error", text: reason.message }));
  }, [token]);
  return (
    <div className="portal-form">
      {state ? <Status state={state} /> : <p className="portal-muted">Confirming your email…</p>}
      {state?.tone === "error" && <p className="portal-form__switch"><Link href="/account">Go to your account</Link> to request a new link.</p>}
    </div>
  );
}
