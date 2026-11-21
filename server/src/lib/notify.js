import { sendMail, mailTransport } from "./mailer.js";
import { adminNotifyAddress, siteUrl } from "./billingConfig.js";
import { makeInvoiceToken } from "./invoiceLinks.js";
import { formatMoney } from "./money.js";
import { adminAlertTemplate, invoiceClientTemplate, quoteAdminTemplate } from "../templates/billing.js";

// Billing notifications use the site's existing mail service (lib/mailer.js:
// Resend, or SMTP as a fallback). With neither configured nothing is sent and
// the call says so; development logs the subject only, never a body or a link.

// Alerts to the administrator. Never throws: a mail outage must not fail a
// webhook (Stripe would retry) or lose a quote request.
export async function notifyAdmin(subject, lines) {
  try {
    const to = adminNotifyAddress();
    const sent = await sendMail({ to, subject, html: adminAlertTemplate({ heading: subject, lines }) });
    if (!sent) console.log(`[Billing] Admin alert not sent (mail not configured): ${subject}`);
    return Boolean(sent);
  } catch (err) {
    console.error("[Billing] Admin alert failed:", err.message);
    return false;
  }
}

export async function notifyAdminOfQuote(quote) {
  try {
    const sent = await sendMail({
      to: adminNotifyAddress(),
      replyTo: quote.email,
      subject: `New quote request from ${quote.name.slice(0, 60)}`,
      html: quoteAdminTemplate(quote),
    });
    if (!sent) console.log("[Billing] Quote alert not sent (mail not configured)");
  } catch (err) {
    console.error("[Billing] Quote alert failed:", err.message);
  }
}

export const invoiceLink = (invoice) => `${siteUrl()}/invoice#${makeInvoiceToken(invoice)}`;

// Emails the invoice link to the client. Unlike the alerts this reports failure
// to the caller, because the administrator pressed a button and needs to know.
export async function sendInvoiceToClient(invoice) {
  if (!mailTransport()) return { sent: false, reason: "mail_not_configured" };
  const sent = await sendMail({
    to: invoice.clientEmail,
    subject: `Invoice ${invoice.number} from ${invoice.business?.legalName || "Apex Root Solutions"}`,
    html: invoiceClientTemplate({
      invoice,
      amountDisplay: formatMoney(invoice.amountMinor, invoice.currency),
      link: invoiceLink(invoice),
    }),
  });
  return { sent: Boolean(sent), reason: sent ? null : "mail_not_configured" };
}
