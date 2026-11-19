"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FileDrop } from "@/components/portal/file-drop";
import { portalFetch } from "@/components/portal/portal-fetch";
import { BUDGET_RANGES, REQUEST_CATEGORIES, TIMELINES } from "@/lib/portal/constants";

const CATEGORY_HINTS: Record<string, string> = {
  new_build: "A new home, office, hotel or other building.",
  renovation: "Changes, extensions or upgrades to an existing building.",
  design: "Bringing architects, engineers and approvals together.",
  management: "Overseeing a project on your behalf.",
  quote: "A price for a defined piece of work.",
  site_visit: "An inspection or assessment of a site.",
  maintenance: "Fixing or maintaining something we built, or another building.",
  other: "Anything else — tell us below.",
};

export function NewRequestForm() {
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) return setError("Choose what kind of request this is.");
    const form = new FormData(event.currentTarget);
    form.set("category", category);
    form.delete("file");
    files.forEach((file) => form.append("file", file));
    setBusy(true);
    setError("");
    try {
      const result = await portalFetch<{ ref: string }>("/api/account/requests", { method: "POST", body: form });
      window.location.assign(`/account/requests/${result.ref}?new=1`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your request couldn't be sent.");
      setBusy(false);
    }
  }

  return (
    <form className="portal-new" onSubmit={submit}>
      <fieldset className="portal-step">
        <legend><span>01</span> What do you need?</legend>
        <div className="portal-choice-grid">
          {REQUEST_CATEGORIES.map((item) => (
            <label key={item.id} className={`portal-choice${category === item.id ? " is-selected" : ""}`}>
              <input type="radio" name="categoryChoice" value={item.id} checked={category === item.id} onChange={() => setCategory(item.id)} />
              <strong>{item.label}</strong>
              <small>{CATEGORY_HINTS[item.id]}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="portal-step">
        <legend><span>02</span> Tell us about it</legend>
        <label className="portal-field"><span>A short title</span><input name="title" required minLength={3} maxLength={160} placeholder="e.g. Three-bedroom family home in Rebero" /></label>
        <label className="portal-field"><span>Description</span><textarea name="description" required minLength={10} maxLength={8000} rows={6} placeholder="What would you like to build or change? Who is it for? Anything we should know about the site, design or approvals?" /></label>
        <div className="portal-form__row portal-form__row--3">
          <label className="portal-field"><span>Location</span><input name="location" maxLength={160} placeholder="District or neighbourhood" /></label>
          <label className="portal-field"><span>Budget</span><select name="budget" defaultValue=""><option value="">Prefer not to say</option>{BUDGET_RANGES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="portal-field"><span>Timing</span><select name="timeline" defaultValue=""><option value="">Not sure yet</option>{TIMELINES.map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
      </fieldset>

      <fieldset className="portal-step">
        <legend><span>03</span> Plans, photos or documents <em>(optional)</em></legend>
        <FileDrop files={files} onChange={setFiles} max={5} />
        <input type="hidden" name="fileCategory" value="drawings" />
      </fieldset>

      {error && <p className="portal-alert portal-alert--error" role="alert">{error}</p>}
      <div className="portal-new__actions">
        <Link className="portal-link" href="/account">Cancel</Link>
        <button className="button button--dark" type="submit" disabled={busy}>{busy ? "Sending your request…" : "Send request"} <span aria-hidden="true">→</span></button>
      </div>
    </form>
  );
}
