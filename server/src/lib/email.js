import { getFromAddress } from "../config/nodemailer.js";
import { sendMail } from "./mailer.js";
import { getContactTemplate } from "../templates/contact.js";
import { getNewsletterTemplate, getNewsletterAdminTemplate, getNewsletterConfirmRequestTemplate } from "../templates/newsletter.js";
import { Subscriber } from "../models/Subscriber.js";
import { connectDb } from "../config/db.js";
import { discountPercent } from "../campaigns/offers.js";
import { confirmPageUrl, makeConfirmToken, makeUnsubscribeToken, unsubscribeConfigured, unsubscribePageUrl } from "../campaigns/unsubscribe.js";

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

// Asks the owner of an address to confirm a newsletter signup. This is the only
// message sent to an address before it has confirmed.
export async function sendNewsletterConfirmRequest(email, subscriberId) {
  if (!unsubscribeConfigured()) {
    console.error("[Newsletter] Cannot send confirmation requests: INVOICE_LINK_SECRET is not set.");
    return;
  }
  const url = confirmPageUrl(makeConfirmToken(subscriberId));
  const subject = "Please confirm your subscription to Apex Root Solutions";
  const text = [
    "Someone entered this email address on apsoluts.com to receive updates from Apex Root Solutions LLC.",
    "",
    "If that was you, confirm here. Nothing will be sent to you until you do:",
    url,
    "",
    "If it was not you, ignore this message. You will not hear from us again unless you confirm.",
    "",
    "Apex Root Solutions LLC · 1732 Orlando Dr, Cedar Hill, TX 75104",
  ].join("\n");
  const sent = await sendMail({ to: email, subject, html: getNewsletterConfirmRequestTemplate(email, url), text });
  if (!sent) console.log("[Email:Newsletter Confirm Request Log Only - mail not configured]", { to: email, subject });
}

export async function sendNewsletterConfirmation(email) {
  const subject = "You're subscribed to Apex Root Solutions updates";
  // The welcome email carries the same unsubscribe link as every campaign email.
  let unsubscribeUrl;
  if (unsubscribeConfigured()) {
    await connectDb();
    const subscriber = await Subscriber.findOne({ email: email.toLowerCase().trim() }, { _id: 1 }).lean();
    if (subscriber) unsubscribeUrl = unsubscribePageUrl(makeUnsubscribeToken(subscriber._id));
  }
  const html = getNewsletterTemplate(email, { unsubscribeUrl, offerPercent: discountPercent() });

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
