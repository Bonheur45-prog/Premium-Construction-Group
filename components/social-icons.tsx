export type SocialLinks = { instagram: string; facebook: string; linkedin: string; x: string; youtube: string; tiktok: string };

const extraIcons: Record<"x" | "youtube" | "tiktok", { label: string; svg: React.ReactNode }> = {
  x: { label: "X", svg: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 4.5h3.6l10.4 15H15.4zM18.6 4.5 13.3 10.6M5.6 19.5l5.4-6.2" /></svg> },
  youtube: { label: "YouTube", svg: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="4" /><path className="social-icons__dot" d="m10.5 9.5 4.5 2.5-4.5 2.5z" /></svg> },
  tiktok: { label: "TikTok", svg: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M13.5 4v10.3a3.2 3.2 0 1 1-3.2-3.2M13.5 4c.4 2.3 2 3.9 4.5 4.1" /></svg> },
};

/**
 * Social media icons. Icons become links once the URLs are filled in under CMS → Site settings → Social.
 * Until then they show as before (no links), so the design stays intact.
 */
export function SocialIcons({ className = "", links }: { className?: string; links?: SocialLinks }) {
  const anyLink = links && Object.values(links).some(Boolean);
  if (anyLink) {
    const items: Array<{ key: keyof SocialLinks; label: string; svg: React.ReactNode }> = [
      { key: "instagram", label: "Instagram", svg: iconInstagram },
      { key: "facebook", label: "Facebook", svg: iconFacebook },
      { key: "linkedin", label: "LinkedIn", svg: iconLinkedIn },
      { key: "x", ...extraIcons.x },
      { key: "youtube", ...extraIcons.youtube },
      { key: "tiktok", ...extraIcons.tiktok },
    ];
    return (
      <div className={`social-icons ${className}`.trim()} role="group" aria-label="Social media">
        {items.filter((item) => links[item.key]).map((item) => (
          <a key={item.key} className="social-icons__item" href={links[item.key]} target="_blank" rel="noopener noreferrer" aria-label={item.label} title={item.label}>{item.svg}</a>
        ))}
      </div>
    );
  }
  return <PlaceholderIcons className={className} />;
}

const iconInstagram = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle className="social-icons__dot" cx="17.8" cy="6.5" r="1" />
  </svg>
);
const iconFacebook = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M14.2 20v-7.3h2.5l.4-2.9h-2.9V8c0-.8.2-1.4 1.5-1.4h1.5V4a20 20 0 0 0-2.2-.1c-2.3 0-3.9 1.4-3.9 4v1.9H8.5v2.9h2.6V20z" />
  </svg>
);
const iconLinkedIn = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M5.2 9.2H8V19H5.2zM6.6 5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM10.2 9.2h2.7v1.3c.5-.9 1.5-1.6 3-1.6 2.8 0 3.4 1.8 3.4 4.2V19h-2.8v-5.2c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V19h-2.7z" />
  </svg>
);

function PlaceholderIcons({ className = "" }: { className?: string }) {
  return (
    <div className={`social-icons ${className}`.trim()} role="group" aria-label="Social media">
      <span className="social-icons__item" role="img" aria-label="Instagram" title="Instagram">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle className="social-icons__dot" cx="17.8" cy="6.5" r="1" />
        </svg>
      </span>
      <span className="social-icons__item" role="img" aria-label="Facebook" title="Facebook">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <path d="M14.2 20v-7.3h2.5l.4-2.9h-2.9V8c0-.8.2-1.4 1.5-1.4h1.5V4a20 20 0 0 0-2.2-.1c-2.3 0-3.9 1.4-3.9 4v1.9H8.5v2.9h2.6V20z" />
        </svg>
      </span>
      <span className="social-icons__item" role="img" aria-label="LinkedIn" title="LinkedIn">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <path d="M5.2 9.2H8V19H5.2zM6.6 5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM10.2 9.2h2.7v1.3c.5-.9 1.5-1.6 3-1.6 2.8 0 3.4 1.8 3.4 4.2V19h-2.8v-5.2c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V19h-2.7z" />
        </svg>
      </span>
    </div>
  );
}
