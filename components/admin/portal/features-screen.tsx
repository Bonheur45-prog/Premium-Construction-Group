"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarCheck, ChatsCircle, CheckCircle, DeviceMobile, FolderSimple, Plus, Receipt, Trash, UserCircle, WarningCircle, WhatsappLogo, Stack,
} from "@/components/icons";
import { EstimateIcon, MilestoneIcon } from "@/components/icons/custom";
import { normalizeFeatures, type Features } from "@/lib/features-shared";

/**
 * CMS → Administration → Features. One switch per feature, its settings underneath.
 * Switching something off hides it everywhere at once; nothing is deleted.
 */
type Payload = { features: Features; booking: { enabled: boolean }; services: { r2: boolean; push: boolean; email: boolean }; whatsappFallback: string };

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`fswitch${checked ? " is-on" : ""}`} onClick={() => onChange(!checked)}><i /></button>
  );
}

function Feature({ icon, title, description, on, onToggle, children, status, alwaysOn }: { icon: ReactNode; title: string; description: string; on: boolean; onToggle: (value: boolean) => void; children?: ReactNode; status?: ReactNode; alwaysOn?: boolean }) {
  return (
    <section className={`fcard${on ? " is-on" : ""}`}>
      <header>
        <span className="fcard__icon">{icon}</span>
        <div><strong>{title}</strong><p>{description}</p>{status}</div>
        {!alwaysOn && <Switch checked={on} onChange={onToggle} label={title} />}
      </header>
      {on && children && <div className="fcard__body">{children}</div>}
    </section>
  );
}

function Num({ label, value, onChange, min, max, step = 1, suffix, hint }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number; suffix?: string; hint?: string }) {
  return (
    <label className="cmsf"><span className="cmsf-label"><span>{label}</span></span>
      <span className="fnum"><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />{suffix && <em>{suffix}</em>}</span>
      {hint && <small className="cmsf-hint">{hint}</small>}
    </label>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="cms-switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

export function FeaturesScreen() {
  const [data, setData] = useState<Payload | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  useEffect(() => {
    fetch("/api/admin/portal/features", { cache: "no-store" }).then((response) => response.json()).then((payload: Payload & { error?: string }) => {
      if (payload.error) { setNotice({ tone: "error", text: payload.error }); return; }
      setData(payload);
      setSaved(JSON.stringify({ f: payload.features, b: payload.booking }));
    }).catch(() => setNotice({ tone: "error", text: "Settings couldn't load." }));
  }, []);
  if (!data) return notice ? <p className={`cms-alert cms-alert--${notice.tone}`}>{notice.text}</p> : <div className="cms-skeleton" style={{ height: 420 }} />;

  const f = data.features;
  const dirty = JSON.stringify({ f, b: data.booking }) !== saved;
  const set = <K extends keyof Features>(key: K, patch: Partial<Features[K]>) => setData({ ...data, features: { ...f, [key]: { ...f[key], ...patch } } });
  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/portal/features", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ features: data!.features, booking: data!.booking }) });
      const result = (await response.json()) as { features?: Features; booking?: { enabled: boolean }; error?: string };
      if (!response.ok || !result.features) throw new Error(result.error || "Couldn't save.");
      setData({ ...data!, features: normalizeFeatures(result.features), booking: result.booking || data!.booking });
      setSaved(JSON.stringify({ f: normalizeFeatures(result.features), b: result.booking || data!.booking }));
      setNotice({ tone: "ok", text: "Saved — the website and the client space use these settings now." });
    } catch (reason) { setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Couldn't save." }); }
    finally { setBusy(false); }
  }
  const service = (ok: boolean, okText: string, missing: string) => (
    <span className={`fservice${ok ? " is-ok" : ""}`}>{ok ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />} {ok ? okText : missing}</span>
  );

  return (
    <div className="features">
      <div className="cmsl-intro"><p>Turn parts of the website and the client space on or off. Switching something off hides it everywhere straight away — messages, files and quotes are kept and come back when you switch it on again.</p></div>
      {notice && <p className={`cms-alert cms-alert--${notice.tone}`} role="status">{notice.text}</p>}

      <h2 className="fgroup">Client space</h2>
      <Feature icon={<UserCircle size={24} weight="duotone" />} title="New client accounts" description="Anyone can create an account from the website. Off: existing clients can still sign in; nobody new can join." on={f.signup.enabled} onToggle={(enabled) => set("signup", { enabled })} />
      <Feature icon={<ChatsCircle size={24} weight="duotone" />} title="Messages (chat room)" description="Private conversations between each client and the whole team." on={f.chat.enabled} onToggle={(enabled) => set("chat", { enabled })}>
        <Check label="Voice notes" checked={f.chat.voiceNotes} onChange={(voiceNotes) => set("chat", { voiceNotes })} />
        <Check label="Video calls (private Jitsi rooms, no account needed)" checked={f.chat.videoCalls} onChange={(videoCalls) => set("chat", { videoCalls })} />
        <Num label="People can edit or delete their message for" value={f.chat.editMinutes} min={0} max={1440} suffix="minutes" onChange={(editMinutes) => set("chat", { editMinutes })} />
      </Feature>
      <Feature icon={<FolderSimple size={24} weight="duotone" />} title="File space" description="Each client's private storage: folders, previews, versions. Files from the team never count against their space."
        status={service(data.services.r2, "Files go straight to Cloudflare R2 — the website is never slowed down.", "R2 isn't set up: files are stored on the server for now.")}
        on={f.files.enabled} onToggle={(enabled) => set("files", { enabled })}>
        <Num label="Storage per client" value={f.files.quotaMb} min={10} max={10000} suffix="MB" onChange={(quotaMb) => set("files", { quotaMb })} />
        <Num label="Largest single file" value={f.files.maxFileMb} min={1} max={10000} suffix="MB" onChange={(maxFileMb) => set("files", { maxFileMb })} hint="Photos are compressed before upload, so a 12 MB phone photo usually arrives under 2 MB." />
        <Check label="Compress photos before upload" checked={f.files.compressImages} onChange={(compressImages) => set("files", { compressImages })} />
      </Feature>
      <Feature icon={<Receipt size={24} weight="duotone" />} title="Quotes & change orders" description="Send priced quotes into a client's conversation; they accept with a typed signature or ask for changes." on={f.quotes.enabled} onToggle={(enabled) => set("quotes", { enabled })}>
        <label className="cmsf"><span className="cmsf-label"><span>Currency</span></span><input value={f.quotes.currency} maxLength={6} onChange={(event) => set("quotes", { currency: event.target.value.toUpperCase() })} /></label>
        <Num label="VAT" value={f.quotes.vatRate} min={0} max={50} step={0.5} suffix="%" onChange={(vatRate) => set("quotes", { vatRate })} />
        <Num label="Quotes are valid for" value={f.quotes.validityDays} min={1} max={365} suffix="days" onChange={(validityDays) => set("quotes", { validityDays })} />
      </Feature>
      <Feature icon={<MilestoneIcon size={24} weight="duotone" />} title="Project progress" description="Milestones, site photos and a progress ring for each client build." on={f.progress.enabled} onToggle={(enabled) => set("progress", { enabled })}>
        <Check label="Clients can comment on milestones" checked={f.progress.clientComments} onChange={(clientComments) => set("progress", { clientComments })} />
      </Feature>
      <Feature icon={<CalendarCheck size={24} weight="duotone" />} title="Meetings in the client space" description="Clients see their meetings and book new ones with their details filled in." on={f.portalMeetings.enabled} onToggle={(enabled) => set("portalMeetings", { enabled })} />
      <Feature icon={<DeviceMobile size={24} weight="duotone" />} title="Phone alerts & app install" description="Clients (and the team) get alerts on their phone when a message arrives, and can add the client space to their Home Screen."
        status={service(data.services.push, "Alert keys are set up.", "Alert keys aren't set up yet — add them to the server's .env (see the setup notes).")}
        on={f.push.enabled} onToggle={(enabled) => set("push", { enabled })}>
        <label className="cmsf"><span className="cmsf-label"><span>App name on the Home Screen</span></span><input value={f.push.appName} maxLength={40} onChange={(event) => set("push", { appName: event.target.value })} /></label>
      </Feature>

      <h2 className="fgroup">Website</h2>
      <Feature icon={<CalendarCheck size={24} weight="duotone" />} title="Online booking" description="Visitors can book a meeting time on the Reserve a meeting and Contact pages."
        status={service(data.services.email, "Confirmation emails are sent.", "Emails aren't set up — bookings are still saved and shown under Meetings.")}
        on={data.booking.enabled} onToggle={(enabled) => setData({ ...data, booking: { enabled } })} />
      <Feature icon={<EstimateIcon size={24} weight="duotone" />} title="Budget estimator" description="Visitors pick a project type, size and finish to see an indicative price range. Keep it off until the rates below are your real prices." on={f.estimator.enabled} onToggle={(enabled) => set("estimator", { enabled })}>
        <div className="festimator">
          <p className="cmsf-label"><span>Price per m² (standard finish)</span></p>
          {f.estimator.types.map((type, index) => (
            <div className="festimator__row" key={index}>
              <input value={type.label} aria-label="Project type" onChange={(event) => set("estimator", { types: f.estimator.types.map((item, current) => (current === index ? { ...item, label: event.target.value } : item)) })} />
              <span className="fnum"><input type="number" min={0} step={1000} value={type.ratePerM2} aria-label="Rate per m²" onChange={(event) => set("estimator", { types: f.estimator.types.map((item, current) => (current === index ? { ...item, ratePerM2: Number(event.target.value) } : item)) })} /><em>RWF / m²</em></span>
              <button type="button" className="cms-icon-btn cms-icon-btn--danger" aria-label="Remove" onClick={() => set("estimator", { types: f.estimator.types.filter((_item, current) => current !== index) })}><Trash size={14} /></button>
            </div>
          ))}
          <button type="button" className="cmsf-add" onClick={() => set("estimator", { types: [...f.estimator.types, { id: "", label: "New type", ratePerM2: 0 }] })}><Plus size={14} /> Add a project type</button>
          <p className="cmsf-label"><span>Finish levels</span></p>
          {f.estimator.finishes.map((finish, index) => (
            <div className="festimator__row" key={index}>
              <input value={finish.label} aria-label="Finish" onChange={(event) => set("estimator", { finishes: f.estimator.finishes.map((item, current) => (current === index ? { ...item, label: event.target.value } : item)) })} />
              <span className="fnum"><input type="number" min={0.1} max={10} step={0.05} value={finish.multiplier} aria-label="Multiplier" onChange={(event) => set("estimator", { finishes: f.estimator.finishes.map((item, current) => (current === index ? { ...item, multiplier: Number(event.target.value) } : item)) })} /><em>× standard</em></span>
              <input value={finish.description} aria-label="Description" className="festimator__wide" onChange={(event) => set("estimator", { finishes: f.estimator.finishes.map((item, current) => (current === index ? { ...item, description: event.target.value } : item)) })} />
            </div>
          ))}
          <Num label="Range shown around the estimate" value={f.estimator.spread} min={0} max={50} suffix="± %" onChange={(spread) => set("estimator", { spread })} />
          <label className="cmsf cmsf--wide"><span className="cmsf-label"><span>Small print under the result</span></span><textarea rows={2} value={f.estimator.disclaimer} onChange={(event) => set("estimator", { disclaimer: event.target.value })} /></label>
        </div>
      </Feature>
      <Feature icon={<WhatsappLogo size={24} weight="duotone" />} title="WhatsApp button (public website only)" description="A floating WhatsApp button for visitors who aren't clients yet. It never appears inside the client space." on={f.whatsapp.enabled} onToggle={(enabled) => set("whatsapp", { enabled })}>
        <label className="cmsf"><span className="cmsf-label"><span>WhatsApp number</span></span><input value={f.whatsapp.number} placeholder={data.whatsappFallback || "2507XXXXXXXX"} onChange={(event) => set("whatsapp", { number: event.target.value })} /><small className="cmsf-hint">International format, numbers only. Empty = the number in Site settings{data.whatsappFallback ? ` (${data.whatsappFallback})` : ""}.</small></label>
        <label className="cmsf"><span className="cmsf-label"><span>Message filled in for them</span></span><input value={f.whatsapp.message} maxLength={200} onChange={(event) => set("whatsapp", { message: event.target.value })} /></label>
      </Feature>
      <Feature icon={<Stack size={24} weight="duotone" />} title="Website sections" description="Show or hide whole sections. Hidden sections keep their content in the CMS." on alwaysOn onToggle={() => undefined}>
        {(Object.keys(f.sections) as Array<keyof Features["sections"]>).map((key) => (
          <Check key={key} label={{ blog: "Blog (articles)", testimonials: "Testimonials", partners: "Partners & clients logos", team: "Team", careers: "Careers" }[key]} checked={f.sections[key]} onChange={(value) => set("sections", { [key]: value } as Partial<Features["sections"]>)} />
        ))}
      </Feature>

      <div className={`cmss-bar${dirty ? " is-dirty" : ""}`}>
        <span>{dirty ? "You have unsaved changes." : "Everything is saved."}</span>
        <button type="button" className="cms-btn cms-btn--primary cms-btn--small" disabled={!dirty || busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
