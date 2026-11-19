import "server-only";

/**
 * One place for every email the site sends (bookings, enquiries, client portal, insights).
 * Delivered through Brevo's transactional email API.
 *
 * Environment (in /var/www/premium-construction/.env on the VPS):
 *   BREVO_API_KEY       – Brevo → SMTP & API → API keys
 *   MAIL_FROM_EMAIL     – a sender verified in Brevo, e.g. hello@zamukapos.io
 *   MAIL_FROM_NAME      – optional, defaults to "Premium Construction Group"
 *   STAFF_NOTIFY_EMAIL  – the company inbox that receives new bookings, enquiries and client messages
 * The older RESERVATION_FROM_EMAIL / RESERVATION_ADMIN_EMAIL names are still read as fallbacks.
 */

export type OutgoingEmail = {
  to: string | undefined;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: string[];
};

export function senderEmail() {
  return process.env.MAIL_FROM_EMAIL || process.env.RESERVATION_FROM_EMAIL || "";
}

export function staffNotifyEmail() {
  return process.env.STAFF_NOTIFY_EMAIL || process.env.RESERVATION_ADMIN_EMAIL || "";
}

export function emailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && senderEmail());
}

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Sends one email. Returns true only when Brevo accepted it, so callers can report delivery honestly. */
export async function sendEmail(message: OutgoingEmail): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = senderEmail();
  if (!apiKey || !from || !message.to || !EMAIL_PATTERN.test(message.to)) return false;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: process.env.MAIL_FROM_NAME || "Premium Construction Group" },
        to: [{ email: message.to, ...(message.toName ? { name: message.toName.slice(0, 120) } : {}) }],
        subject: message.subject.slice(0, 250),
        htmlContent: message.html,
        textContent: message.text,
        ...(message.replyTo && EMAIL_PATTERN.test(message.replyTo) ? { replyTo: { email: message.replyTo } } : {}),
        ...(message.tags?.length ? { tags: message.tags.slice(0, 5) } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) console.error(`Brevo rejected an email (${response.status}): ${(await response.text()).slice(0, 300)}`);
    return response.ok;
  } catch (error) {
    console.error("Brevo email could not be sent.", error);
    return false;
  }
}
