import { getTransporter, getFromAddress } from "../config/nodemailer.js";
import { getContactTemplate } from "../templates/contact.js";
import { getNewsletterTemplate, getNewsletterAdminTemplate } from "../templates/newsletter.js";

export async function sendContactEmail(data) {
  const transporter = getTransporter();
  const subject = `New Inquiry from ${data.fullName}`;
  const html = getContactTemplate(data);

  if (!transporter) {
    console.log("[Email:Contact Log Only - SMTP_PASS Missing]", {
      from: getFromAddress(),
      to: "contact@apsoluts.com",
      replyTo: data.email,
      subject,
      html,
    });
    return;
  }

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: "contact@apsoluts.com",
    replyTo: data.email,
    subject,
    html,
  });
  console.log(`[Email:Contact Sent Successfully] Message ID: ${info.messageId}`);
}

export async function sendNewsletterConfirmation(email) {
  const transporter = getTransporter();
  const subject = "You're subscribed to Apex Root Solutions updates";
  const html = getNewsletterTemplate(email);

  if (!transporter) {
    console.log("[Email:Newsletter Log Only - SMTP_PASS Missing]", {
      from: getFromAddress(),
      to: email,
      subject,
    });
    return;
  }

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject,
    html,
  });
  console.log(`[Email:Newsletter Sent Successfully] Message ID: ${info.messageId} to ${email}`);
}

export async function sendNewsletterAdminNotification(email) {
  const transporter = getTransporter();
  const subject = `New Newsletter Subscriber: ${email}`;
  const html = getNewsletterAdminTemplate(email);
  const adminEmail = process.env.SMTP_USER || "contact@apsoluts.com";

  if (!transporter) {
    console.log("[Email:Newsletter Admin Alert Log Only - SMTP_PASS Missing]", {
      from: getFromAddress(),
      to: adminEmail,
      subject,
    });
    return;
  }

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to: adminEmail,
    subject,
    html,
  });
  console.log(`[Email:Newsletter Admin Alert Sent Successfully] Message ID: ${info.messageId} to ${adminEmail}`);
}


