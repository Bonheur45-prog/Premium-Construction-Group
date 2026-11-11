import "server-only";

import { formatReservationDateTime } from "@/lib/reservations/availability";
import type { Reservation } from "@/lib/reservations/types";

type Delivery = { customer: boolean; admin: boolean };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

async function deliverEmail({
  to,
  subject,
  text,
  html,
  replyTo,
  idempotencyKey,
}: {
  to: string | undefined;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  idempotencyKey: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESERVATION_FROM_EMAIL;
  if (!apiKey || !from || !to) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ from, to: [to], subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

function emailFrame(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f2f5f3;font-family:Arial,sans-serif;color:#183746"><div style="max-width:620px;margin:32px auto;background:#fffefa"><div style="height:8px;background:#efa94f"></div><div style="padding:38px 42px"><p style="margin:0 0 18px;color:#1b5b7c;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Premium Construction Group</p><h1 style="margin:0 0 20px;color:#102d3d;font:normal 36px/1.1 Georgia,serif">${title}</h1>${body}<p style="margin:30px 0 0;color:#6e7c80;font-size:12px;line-height:1.7">Thoughtful construction. Clear communication. Made to last.</p></div></div></body></html>`;
}

function appointmentDetails(reservation: Reservation) {
  return formatReservationDateTime(reservation.date, reservation.time);
}

function reservationSummary(reservation: Reservation) {
  const company = reservation.company ? `\nCompany: ${reservation.company}` : "";
  const phone = reservation.phone ? `\nPhone: ${reservation.phone}` : "";
  const message = reservation.message ? `\nProject notes: ${reservation.message}` : "";
  return `Name: ${reservation.name}\nEmail: ${reservation.email}${phone}${company}\nEnquiry type: ${reservation.enquiryType}\nProject: ${reservation.projectType}\nMeeting: ${appointmentDetails(reservation)}${message}`;
}

function summaryHtml(reservation: Reservation) {
  const items = [
    ["Client", reservation.name],
    ["Email", reservation.email],
    ...(reservation.phone ? [["Phone", reservation.phone]] : []),
    ...(reservation.company ? [["Company", reservation.company]] : []),
    ["Project", reservation.projectType],
    ["Meeting", appointmentDetails(reservation)],
    ...(reservation.message ? [["Project notes", reservation.message]] : []),
  ];

  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:22px">${items
    .map(
      ([label, value]) =>
        `<tr><td style="width:120px;padding:12px 8px 12px 0;border-top:1px solid #e3e9e6;color:#687b80;font-size:12px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:12px 0;border-top:1px solid #e3e9e6;color:#183746;font-size:14px;line-height:1.6;vertical-align:top">${escapeHtml(value)}</td></tr>`,
    )
    .join("")}</table>`;
}

export async function sendReservationConfirmation(reservation: Reservation, adminUrl: string): Promise<Delivery> {
  const dateTime = appointmentDetails(reservation);
  const customerBody = `<p style="color:#49616a;font-size:15px;line-height:1.8">Hello ${escapeHtml(reservation.name)},</p><p style="color:#49616a;font-size:15px;line-height:1.8">Your meeting with our team is confirmed. We look forward to hearing about your project.</p>${summaryHtml(reservation)}<p style="color:#49616a;font-size:14px;line-height:1.8">If you need to change your reservation, reply to this email and our team will help.</p>`;
  const customer = deliverEmail({
    to: reservation.email,
    subject: "Your project meeting is confirmed",
    text: `Hello ${reservation.name},\n\nYour meeting with Premium Construction Group is confirmed for ${dateTime}.\n\n${reservationSummary(reservation)}\n\nIf you need to change your reservation, reply to this email.`,
    html: emailFrame("Your meeting is confirmed.", customerBody),
    idempotencyKey: `reservation-${reservation.id}-confirmation-${reservation.date}-${reservation.time}`,
  });

  const admin = deliverEmail({
    to: process.env.RESERVATION_ADMIN_EMAIL,
    subject: `New project meeting · ${reservation.name} · ${dateTime}`,
    replyTo: reservation.email,
    text: `A new project meeting has been reserved.\n\n${reservationSummary(reservation)}\n\nManage reservations: ${adminUrl}`,
    html: emailFrame(
      "New project meeting reserved.",
      `<p style="color:#49616a;font-size:15px;line-height:1.8">A client has reserved a project meeting. Reply directly to this email to contact them.</p>${summaryHtml(reservation)}<p style="margin-top:25px"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:14px 19px;background:#102d3d;color:#fffefa;text-decoration:none;font-size:13px;font-weight:bold">Open reservation dashboard ↗</a></p>`,
    ),
    idempotencyKey: `reservation-${reservation.id}-admin-new-${reservation.date}-${reservation.time}`,
  });

  const [customerSent, adminSent] = await Promise.all([customer, admin]);
  return { customer: customerSent, admin: adminSent };
}

export async function sendReservationRescheduled(
  previous: Reservation,
  reservation: Reservation,
  adminUrl: string,
): Promise<Delivery> {
  const oldDateTime = appointmentDetails(previous);
  const newDateTime = appointmentDetails(reservation);
  const customerBody = `<p style="color:#49616a;font-size:15px;line-height:1.8">Hello ${escapeHtml(reservation.name)},</p><p style="color:#49616a;font-size:15px;line-height:1.8">Your project meeting has been moved to a new time. Your updated reservation is confirmed below.</p><div style="margin:20px 0;padding:17px;background:#f1f5f2;border-left:3px solid #efa94f;color:#49616a;font-size:14px;line-height:1.8"><strong style="color:#183746">Previous:</strong> ${escapeHtml(oldDateTime)}<br><strong style="color:#183746">New meeting:</strong> ${escapeHtml(newDateTime)}</div>${summaryHtml(reservation)}<p style="color:#49616a;font-size:14px;line-height:1.8">If the new time does not work for you, reply to this email and our team will help.</p>`;
  const customer = deliverEmail({
    to: reservation.email,
    subject: "Your project meeting has been rescheduled",
    text: `Hello ${reservation.name},\n\nYour project meeting has been moved.\nPrevious: ${oldDateTime}\nNew meeting: ${newDateTime}\n\n${reservationSummary(reservation)}\n\nIf the new time does not work for you, reply to this email.`,
    html: emailFrame("Your meeting has moved.", customerBody),
    idempotencyKey: `reservation-${reservation.id}-rescheduled-${previous.date}-${previous.time}-${reservation.date}-${reservation.time}`,
  });
  const admin = deliverEmail({
    to: process.env.RESERVATION_ADMIN_EMAIL,
    subject: `Meeting moved · ${reservation.name} · ${newDateTime}`,
    replyTo: reservation.email,
    text: `A project meeting was rescheduled.\nPrevious: ${oldDateTime}\nNew meeting: ${newDateTime}\n\n${reservationSummary(reservation)}\n\nManage reservations: ${adminUrl}`,
    html: emailFrame(
      "A project meeting was rescheduled.",
      `<p style="color:#49616a;font-size:15px;line-height:1.8">The reservation schedule changed.</p><div style="margin:20px 0;padding:17px;background:#f1f5f2;border-left:3px solid #efa94f;color:#49616a;font-size:14px;line-height:1.8"><strong style="color:#183746">Previous:</strong> ${escapeHtml(oldDateTime)}<br><strong style="color:#183746">New meeting:</strong> ${escapeHtml(newDateTime)}</div>${summaryHtml(reservation)}<p style="margin-top:25px"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:14px 19px;background:#102d3d;color:#fffefa;text-decoration:none;font-size:13px;font-weight:bold">Open reservation dashboard ↗</a></p>`,
    ),
    idempotencyKey: `reservation-${reservation.id}-admin-rescheduled-${previous.date}-${previous.time}-${reservation.date}-${reservation.time}`,
  });

  const [customerSent, adminSent] = await Promise.all([customer, admin]);
  return { customer: customerSent, admin: adminSent };
}

export async function sendReservationCancelled(reservation: Reservation, adminUrl: string): Promise<Delivery> {
  const dateTime = appointmentDetails(reservation);
  const customer = deliverEmail({
    to: reservation.email,
    subject: "Your project meeting has been cancelled",
    text: `Hello ${reservation.name},\n\nYour project meeting reserved for ${dateTime} has been cancelled. Please reply to this email if you would like help arranging another time.`,
    html: emailFrame(
      "Your meeting has been cancelled.",
      `<p style="color:#49616a;font-size:15px;line-height:1.8">Hello ${escapeHtml(reservation.name)}, your project meeting reserved for <strong>${escapeHtml(dateTime)}</strong> has been cancelled. Reply to this email if you would like help arranging another time.</p>`,
    ),
    idempotencyKey: `reservation-${reservation.id}-cancelled-${reservation.date}-${reservation.time}`,
  });
  const admin = deliverEmail({
    to: process.env.RESERVATION_ADMIN_EMAIL,
    subject: `Meeting cancelled · ${reservation.name} · ${dateTime}`,
    replyTo: reservation.email,
    text: `A project meeting was cancelled.\n\n${reservationSummary(reservation)}\n\nManage reservations: ${adminUrl}`,
    html: emailFrame("A project meeting was cancelled.", `${summaryHtml(reservation)}<p style="margin-top:25px"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:14px 19px;background:#102d3d;color:#fffefa;text-decoration:none;font-size:13px;font-weight:bold">Open reservation dashboard ↗</a></p>`),
    idempotencyKey: `reservation-${reservation.id}-admin-cancelled-${reservation.date}-${reservation.time}`,
  });
  const [customerSent, adminSent] = await Promise.all([customer, admin]);
  return { customer: customerSent, admin: adminSent };
}
