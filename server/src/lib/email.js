import { getFromAddress } from "../config/nodemailer.js";
import { sendMail } from "./mailer.js";
import { getContactTemplate } from "../templates/contact.js";
import { getNewsletterTemplate, getNewsletterAdminTemplate } from "../templates/newsletter.js";
import { Subscriber } from "../models/Subscriber.js";
import { connectDb } from "../config/db.js";
import { discountPercent } from "../campaigns/offers.js";
import { makeUnsubscribeToken, unsubscribeConfigured, unsubscribePageUrl } from "../campaigns/unsubscribe.js";

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
