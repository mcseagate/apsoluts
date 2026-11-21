// Emails for quotes, invoices and payments. Every value that came from a
// visitor, a client or the provider goes through esc() before it reaches HTML.

export const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const FONT = "'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

function shell({ kicker, title, body, footer }) {
  return `
    <div style="background-color:#f8fafc;padding:32px 16px;font-family:${FONT};">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <div style="background-color:#0a0a0a;border-top:4px solid #be1c1c;padding:24px 32px;">
          <p style="color:#be1c1c;font-size:10px;text-transform:uppercase;letter-spacing:3px;margin:0 0 4px 0;font-weight:700;">${esc(kicker)}</p>
          <h2 style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">${esc(title)}</h2>
        </div>
        <div style="padding:32px;color:#0f172a;font-size:14px;line-height:1.6;">${body}</div>
        <div style="background-color:#0a0a0a;padding:20px 32px;border-top:1px solid #242424;">
          <p style="color:#808080;font-size:10px;margin:0;letter-spacing:1px;text-transform:uppercase;line-height:1.4;">${esc(footer)}</p>
        </div>
      </div>
    </div>`;
}

const row = (label, value) => `
  <tr>
    <td style="padding:8px 0;color:#64748b;width:140px;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;vertical-align:top;"><strong>${esc(label)}</strong></td>
    <td style="padding:8px 0;color:#0f172a;font-size:14px;">${esc(value)}</td>
  </tr>`;

export function quoteAdminTemplate(quote) {
  return shell({
    kicker: "New quote request",
    title: "Apex Root Solutions",
    body: `
      <table style="width:100%;border-collapse:collapse;">
        ${row("Name", quote.name)}
        ${row("Email", quote.email)}
        ${row("Budget", quote.budget || "Not given")}
      </table>
      <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:20px 0 8px;"><strong>Requirements</strong></p>
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;padding:16px;white-space:pre-wrap;">${esc(quote.requirements)}</div>
      <p style="margin:20px 0 0;color:#64748b;">Open the admin billing page to turn this request into a project.</p>`,
    footer: "Sent via apsoluts.com quote form",
  });
}

export function invoiceClientTemplate({ invoice, amountDisplay, link }) {
  const b = invoice.business || {};
  return shell({
    kicker: `Invoice ${invoice.number}`,
    title: b.legalName || "Apex Root Solutions",
    body: `
      <p style="margin:0 0 16px;">Hello ${esc(invoice.clientName)},</p>
      <p style="margin:0 0 16px;">Invoice ${esc(invoice.number)} for <strong>${esc(invoice.projectTitle)}</strong> (${esc(invoice.milestoneLabel)}) is ready.</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row("Amount due", amountDisplay)}
        ${row("Due date", invoice.dueDate)}
      </table>
      <p style="margin:24px 0;"><a href="${esc(link)}" style="display:inline-block;background-color:#be1c1c;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">View and pay invoice</a></p>
      <p style="margin:0;color:#64748b;font-size:12px;">This link is private to you. If the button does not work, copy this address into your browser:<br>${esc(link)}</p>`,
    footer: `${b.legalName || "Apex Root Solutions"} · Payments are handled by Stripe; card details never reach us.`,
  });
}

// A short alert to the administrator: a heading, then plain lines.
export function adminAlertTemplate({ heading, lines }) {
  return shell({
    kicker: "Billing",
    title: heading,
    body: lines.map((l) => `<p style="margin:0 0 10px;">${esc(l)}</p>`).join(""),
    footer: "Sent by the apsoluts.com billing system",
  });
}
