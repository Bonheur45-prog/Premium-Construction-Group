import type { ReactNode } from "react";

/** One social profile, as entered in CMS → Site settings → Social media. */
export type SocialLink = { platform: string; url: string };

const svg = (body: ReactNode) => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">{body}</svg>;

const PLATFORMS: Record<string, { label: string; icon: ReactNode }> = {
  instagram: { label: "Instagram", icon: svg(<><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle className="social-icons__dot" cx="17.8" cy="6.5" r="1" /></>) },
  facebook: { label: "Facebook", icon: svg(<path d="M14.2 20v-7.3h2.5l.4-2.9h-2.9V8c0-.8.2-1.4 1.5-1.4h1.5V4a20 20 0 0 0-2.2-.1c-2.3 0-3.9 1.4-3.9 4v1.9H8.5v2.9h2.6V20z" />) },
  linkedin: { label: "LinkedIn", icon: svg(<path d="M5.2 9.2H8V19H5.2zM6.6 5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM10.2 9.2h2.7v1.3c.5-.9 1.5-1.6 3-1.6 2.8 0 3.4 1.8 3.4 4.2V19h-2.8v-5.2c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V19h-2.7z" />) },
  x: { label: "X", icon: svg(<path d="M5 4.5h3.6l10.4 15H15.4zM18.6 4.5 13.3 10.6M5.6 19.5l5.4-6.2" />) },
  youtube: { label: "YouTube", icon: svg(<><rect x="3" y="6" width="18" height="12" rx="4" /><path className="social-icons__dot" d="m10.5 9.5 4.5 2.5-4.5 2.5z" /></>) },
  tiktok: { label: "TikTok", icon: svg(<path d="M13.5 4v10.3a3.2 3.2 0 1 1-3.2-3.2M13.5 4c.4 2.3 2 3.9 4.5 4.1" />) },
  whatsapp: { label: "WhatsApp", icon: svg(<><path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6z" /><path d="M9.3 8.8c.2 2.6 2.4 5.2 5.4 5.9l1-1.2-1.6-.9-.7.6c-1-.4-1.9-1.3-2.3-2.3l.6-.7-.9-1.6z" /></>) },
  pinterest: { label: "Pinterest", icon: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M11 9.5c2.5-1.5 5 0 4.2 2.6-.6 2-2.9 2.4-3.6.9M11.6 11l-2.2 9" /></>) },
  threads: { label: "Threads", icon: svg(<path d="M16.6 10.4c-.6-2.4-2.4-3.6-4.6-3.6-3 0-5 2.2-5 5.3 0 3.3 2 5.4 5 5.4 2.6 0 4.6-1.5 4.6-3.6 0-2.5-2.8-3.2-5-2.6-1.5.4-2 1.4-1.8 2.2.3 1.2 2.1 1.5 3.2.8 1-.7 1.3-2.2 1.2-4.4" />) },
};

/**
 * Social media icons. Each row filled in under CMS → Site settings → Social media becomes a linked icon,
 * in the order entered. With nothing filled in, three neutral (unlinked) icons keep the design intact.
 */
export function SocialIcons({ className = "", links = [] }: { className?: string; links?: SocialLink[] }) {
  const items = links.filter((link) => PLATFORMS[link.platform] && /^https:\/\//i.test(link.url));
  if (!items.length) {
    return (
      <div className={`social-icons ${className}`.trim()} role="group" aria-label="Social media">
        {["instagram", "facebook", "linkedin"].map((key) => (
          <span key={key} className="social-icons__item" role="img" aria-label={PLATFORMS[key].label} title={PLATFORMS[key].label}>{PLATFORMS[key].icon}</span>
        ))}
      </div>
    );
  }
  return (
    <div className={`social-icons ${className}`.trim()} role="group" aria-label="Social media">
      {items.map((link, index) => (
        <a key={`${link.platform}-${index}`} className="social-icons__item" href={link.url} target="_blank" rel="noopener noreferrer" aria-label={PLATFORMS[link.platform].label} title={PLATFORMS[link.platform].label}>{PLATFORMS[link.platform].icon}</a>
      ))}
    </div>
  );
}
