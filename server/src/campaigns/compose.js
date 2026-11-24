import { siteUrl } from "../lib/billingConfig.js";
import { esc } from "../templates/billing.js";
import { MAX_TOTAL_DISCOUNT_PERCENT } from "./offers.js";
import { topicFor } from "./content.js";
import { makeUnsubscribeToken, oneClickUnsubscribeUrl, unsubscribePageUrl } from "./unsubscribe.js";

// Builds one campaign email: the subject, an HTML body, a plain-text body and the
// headers that make unsubscribing one click in mail apps. Everything that varies
// per person (their address, their unsubscribe link) is added here; everything
// else comes from content.js and the active offer.

const POSTAL_ADDRESS = "Apex Root Solutions LLC · 1732 Orlando Dr, Cedar Hill, TX 75104";
const CONTACT_EMAIL = "contact@apsoluts.com";
const FONT = "'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

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

  const offerBox = offer
    ? `
        <div style="border:2px solid #be1c1c;background-color:#fff5f5;padding:20px;margin:0 0 28px 0;">
          <p style="color:#be1c1c;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px 0;font-weight:700;">${esc(offer.holiday)} offer</p>
          <p style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 8px 0;">${offer.percent}% off your whole project price</p>
          <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 12px 0;">Request a quote and mention code <strong>${esc(offer.code)}</strong>. <a href="${esc(offerHref)}" style="color:#be1c1c;font-weight:600;">Request a quote with the code filled in</a>.</p>
          <p style="color:#64748b;font-size:12px;line-height:1.5;margin:0;">${esc(offerTerms(offer))}</p>
        </div>`
    : "";

  const html = `
    <div style="background-color:#f8fafc;padding:32px 16px;font-family:${FONT};">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <div style="background-color:#0a0a0a;border-top:4px solid #be1c1c;padding:24px 32px;">
          <p style="color:#be1c1c;font-size:10px;text-transform:uppercase;letter-spacing:3px;margin:0 0 4px 0;font-weight:700;">Apex Root Solutions</p>
          <h2 style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">${esc(topic.heading)}</h2>
        </div>
        <div style="padding:32px;color:#334155;font-size:14px;line-height:1.7;">
          ${offerBox}
          <p style="margin:0 0 20px 0;">${esc(topic.intro)}</p>
          <ul style="padding-left:20px;margin:0 0 28px 0;">
            ${topic.bullets.map((b) => `<li style="margin-bottom:10px;">${esc(b)}</li>`).join("")}
          </ul>
          <p style="margin:0 0 12px 0;"><a href="${esc(ctaHref)}" style="display:inline-block;background-color:#be1c1c;color:#ffffff;text-decoration:none;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:2px;padding:14px 26px;">${esc(topic.cta.label)}</a></p>
          <p style="margin:16px 0 0 0;font-size:13px;color:#64748b;">Questions? Reply to this email or write to <a href="mailto:${CONTACT_EMAIL}" style="color:#be1c1c;">${CONTACT_EMAIL}</a>.</p>
        </div>
        <div style="background-color:#0a0a0a;padding:24px 32px;border-top:1px solid #242424;">
          <p style="color:#9a9a9a;font-size:11px;margin:0 0 8px 0;line-height:1.5;">${esc(POSTAL_ADDRESS)}</p>
          <p style="color:#9a9a9a;font-size:11px;margin:0;line-height:1.6;">This is a promotional email from Apex Root Solutions LLC, sent to ${esc(to)} because you subscribed on our website. <a href="${esc(unsubPage)}" style="color:#ffffff;">Unsubscribe</a> at any time.</p>
        </div>
      </div>
    </div>`;

  const text = [
    offer ? `${offer.holiday.toUpperCase()} OFFER: ${offer.percent}% off your whole project price.\nRequest a quote and mention code ${offer.code}: ${offerHref}\n${offerTerms(offer)}\n` : "",
    topic.heading.toUpperCase(),
    "",
    topic.intro,
    "",
    ...topic.bullets.map((b) => `- ${b}`),
    "",
    `${topic.cta.label}: ${ctaHref}`,
    "",
    `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,
    "",
    "--",
    POSTAL_ADDRESS,
    `This is a promotional email from Apex Root Solutions LLC, sent to ${to} because you subscribed on our website.`,
    `Unsubscribe: ${unsubPage}`,
  ].join("\n");

  return { subject, html, text, headers, topic: topic.id, offerCode: offer?.code ?? null };
}
