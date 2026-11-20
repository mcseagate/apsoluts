import { getFromAddress } from "../config/nodemailer.js";
import { sendMail } from "./mailer.js";
import { getContactTemplate } from "../templates/contact.js";
import { getNewsletterTemplate, getNewsletterAdminTemplate } from "../templates/newsletter.js";

const NOT_CONFIGURED = "neither RESEND_API_KEY nor SMTP_PASS is set";

export async function sendContactEmail(data) {
  const subject = `New Inquiry from ${data.fullName}`;
  const html = getContactTemplate(data);
  const to = "contact@apsoluts.com";

  const sent = await sendMail({ to, replyTo: data.email, subject, html });

  if (!sent) {
    // In production a missing mail configuration must not look like success: the
    // visitor would be told their message was sent while it was only written to
    // a log.
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Cannot send contact email: ${NOT_CONFIGURED}.`);
    }
    console.log("[Email:Contact Log Only - mail not configured]", {
      from: getFromAddress(),
      to,
      replyTo: data.email,
      subject,
      html,
    });
    return;
  }
  console.log(`[Email:Contact Sent Successfully] via ${sent.transport}, id ${sent.id}`);
}

export async function sendNewsletterConfirmation(email) {
  const subject = "You're subscribed to Apex Root Solutions updates";
  const html = getNewsletterTemplate(email);

  const sent = await sendMail({ to: email, subject, html });

  if (!sent) {
    console.log("[Email:Newsletter Log Only - mail not configured]", {
      from: getFromAddress(),
      to: email,
      subject,
    });
    return;
  }
  console.log(`[Email:Newsletter Sent Successfully] via ${sent.transport}, id ${sent.id} to ${email}`);
}

export async function sendNewsletterAdminNotification(email) {
  const subject = `New Newsletter Subscriber: ${email}`;
  const html = getNewsletterAdminTemplate(email);
  const adminEmail = process.env.SMTP_USER?.trim() || "contact@apsoluts.com";

  const sent = await sendMail({ to: adminEmail, subject, html });

  if (!sent) {
    console.log("[Email:Newsletter Admin Alert Log Only - mail not configured]", {
      from: getFromAddress(),
      to: adminEmail,
      subject,
    });
    return;
  }
  console.log(`[Email:Newsletter Admin Alert Sent Successfully] via ${sent.transport}, id ${sent.id} to ${adminEmail}`);
}
