import { getTransporter, getFromAddress } from "../config/nodemailer.js";

// One place that actually delivers a message. Two transports, chosen by which
// environment variables are present:
//
//   RESEND_API_KEY  -> Resend's HTTPS API (preferred). Needs no mailbox
//                      password and works on hosts that block outbound SMTP.
//   SMTP_PASS       -> SMTP through nodemailer (fallback).
//   neither         -> sendMail resolves to null; the caller decides whether
//                      that is acceptable (development) or an error (production).
//
// Resend only delivers from a domain verified in its dashboard, so RESEND_FROM
// must be an address on one (it falls back to SMTP_FROM, then the default).

const RESEND_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 15_000;

export function mailTransport() {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (process.env.SMTP_PASS?.trim()) return "smtp";
  return null;
}

async function sendViaResend({ to, subject, html, replyTo }) {
  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM?.trim() || getFromAddress(),
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // Resend errors look like { statusCode, name, message }. Neither carries the key.
    throw new Error(`Resend ${response.status} ${body?.name ?? ""}: ${body?.message ?? "request failed"}`.trim());
  }
  return { transport: "resend", id: body?.id };
}

async function sendViaSmtp({ to, subject, html, replyTo }) {
  const transporter = getTransporter();
  if (!transporter) return null;
  const info = await transporter.sendMail({ from: getFromAddress(), to, replyTo, subject, html });
  return { transport: "smtp", id: info.messageId };
}

// Resolves to { transport, id } once the provider has accepted the message, or
// to null when no transport is configured. Rejects when delivery fails.
export async function sendMail(message) {
  if (mailTransport() === "resend") return sendViaResend(message);
  return sendViaSmtp(message);
}
