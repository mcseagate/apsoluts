import nodemailer from "nodemailer";

export function getTransporter() {
  const host = process.env.SMTP_HOST || "mail.privateemail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== "false"; // Default to true (SSL)
  const user = process.env.SMTP_USER || "contact@apsoluts.com";
  const pass = process.env.SMTP_PASS;

  if (!pass) {
    console.warn(
      "[Email] SMTP_PASS not set — emails will be logged to console only.",
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // Fail within seconds if the mail server is unreachable (for example when
    // the host blocks outbound SMTP) instead of leaving the visitor waiting.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export const getFromAddress = () =>
  process.env.SMTP_FROM || "Apex Root Solutions <contact@apsoluts.com>";
