import { siteUrl } from "../lib/billingConfig.js";
import { esc } from "../templates/billing.js";
import { MAX_TOTAL_DISCOUNT_PERCENT } from "./offers.js";
import { topicFor } from "./content.js";
import { makeUnsubscribeToken, oneClickUnsubscribeUrl, unsubscribePageUrl } from "./unsubscribe.js";

// Builds one campaign email: the subject, an HTML document, a plain-text body and
// the headers that make unsubscribing one click in mail apps. Everything that
// varies per person (their address, their unsubscribe link) is added here;
// everything else comes from content.js and the active offer.
//
// The layout is built from nested tables with inline styles, which is what mail
// apps (Outlook, Gmail, Apple Mail) render reliably, and it is forced to a light
// scheme so a client's automatic dark mode does not invert it.

const POSTAL_ADDRESS = "Apex Root Solutions LLC · 1732 Orlando Dr, Cedar Hill, TX 75104";
const CONTACT_EMAIL = "contact@apsoluts.com";

const INK = "#1b2333";
const TEXT = "#3a4252";
const MUTED = "#6b7280";
const FAINT = "#9aa1ad";
const LINE = "#e4e7eb";
const TINT = "#f4f5f7";
const EYEBROW = "#3f5f8f";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";

const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

// The terms printed with every offer. They are what the business commits to, so
// they are short and plain.
export function offerTerms(offer) {
  return `${offer.percent}% off the whole project price in your written quote, for quote requests received by ${longDate(offer.validThrough)}. One offer per project; it cannot be combined with other discounts.`;
}

function guard(offer) {
  if (offer && !(offer.percent > 0 && offer.percent <= MAX_TOTAL_DISCOUNT_PERCENT)) {
    throw new Error(`Refusing to compose an offer of ${offer.percent}%: the limit is ${MAX_TOTAL_DISCOUNT_PERCENT}%.`);
  }
}

const button = (href, label) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${INK};border-radius:3px;">
      <a href="${esc(href)}" style="display:inline-block;padding:13px 22px;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:0.2px;color:#ffffff;text-decoration:none;">${esc(label)}&nbsp;&nbsp;&#8599;</a>
    </td></tr></table>`;

const listRow = (item, first) => `
      <tr>
        <td width="26" valign="top" style="padding:18px 0;${first ? "" : `border-top:1px solid ${LINE};`}font-family:${SANS};font-size:13px;color:${FAINT};">&#8599;</td>
        <td valign="top" style="padding:18px 0;${first ? "" : `border-top:1px solid ${LINE};`}font-family:${SANS};">
          <div style="font-size:15px;font-weight:700;color:${INK};line-height:1.4;">${esc(item.title)}</div>
          <div style="font-size:13px;color:${MUTED};line-height:1.55;margin-top:3px;">${esc(item.body)}</div>
        </td>
      </tr>`;

// plan: { kind, offer }, sequence: 1-based send number, subscriber: { _id, email }
// or null for a preview, in which case the unsubscribe link is a placeholder.
export function composeCampaign({ plan, sequence, subscriber }) {
  guard(plan.offer);
  const topic = topicFor(sequence);
  const base = siteUrl();
  const offer = plan.kind === "holiday" ? plan.offer : null;

  const subject = offer ? `${offer.percent}% off for ${offer.holiday}: ${topic.subject}` : topic.subject;
  const ctaHref = `${base}${topic.cta.path}${offer && topic.cta.path === "/quote" ? `?offer=${offer.code}` : ""}`;
  const offerHref = offer ? `${base}/quote?offer=${offer.code}` : null;

  const token = subscriber ? makeUnsubscribeToken(subscriber._id) : null;
  const unsubPage = token ? unsubscribePageUrl(token) : `${base}/unsubscribe`;
  const headers = token
    ? {
        "List-Unsubscribe": `<${oneClickUnsubscribeUrl(token)}>, <mailto:${CONTACT_EMAIL}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
    : {};
  const to = subscriber?.email ?? "preview@example.com";

  // Hidden line some mail apps show next to the subject.
  const preheader = offer ? `${offer.percent}% off your whole project price for ${offer.holiday}. ${topic.paragraphs[0]}` : topic.paragraphs[0];

  const offerBlock = offer
    ? `
        <tr><td style="padding:40px 40px 8px 40px;font-family:${SANS};">
          <div style="font-family:${SERIF};font-size:22px;line-height:1.3;color:${INK};margin:0 0 12px 0;">A ${esc(offer.holiday)} thank-you</div>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:${TEXT};">Receive <strong style="color:${INK};">${offer.percent}% off your whole project price</strong>. Mention <strong style="color:${INK};">${esc(offer.code)}</strong> when you request a quote.</p>
          ${button(offerHref, "Request a quote")}
          <p style="margin:18px 0 0 0;font-size:11px;line-height:1.6;color:${MUTED};">${esc(offerTerms(offer))}</p>
        </td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;">

      <tr><td style="padding:32px 40px 22px 40px;border-bottom:1px solid ${LINE};font-family:${SANS};">
        <div style="font-size:12px;font-weight:700;letter-spacing:2.4px;color:${INK};">APEX ROOT <span style="font-weight:400;color:${MUTED};">/ SOLUTIONS</span></div>
        <div style="font-size:10px;font-weight:600;letter-spacing:2px;color:${INK};margin-top:10px;">A NOTE FROM APEX ROOT SOLUTIONS</div>
      </td></tr>

      <tr><td style="padding:40px 40px 8px 40px;font-family:${SANS};">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:${EYEBROW};text-transform:uppercase;margin:0 0 18px 0;">${esc(topic.eyebrow)}</div>
        <h1 style="margin:0 0 28px 0;font-family:${SERIF};font-size:36px;line-height:1.14;font-weight:400;color:${INK};">${esc(topic.heading)}</h1>
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:${TEXT};">Hello,</p>
        ${topic.paragraphs.map((p) => `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:${TEXT};">${esc(p)}</p>`).join("")}
        <div style="padding:6px 0 32px 0;">${button(ctaHref, topic.cta.label)}</div>
      </td></tr>

      <tr><td style="background-color:${TINT};padding:14px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${topic.items.map((item, i) => listRow(item, i === 0)).join("")}
        </table>
      </td></tr>

      ${offerBlock}

      <tr><td style="padding:${offer ? "28px" : "40px"} 40px 40px 40px;font-family:${SANS};">
        <p style="margin:0 0 4px 0;font-size:14px;line-height:1.6;color:${TEXT};">Let&rsquo;s build something useful.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;font-weight:700;color:${INK};">The Apex Root Solutions team</p>
      </td></tr>

      <tr><td style="background-color:${TINT};padding:26px 40px 32px 40px;font-family:${SANS};">
        <p style="margin:0 0 14px 0;font-size:12px;line-height:1.6;color:${TEXT};">Have a project in mind? <a href="mailto:${CONTACT_EMAIL}" style="color:${INK};text-decoration:underline;">Let&rsquo;s talk.</a></p>
        <p style="margin:0 0 6px 0;font-size:11px;line-height:1.6;color:${MUTED};">${esc(POSTAL_ADDRESS)}</p>
        <p style="margin:0 0 8px 0;font-size:11px;line-height:1.6;color:${MUTED};">You received this promotional email at ${esc(to)} because you subscribed on our website.</p>
        <p style="margin:0;font-size:11px;line-height:1.6;"><a href="${esc(unsubPage)}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a></p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    "APEX ROOT / SOLUTIONS",
    "A NOTE FROM APEX ROOT SOLUTIONS",
    "",
    topic.eyebrow.toUpperCase(),
    topic.heading,
    "",
    "Hello,",
    "",
    ...topic.paragraphs.flatMap((p) => [p, ""]),
    `${topic.cta.label}: ${ctaHref}`,
    "",
    ...topic.items.flatMap((i) => [`- ${i.title}: ${i.body}`]),
    "",
    ...(offer
      ? [
          `A ${offer.holiday} thank-you`,
          `Receive ${offer.percent}% off your whole project price. Mention ${offer.code} when you request a quote: ${offerHref}`,
          offerTerms(offer),
          "",
        ]
      : []),
    "Let's build something useful.",
    "The Apex Root Solutions team",
    "",
    "--",
    `Have a project in mind? Write to ${CONTACT_EMAIL}.`,
    POSTAL_ADDRESS,
    `You received this promotional email at ${to} because you subscribed on our website.`,
    `Unsubscribe: ${unsubPage}`,
  ].join("\n");

  return { subject, html, text, headers, topic: topic.id, offerCode: offer?.code ?? null };
}
