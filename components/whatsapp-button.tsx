import { WhatsappLogoIcon as WhatsappLogo } from "@phosphor-icons/react/dist/ssr/WhatsappLogo";

/**
 * Floating WhatsApp button for visitors who aren't clients yet (CMS → Features → WhatsApp button).
 * Rendered by the public footer only — it never appears in the client space or the CMS.
 */
export function WhatsAppButton({ number, message }: { number: string; message: string }) {
  const digits = number.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  const href = `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return (
    <a className="wa-float" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
      <WhatsappLogo size={30} weight="fill" />
      <span className="wa-float__label">Chat with us</span>
    </a>
  );
}
