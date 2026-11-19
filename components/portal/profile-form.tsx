"use client";

import { useState, type FormEvent } from "react";
import { portalFetch } from "@/components/portal/portal-fetch";

type Profile = { name: string; email: string; phone: string; company: string; notifyEmail: boolean };

export function ProfileForm({ initial }: { initial: Profile }) {
  const [profileState, setProfileState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [passwordState, setPasswordState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await portalFetch("/api/account/profile", { method: "PATCH", body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), company: form.get("company"), notifyEmail: form.get("notifyEmail") === "on" }) });
      setProfileState({ tone: "ok", text: "Your details are saved." });
    } catch (reason) {
      setProfileState({ tone: "error", text: reason instanceof Error ? reason.message : "Couldn't save." });
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (form.get("password") !== form.get("confirm")) return setPasswordState({ tone: "error", text: "The new passwords don't match." });
    try {
      await portalFetch("/api/account/password", { method: "POST", body: JSON.stringify({ current: form.get("current"), password: form.get("password") }) });
      formElement.reset();
      setPasswordState({ tone: "ok", text: "Password changed. Other devices have been signed out." });
    } catch (reason) {
      setPasswordState({ tone: "error", text: reason instanceof Error ? reason.message : "Couldn't change your password." });
    }
  }

  async function signOut() {
    await portalFetch("/api/account/session", { method: "DELETE" }).catch(() => undefined);
    window.location.assign("/account/login");
  }

  return (
    <div className="portal-profile">
      <form className="portal-panel portal-form" onSubmit={saveProfile}>
        <h3>Your details</h3>
        <label className="portal-field"><span>Email</span><input value={initial.email} disabled /><small>To change your email, contact us.</small></label>
        <label className="portal-field"><span>Full name</span><input name="name" defaultValue={initial.name} required minLength={2} maxLength={120} /></label>
        <div className="portal-form__row">
          <label className="portal-field"><span>Phone</span><input name="phone" type="tel" defaultValue={initial.phone} maxLength={30} /></label>
          <label className="portal-field"><span>Company</span><input name="company" defaultValue={initial.company} maxLength={160} /></label>
        </div>
        <label className="portal-check"><input type="checkbox" name="notifyEmail" defaultChecked={initial.notifyEmail} /><span>Email me when there&apos;s an update or a message on my requests</span></label>
        {profileState && <p className={`portal-alert portal-alert--${profileState.tone}`}>{profileState.text}</p>}
        <button className="button button--dark" type="submit">Save details</button>
      </form>
      <form className="portal-panel portal-form" onSubmit={changePassword}>
        <h3>Password</h3>
        <label className="portal-field"><span>Current password</span><input name="current" type="password" autoComplete="current-password" required /></label>
        <label className="portal-field"><span>New password</span><input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /></label>
        <label className="portal-field"><span>Repeat new password</span><input name="confirm" type="password" autoComplete="new-password" required /></label>
        {passwordState && <p className={`portal-alert portal-alert--${passwordState.tone}`}>{passwordState.text}</p>}
        <button className="button button--dark" type="submit">Change password</button>
        <button type="button" className="portal-link portal-signout" onClick={() => void signOut()}>Sign out of this device</button>
      </form>
    </div>
  );
}
