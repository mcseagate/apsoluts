import { siteUrl } from "../lib/billingConfig.js";
import { esc } from "../templates/billing.js";
import { CONTACT_EMAIL, EYEBROW, INK, MUTED, POSTAL_ADDRESS, SANS, SERIF, TEXT, button, footerRow, listBlock, shell } from "./layout.js";
import { MAX_TOTAL_DISCOUNT_PERCENT } from "./offers.js";
import { topicFor } from "./content.js";
import { makeUnsubscribeToken, oneClickUnsubscribeUrl, unsubscribePageUrl } from "./unsubscribe.js";

// Builds one campaign email: the subject, an HTML document, a plain-text body and
// the headers that make unsubscribing one click in mail apps. Everything that
// varies per person (their address, their unsubscribe link) is added here;
// everything else comes from content.js and the active offer.
//
// The shared look (tables, inline styles, light scheme) is in layout.js.

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

  const html = shell({
    subject,
    preheader,
    rows: [
      `
      <tr><td style="padding:40px 40px 8px 40px;font-family:${SANS};">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:${EYEBROW};text-transform:uppercase;margin:0 0 18px 0;">${esc(topic.eyebrow)}</div>
        <h1 style="margin:0 0 28px 0;font-family:${SERIF};font-size:36px;line-height:1.14;font-weight:400;color:${INK};">${esc(topic.heading)}</h1>
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:${TEXT};">Hello,</p>
        ${topic.paragraphs.map((p) => `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:${TEXT};">${esc(p)}</p>`).join("")}
        <div style="padding:6px 0 32px 0;">${button(ctaHref, topic.cta.label)}</div>
      </td></tr>`,
      listBlock(topic.items),
      offerBlock,
      `
      <tr><td style="padding:${offer ? "28px" : "40px"} 40px 40px 40px;font-family:${SANS};">
        <p style="margin:0 0 4px 0;font-size:14px;line-height:1.6;color:${TEXT};">Let&rsquo;s build something useful.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;font-weight:700;color:${INK};">The Apex Root Solutions team</p>
      </td></tr>`,
      footerRow({ to, reason: "because you subscribed on our website.", unsubPage }),
    ],
  });

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
