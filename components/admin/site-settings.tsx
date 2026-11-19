"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cmsFetch } from "@/components/admin/format";
import { ImageInput } from "@/components/admin/cms/fields";
import { SOCIAL_PLATFORMS } from "@/lib/cms/collections";
import type { SiteContent } from "@/lib/site-content/content";

type Settings = SiteContent["siteSettings"];
export type SettingsScreen = "header" | "footer" | "settings";
type Link_ = { id: string; label: string; href: string; enabled?: boolean };

function Text({ label, hint, value, onChange, multiline, placeholder, type = "text", max = 300 }: { label: string; hint?: string; value: string; onChange: (value: string) => void; multiline?: boolean; placeholder?: string; type?: string; max?: number }) {
  return (
    <label className="cmsf">
      <span className="cmsf-label"><span>{label}</span></span>
      {multiline
        ? <textarea rows={3} value={value} maxLength={max} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        : <input type={type} value={value} maxLength={max} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
      {hint && <small className="cmsf-hint">{hint}</small>}
    </label>
  );
}

function Box({ number, title, intro, children }: { number: number; title: string; intro?: string; children: ReactNode }) {
  return (
    <fieldset className="cmse-box">
      <legend><span>{String(number).padStart(2, "0")}</span>{title}</legend>
      {intro && <p className="cmse-box__intro">{intro}</p>}
      <div className="cmse-fields">{children}</div>
    </fieldset>
  );
}

/** A list of menu links: label + where it goes, reorderable, optionally switchable on/off. */
function LinkRows({ links, onChange, toggle, itemLabel = "link", max = 10 }: { links: Link_[]; onChange: (links: Link_[]) => void; toggle?: boolean; itemLabel?: string; max?: number }) {
  const update = (index: number, patch: Partial<Link_>) => onChange(links.map((link, current) => (current === index ? { ...link, ...patch } : link)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...links];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="cmsf cmsf--wide">
      <ol className="cmsf-pairs">
        {links.map((link, index) => (
          <li key={`${link.id}-${index}`}>
            <span className="cmsf-pairs__number">{String(index + 1).padStart(2, "0")}</span>
            <div className="cmsf-pairs__fields cmsf-pairs__fields--row">
              <input aria-label="Text shown" placeholder="Text shown, e.g. About" value={link.label} maxLength={40} onChange={(event) => update(index, { label: event.target.value })} />
              <input aria-label="Goes to" placeholder="Goes to, e.g. /about" value={link.href} maxLength={300} onChange={(event) => update(index, { href: event.target.value })} />
              {toggle && <label className="cms-switch"><input type="checkbox" checked={link.enabled !== false} onChange={(event) => update(index, { enabled: event.target.checked })} /><span>Show</span></label>}
            </div>
            <span className="cmsf-inline">
              <button type="button" className="cms-icon-btn" aria-label="Move up" disabled={!index} onClick={() => move(index, -1)}>↑</button>
              <button type="button" className="cms-icon-btn" aria-label="Move down" disabled={index === links.length - 1} onClick={() => move(index, 1)}>↓</button>
              <button type="button" className="cms-icon-btn cms-icon-btn--danger" aria-label={`Remove ${itemLabel}`} onClick={() => onChange(links.filter((_link, current) => current !== index))}>×</button>
            </span>
          </li>
        ))}
      </ol>
      {links.length < max && <button type="button" className="cmsf-add" onClick={() => onChange([...links, { id: `link-${Date.now().toString(36)}`, label: "", href: "/", ...(toggle ? { enabled: true } : {}) }])}>+ Add {itemLabel}</button>}
      <small className="cmsf-hint">“Goes to” is a page on this site (starting with /, e.g. /services) or a full web address (https://…).</small>
    </div>
  );
}

const SEO_PAGES: Array<[keyof Settings["seo"]["pages"], string]> = [
  ["home", "Home page"], ["about", "About"], ["approach", "Our approach"], ["services", "Services"], ["projects", "Projects"], ["insights", "Blog"], ["careers", "Careers"], ["contact", "Contact"], ["reservations", "Reserve a meeting"],
];

/** Header, Footer and Site settings: the parts of the website shared by every page. */
export function SiteSettingsEditor({ screen }: { screen: SettingsScreen }) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await cmsFetch<{ content: SiteContent }>("/api/admin/pages");
      setContent(result.content);
      setSaved(JSON.stringify(result.content.siteSettings));
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Settings could not be loaded." });
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const dirty = Boolean(content) && JSON.stringify(content!.siteSettings) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (!content) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await cmsFetch<{ content: SiteContent }>("/api/admin/pages", { method: "PUT", body: JSON.stringify({ content }) });
      setContent(result.content);
      setSaved(JSON.stringify(result.content.siteSettings));
      const dropped = content.siteSettings.socialLinks.filter((link) => link.url.trim()).length - result.content.siteSettings.socialLinks.length;
      setNotice({ tone: "ok", text: `Saved — the website shows it now.${dropped > 0 ? ` ${dropped} social link${dropped === 1 ? " was" : "s were"} skipped: each needs a full address starting with https://.` : ""}` });
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  if (!content) return notice ? <p className={`cms-alert cms-alert--${notice.tone}`}>{notice.text}</p> : <div className="cms-skeleton" style={{ height: 400 }} />;

  const s = content.siteSettings;
  const patch = <K extends keyof Settings>(key: K, value: Partial<Settings[K]>) =>
    setContent((current) => current && { ...current, siteSettings: { ...current.siteSettings, [key]: { ...(current.siteSettings[key] as object), ...value } } });
  const setSocial = (socialLinks: Settings["socialLinks"]) => setContent((current) => current && { ...current, siteSettings: { ...current.siteSettings, socialLinks } });

  return (
    <div className="cmse cmss">
      {notice && <p className={`cms-alert cms-alert--${notice.tone}`} role="status">{notice.text}</p>}

      {screen === "header" && (
        <>
          <Box number={1} title="Logo and name" intro="Shown at the top-left of every page, and in the footer.">
            <ImageInput label="Logo" value={s.brand.logo} showAlt={false} onChange={(url) => patch("brand", { logo: url || s.brand.logo })} hint="A PNG or SVG with a transparent background works best." />
            <Text label="Name — first line (bold)" value={s.brand.primaryName} onChange={(value) => patch("brand", { primaryName: value })} max={40} />
            <Text label="Name — second line" value={s.brand.secondaryName} onChange={(value) => patch("brand", { secondaryName: value })} max={60} />
            <Text label="Full company name" hint="Used in the copyright line and for search engines." value={s.brand.legalName} onChange={(value) => patch("brand", { legalName: value })} max={120} />
          </Box>
          <Box number={2} title="Menu" intro="The links across the top of the website, in this order. Switch one off to hide it without deleting it.">
            <LinkRows links={s.header.links} toggle itemLabel="menu link" onChange={(links) => patch("header", { links: links as Settings["header"]["links"] })} />
          </Box>
          <Box number={3} title="Main button" intro="The highlighted button at the right of the menu.">
            <Text label="Button text" value={s.header.ctaLabel} onChange={(value) => patch("header", { ctaLabel: value })} max={40} />
            <Text label="Goes to" value={s.header.ctaHref} onChange={(value) => patch("header", { ctaHref: value })} placeholder="/reservations" />
          </Box>
        </>
      )}

      {screen === "footer" && (
        <>
          <Box number={1} title="Invitation band" intro="The large dark band just above the footer.">
            <Text label="Small heading" value={s.footer.invitationEyebrow} onChange={(value) => patch("footer", { invitationEyebrow: value })} max={60} />
            <Text label="Headline" value={s.footer.invitationLead} onChange={(value) => patch("footer", { invitationLead: value })} max={80} />
            <Text label="Headline — highlighted part" value={s.footer.invitationAccent} onChange={(value) => patch("footer", { invitationAccent: value })} max={80} />
            <Text label="Text" multiline value={s.footer.invitationBody} onChange={(value) => patch("footer", { invitationBody: value })} />
            <Text label="Button text" value={s.footer.invitationAction} onChange={(value) => patch("footer", { invitationAction: value })} max={40} />
            <Text label="Button goes to" value={s.footer.invitationHref} onChange={(value) => patch("footer", { invitationHref: value })} />
          </Box>
          <Box number={2} title="About the company" intro="Under the logo in the footer. Social media icons appear below it — set them in Site settings.">
            <Text label="Short description" multiline value={s.brand.footerDescription} onChange={(value) => patch("brand", { footerDescription: value })} hint="Each new line starts a new line on the website." />
          </Box>
          <Box number={3} title="First column of links">
            <Text label="Column title" value={s.footer.exploreTitle} onChange={(value) => patch("footer", { exploreTitle: value })} max={40} />
            <LinkRows links={s.footer.exploreLinks} onChange={(links) => patch("footer", { exploreLinks: links })} max={12} />
          </Box>
          <Box number={4} title="Second column of links">
            <Text label="Column title" value={s.footer.capabilitiesTitle} onChange={(value) => patch("footer", { capabilitiesTitle: value })} max={40} />
            <LinkRows links={s.footer.capabilityLinks} onChange={(links) => patch("footer", { capabilityLinks: links })} max={12} />
          </Box>
          <Box number={5} title="Contact column">
            <Text label="Title" value={s.footer.contactTitle} onChange={(value) => patch("footer", { contactTitle: value })} max={60} />
            <Text label="Text" multiline value={s.footer.contactBody} onChange={(value) => patch("footer", { contactBody: value })} />
            <Text label="Link text" value={s.footer.contactAction} onChange={(value) => patch("footer", { contactAction: value })} max={40} />
            <Text label="Link goes to" value={s.footer.contactHref} onChange={(value) => patch("footer", { contactHref: value })} />
          </Box>
          <Box number={6} title="Bottom line">
            <Text label="Tagline" value={s.footer.bottomTagline} onChange={(value) => patch("footer", { bottomTagline: value })} max={100} />
            <Text label="“Back to top” text" value={s.footer.backToTopLabel} onChange={(value) => patch("footer", { backToTopLabel: value })} max={30} />
          </Box>
        </>
      )}

      {screen === "settings" && (
        <>
          <Box number={1} title="Contact details" intro="Shown on the contact page and in the footer. Leave a box empty to hide it.">
            <Text label="Email address" type="email" value={s.contact.email} onChange={(value) => patch("contact", { email: value })} placeholder="hello@yourcompany.rw" />
            <Text label="Phone number" type="tel" value={s.contact.phone} onChange={(value) => patch("contact", { phone: value })} placeholder="+250 7XX XXX XXX" />
            <Text label="WhatsApp number" hint="International format, numbers only — e.g. 2507XXXXXXXX." value={s.contact.whatsapp} onChange={(value) => patch("contact", { whatsapp: value })} max={15} />
            <Text label="Office address" multiline value={s.contact.address} onChange={(value) => patch("contact", { address: value })} />
            <Text label="Opening hours" value={s.contact.openingHours} onChange={(value) => patch("contact", { openingHours: value })} />
            <Text label="Google Maps link" type="url" value={s.contact.mapUrl} onChange={(value) => patch("contact", { mapUrl: value })} placeholder="https://maps.app.goo.gl/…" />
          </Box>

          <Box number={2} title="Social media" intro="Add a row for each profile. Icons appear in the menu and footer in this order.">
            <div className="cmsf cmsf--wide">
              <ol className="cmsf-pairs">
                {s.socialLinks.map((link, index) => (
                  <li key={index}>
                    <span className="cmsf-pairs__number">{String(index + 1).padStart(2, "0")}</span>
                    <div className="cmsf-pairs__fields cmsf-pairs__fields--row">
                      <select aria-label="Platform" value={link.platform} onChange={(event) => setSocial(s.socialLinks.map((item, current) => (current === index ? { ...item, platform: event.target.value } : item)))}>
                        {SOCIAL_PLATFORMS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <input aria-label="Profile address" type="url" placeholder="https://…" value={link.url} onChange={(event) => setSocial(s.socialLinks.map((item, current) => (current === index ? { ...item, url: event.target.value } : item)))} />
                    </div>
                    <span className="cmsf-inline">
                      <button type="button" className="cms-icon-btn" aria-label="Move up" disabled={!index} onClick={() => { const next = [...s.socialLinks]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setSocial(next); }}>↑</button>
                      <button type="button" className="cms-icon-btn cms-icon-btn--danger" aria-label="Remove" onClick={() => setSocial(s.socialLinks.filter((_item, current) => current !== index))}>×</button>
                    </span>
                  </li>
                ))}
              </ol>
              {s.socialLinks.length < 12 && (
                <button type="button" className="cmsf-add" onClick={() => setSocial([...s.socialLinks, { platform: SOCIAL_PLATFORMS.find((option) => !s.socialLinks.some((link) => link.platform === option.value))?.value || "instagram", url: "" }])}>+ Add a social profile</button>
              )}
              <small className="cmsf-hint">Copy the address from your profile page in the browser — it starts with https://. For WhatsApp use https://wa.me/2507XXXXXXXX.</small>
            </div>
          </Box>

          <Box number={3} title="Search engines and sharing" intro="How the website appears on Google and when a link is shared on WhatsApp, Facebook or LinkedIn.">
            <Text label="Website address" type="url" hint="The public address, e.g. https://pcg.rw. Used for links in emails, the sitemap and sharing." value={s.seo.siteUrl} onChange={(value) => patch("seo", { siteUrl: value })} />
            <Text label="Title pattern" hint="%s is replaced by each page's title." value={s.seo.titleTemplate} onChange={(value) => patch("seo", { titleTemplate: value })} max={90} />
            <ImageInput label="Default sharing image" showAlt={false} value={s.seo.defaultImage} onChange={(url) => patch("seo", { defaultImage: url })} hint="Shown when a page without its own image is shared. Best size: 1200 × 630." />
            <Text label="X (Twitter) username" value={s.seo.twitterHandle} onChange={(value) => patch("seo", { twitterHandle: value })} placeholder="@yourcompany" max={16} />
          </Box>

          <Box number={4} title="Page titles on Google" intro="The title and short description Google shows for each main page.">
            {SEO_PAGES.map(([key, label]) => (
              <details key={key} className="cmss-page">
                <summary><strong>{label}</strong><span>{s.seo.pages[key].seoTitle || s.seo.pages[key].title}</span></summary>
                <Text label="Title" value={s.seo.pages[key].seoTitle || s.seo.pages[key].title} onChange={(value) => patch("seo", { pages: { ...s.seo.pages, [key]: { ...s.seo.pages[key], seoTitle: value } } })} max={70} />
                <Text label="Description" multiline value={s.seo.pages[key].description} onChange={(value) => patch("seo", { pages: { ...s.seo.pages, [key]: { ...s.seo.pages[key], description: value } } })} max={320} hint="About 150 characters reads best." />
              </details>
            ))}
          </Box>

          <Box number={5} title="Tracking and verification" intro="Optional. Ask whoever manages your Google account for these.">
            <Text label="Google Analytics ID" value={s.analytics.googleAnalyticsId} onChange={(value) => patch("analytics", { googleAnalyticsId: value })} placeholder="G-XXXXXXXXXX" max={24} />
            <Text label="Google Search Console code" value={s.seo.verification.google} onChange={(value) => patch("seo", { verification: { ...s.seo.verification, google: value } })} max={120} />
            <Text label="Bing verification code" value={s.seo.verification.bing} onChange={(value) => patch("seo", { verification: { ...s.seo.verification, bing: value } })} max={120} />
          </Box>
        </>
      )}

      <div className={`cmss-bar${dirty ? " is-dirty" : ""}`}>
        <span>{dirty ? "You have unsaved changes." : "Everything is saved."}</span>
        {dirty && <button type="button" className="cms-btn cms-btn--ghost cms-btn--small" onClick={() => setContent((current) => current && { ...current, siteSettings: JSON.parse(saved) })}>Undo changes</button>}
        <button type="button" className="cms-btn cms-btn--primary cms-btn--small" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
