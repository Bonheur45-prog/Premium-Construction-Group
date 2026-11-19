import "server-only";

import { sendEmail, staffNotifyEmail } from "@/lib/email/send";
import { renderEmail, renderText, type EmailBlock } from "@/lib/email/template";
import type { Enquiry } from "@/lib/enquiries/store";

function details(enquiry: Enquiry): EmailBlock {
  return {
    type: "details",
    rows: [
      ["Name", enquiry.name],
      ["Email", enquiry.email],
      ["Phone", enquiry.phone],
      ["Enquiring as", enquiry.enquiryType === "company" ? `Company · ${enquiry.company}` : "Personal"],
      ["Project", enquiry.projectTypeLabel],
    ],
  };
}

/** Tells the company about a new enquiry and sends the sender an acknowledgement. Returns what was actually delivered. */
export async function sendEnquiryNotifications(enquiry: Enquiry, origin: string) {
  const staffBlocks: EmailBlock[] = [
    { type: "paragraph", text: "A new enquiry arrived through the website. Reply to this email to answer them directly, or manage it in the CMS." },
    details(enquiry),
    { type: "quote", label: "Their message", text: enquiry.message },
    { type: "button", label: "Open the enquiries inbox", href: `${origin}/admin/enquiries` },
  ];
  const senderBlocks: EmailBlock[] = [
    { type: "paragraph", text: `Hello ${enquiry.name.split(" ")[0]},` },
    { type: "paragraph", text: "Thank you for getting in touch. We have received your enquiry and a member of our team will reply within two working days." },
    { type: "quote", label: "What you sent us", text: enquiry.message },
    { type: "note", text: "If you didn't send this enquiry, you can ignore this email." },
  ];
  const [staff, sender] = await Promise.all([
    sendEmail({
      to: staffNotifyEmail(),
      subject: `New enquiry · ${enquiry.name} · ${enquiry.projectTypeLabel}`,
      replyTo: enquiry.email,
      html: renderEmail({ heading: "New website enquiry.", preheader: enquiry.message.slice(0, 120), blocks: staffBlocks }),
      text: renderText("New website enquiry", staffBlocks),
      tags: ["enquiry"],
    }),
    sendEmail({
      to: enquiry.email,
      toName: enquiry.name,
      subject: "We've received your enquiry",
      replyTo: staffNotifyEmail() || undefined,
      html: renderEmail({ heading: "Thank you for reaching out.", preheader: "We'll be in touch within two working days.", blocks: senderBlocks }),
      text: renderText("Thank you for reaching out", senderBlocks),
      tags: ["enquiry-ack"],
    }),
  ]);
  return { staff, sender };
}

/** A reply written in the CMS and sent to the person who enquired. */
export async function sendEnquiryReply(enquiry: Enquiry, message: string, staffName: string) {
  const blocks: EmailBlock[] = [
    { type: "paragraph", text: `Hello ${enquiry.name.split(" ")[0]},` },
    { type: "paragraph", text: message },
    { type: "paragraph", text: `Kind regards,\n${staffName}\nPremium Construction Group` },
    { type: "quote", label: "Your original enquiry", text: enquiry.message.slice(0, 1200) },
  ];
  return sendEmail({
    to: enquiry.email,
    toName: enquiry.name,
    subject: `Re: your ${enquiry.projectTypeLabel.toLowerCase()} enquiry`,
    replyTo: staffNotifyEmail() || undefined,
    html: renderEmail({ heading: "A reply from our team.", preheader: message.slice(0, 120), blocks }),
    text: renderText("A reply from our team", blocks),
    tags: ["enquiry-reply"],
  });
}
