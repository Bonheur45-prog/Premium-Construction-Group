export function SocialIcons({ className = "" }: { className?: string }) {
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
