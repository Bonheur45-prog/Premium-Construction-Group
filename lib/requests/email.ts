import "server-only";

import { sendEmail, staffNotifyEmail } from "@/lib/email/send";
import { renderEmail, renderText, type EmailBlock } from "@/lib/email/template";
import { STATUS_CLIENT_TEXT, STATUS_LABEL, type RequestStatus } from "@/lib/portal/constants";
import { requestContacts } from "@/lib/requests/store";

/** Emails around client requests. Each returns whether Brevo accepted the message. */

async function toClient(requestId: string, subject: string, heading: string, blocks: (contact: { ref: string; title: string; name: string }) => EmailBlock[], origin: string) {
  const contact = await requestContacts(requestId);
  if (!contact || !contact.notify) return false;
  const body = [
    { type: "paragraph", text: `Hello ${contact.name.split(" ")[0]},` } as EmailBlock,
    ...blocks(contact),
    { type: "button", label: "Open your request", href: `${origin}/account/requests/${contact.ref}` } as EmailBlock,
    { type: "note", text: "You're receiving this because you have a client account with Premium Construction Group. You can turn these emails off in your account settings." } as EmailBlock,
  ];
  return sendEmail({ to: contact.email, toName: contact.name, subject: `${subject} · ${contact.ref}`, html: renderEmail({ eyebrow: `Client portal · ${contact.ref}`, heading, preheader: contact.title, blocks: body }), text: renderText(heading, body), tags: ["portal"] });
}

export function notifyClientStatus(requestId: string, to: RequestStatus, note: string, origin: string) {
  return toClient(requestId, `Update: ${STATUS_LABEL[to]}`, "Your request has moved forward.", (contact) => [
    { type: "paragraph", text: `There's an update on “${contact.title}”.` },
    { type: "status", label: "Current stage", value: STATUS_LABEL[to] },
    { type: "paragraph", text: STATUS_CLIENT_TEXT[to] },
    ...(note ? [{ type: "quote", label: "Note from our team", text: note } as EmailBlock] : []),
  ], origin);
}

export function notifyClientMessage(requestId: string, staffName: string, message: string, fileCount: number, origin: string) {
  return toClient(requestId, "New message from our team", "You have a new message.", (contact) => [
    { type: "paragraph", text: `${staffName} sent you a message about “${contact.title}”.` },
    ...(message ? [{ type: "quote", text: message.slice(0, 1500) } as EmailBlock] : []),
    ...(fileCount ? [{ type: "paragraph", text: `${fileCount} document${fileCount === 1 ? " was" : "s were"} shared with you.` } as EmailBlock] : []),
  ], origin);
}

export async function notifyStaff(requestId: string, kind: "new" | "message", detail: { clientName: string; message: string; fileCount: number }, origin: string) {
  const contact = await requestContacts(requestId);
  if (!contact) return false;
  const heading = kind === "new" ? "New client request." : "New message from a client.";
  const blocks: EmailBlock[] = [
    { type: "paragraph", text: kind === "new" ? `${detail.clientName} submitted a new request through the client portal.` : `${detail.clientName} wrote about ${contact.ref}.` },
    { type: "details", rows: [["Request", `${contact.ref} · ${contact.title}`], ["Client", `${contact.name} · ${contact.email}`]] },
    ...(detail.message ? [{ type: "quote", label: kind === "new" ? "Description" : "Message", text: detail.message.slice(0, 2000) } as EmailBlock] : []),
    ...(detail.fileCount ? [{ type: "paragraph", text: `${detail.fileCount} file${detail.fileCount === 1 ? "" : "s"} attached.` } as EmailBlock] : []),
    { type: "button", label: "Open in the CMS", href: `${origin}/admin/requests?open=${encodeURIComponent(contact.ref)}` },
  ];
  return sendEmail({ to: staffNotifyEmail(), subject: `${kind === "new" ? "New request" : "Client message"} · ${contact.ref} · ${contact.name}`, replyTo: contact.email, html: renderEmail({ eyebrow: "Client portal", heading, blocks }), text: renderText(heading, blocks), tags: ["portal-staff"] });
}

export function sendVerificationEmail(to: { email: string; name: string }, token: string, origin: string) {
  const blocks: EmailBlock[] = [
    { type: "paragraph", text: `Hello ${to.name.split(" ")[0]},` },
    { type: "paragraph", text: "Welcome to the Premium Construction Group client portal. Please confirm your email address to finish setting up your account. Once confirmed, any enquiries you've already sent us with this email will appear in your account." },
    { type: "button", label: "Confirm my email", href: `${origin}/account/verify?token=${encodeURIComponent(token)}` },
    { type: "note", text: "This link works for 3 days. If you didn't create an account, you can ignore this email." },
  ];
  return sendEmail({ to: to.email, toName: to.name, subject: "Confirm your email for the client portal", html: renderEmail({ eyebrow: "Client portal", heading: "Confirm your email.", blocks }), text: renderText("Confirm your email", blocks), tags: ["portal-verify"] });
}

export function sendPasswordResetEmail(to: { email: string; name: string }, token: string, origin: string) {
  const blocks: EmailBlock[] = [
    { type: "paragraph", text: `Hello ${to.name.split(" ")[0]},` },
    { type: "paragraph", text: "We received a request to reset the password for your client portal account." },
    { type: "button", label: "Choose a new password", href: `${origin}/account/reset?token=${encodeURIComponent(token)}` },
    { type: "note", text: "This link works for 1 hour and can be used once. If you didn't ask to reset your password, you can ignore this email — your password stays the same." },
  ];
  return sendEmail({ to: to.email, toName: to.name, subject: "Reset your client portal password", html: renderEmail({ eyebrow: "Client portal", heading: "Reset your password.", blocks }), text: renderText("Reset your password", blocks), tags: ["portal-reset"] });
}

/** After staff open a request from an enquiry: tells the person, and invites them to the portal if they have no account. */
export function notifyRequestOpened(to: { email: string; name: string; ref: string; title: string; hasAccount: boolean }, origin: string) {
  const blocks: EmailBlock[] = [
    { type: "paragraph", text: `Hello ${to.name.split(" ")[0]},` },
    { type: "paragraph", text: `Thank you for your enquiry. We've opened a request for it, so you can follow progress, message our team and share documents in one place.` },
    { type: "details", rows: [["Reference", to.ref], ["Request", to.title]] },
    to.hasAccount
      ? { type: "button", label: "Open your request", href: `${origin}/account/requests/${to.ref}` }
      : { type: "button", label: "Create your client account", href: `${origin}/account/signup?email=${encodeURIComponent(to.email)}` },
    ...(to.hasAccount ? [] : [{ type: "note", text: "Sign up with this email address and the request will appear in your account automatically." } as EmailBlock]),
  ];
  return sendEmail({ to: to.email, toName: to.name, subject: `Your request ${to.ref} is open`, replyTo: staffNotifyEmail() || undefined, html: renderEmail({ eyebrow: "Client portal", heading: "Your request is open.", blocks }), text: renderText("Your request is open", blocks), tags: ["portal-opened"] });
}
