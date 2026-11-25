import { createHash } from "node:crypto";
import { connectDb } from "../config/db.js";
import { OneOffSend } from "../models/OneOffSend.js";
import { OptOut } from "../models/OptOut.js";
import { QuoteRequest } from "../models/QuoteRequest.js";
import { Subscriber } from "../models/Subscriber.js";
import { adminNotifyAddress, siteUrl } from "../lib/billingConfig.js";
import { deliverableSubscribers, isOptedOut } from "../lib/subscribers.js";
import { createLimiter } from "../lib/rateLimit.js";
import { mailTransport, sendMail } from "../lib/mailer.js";
import { esc } from "../templates/billing.js";
import { CONTACT_EMAIL, EYEBROW, INK, POSTAL_ADDRESS, SANS, SERIF, TEXT, button, footerRow, listBlock, shell } from "./layout.js";
import { makeOptOutToken, oneClickUnsubscribeUrl, unsubscribeConfigured, unsubscribePageUrl } from "./unsubscribe.js";

// A one-off message to people who have already told us they want to hear from us:
// confirmed newsletter subscribers, and people who sent a quote request. It asks
// what services they need and how we can help.
//
// Who is NOT included, by design:
//   - anyone who has not confirmed a newsletter signup (a bot can type any address
//     into a form; only the owner of an address can click the link we email);
//   - anyone who unsubscribed, or is on the do-not-email list;
//   - people who only used the contact form: the form is emailed to the owner and
//     not stored, so there is no list to send to.
// Every message carries its own opt-out link and one-click List-Unsubscribe header.
// Sending is idempotent per recipient (OneOffSend), so an interrupted run can be
// repeated safely.
//
// The same message, with an opening that thanks the person for writing, is also
// sent automatically to anyone who submits the contact or quote form (autoReply
// below). It shares the send log, so an address gets this message once, ever.

export const OUTREACH_KEY = "outreach-2026-11-25";

const hashOf = (email) => createHash("sha256").update(email.toLowerCase().trim()).digest("hex");

// jo***@gm***.com: enough for the owner to recognise an address in a log or a
// terminal without writing the whole address down.
export function maskEmail(email) {
  const [local = "", domain = ""] = String(email).split("@");
  const [host = "", ...tld] = domain.split(".");
  return `${local.slice(0, 2)}***@${host.slice(0, 2)}***${tld.length ? `.${tld.join(".")}` : ""}`;
}

const landingUrl = () => `${siteUrl()}/web-app-landing`;
const mailtoUrl = () => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("My project")}`;

const INTRO = [
  "You asked to hear from Apex Root Solutions, and we would like to ask you something simple: what do you need, and how can we help?",
  "A sentence or two is plenty. Just reply to this email, or use the button below, and tell us which of these is closest to what you have in mind.",
];

const SERVICES = [
  { title: "Web applications", body: "Dashboards, client portals, internal tools and SaaS products." },
  { title: "Mobile apps", body: "iOS and Android apps for the App Store and Google Play." },
  { title: "Windows software", body: "Desktop software with a signed installer or Microsoft Store listing." },
  { title: "Backends and e-commerce", body: "APIs, databases, online stores and the payments behind them." },
  { title: "Something else", body: "Tell us the problem. We will say honestly whether we are the right team." },
];

// The opening when someone has just written to us through a form.
const REPLY_INTRO = [
  "Thank you for getting in touch with Apex Root Solutions. We have your message and will be in touch by email.",
  "So that we can point you in the right direction, tell us what you need and how we can help. A sentence or two is plenty: just reply to this email, or use the button below. These are the kinds of work we do.",
];

const REASONS = {
  subscriber: "because you confirmed a subscription to our updates on our website.",
  quote: "because you sent us a quote request on our website.",
  contact: "because you sent us a message through our website.",
};

export const SUBJECT = "What does your next project need?";
export const REPLY_SUBJECT = "Thanks for getting in touch: what does your project need?";

// recipient: { email, reason: "subscriber" | "quote" | "contact" }; copy: marks the
// owner's copy; reply: the automatic reply to a form submission (thanks the person
// for writing first).
export function composeOutreach({ recipient, copy = false, reply = false }) {
  const base = reply ? REPLY_SUBJECT : SUBJECT;
  const subject = copy ? `[Copy] ${base}` : base;
  const intro = reply ? REPLY_INTRO : INTRO;
  const token = makeOptOutToken(recipient.email);
  const unsubPage = unsubscribePageUrl(token);
  const reason = REASONS[recipient.reason] ?? REASONS.subscriber;
  const headers = {
    "List-Unsubscribe": `<${oneClickUnsubscribeUrl(token)}>, <mailto:${CONTACT_EMAIL}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };

  const html = shell({
    subject,
    preheader: "Tell us what you need and how we can help.",
    rows: [
      `
      <tr><td style="padding:40px 40px 8px 40px;font-family:${SANS};">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:${EYEBROW};text-transform:uppercase;margin:0 0 18px 0;">A question for you</div>
        <h1 style="margin:0 0 28px 0;font-family:${SERIF};font-size:36px;line-height:1.14;font-weight:400;color:${INK};">How can we help?</h1>
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:${TEXT};">Hello,</p>
        ${intro.map((p) => `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:${TEXT};">${esc(p)}</p>`).join("")}
        <div style="padding:6px 0 32px 0;">${button(mailtoUrl(), "Tell us about your project")}</div>
      </td></tr>`,
      listBlock(SERVICES),
      `
      <tr><td style="padding:32px 40px 8px 40px;font-family:${SANS};">
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:${TEXT};">Want to see what we build and what it costs first? Our services and pricing page explains how a project runs, from the first conversation to launch.</p>
        <div style="padding:2px 0 8px 0;">${button(landingUrl(), "View services & pricing")}</div>
      </td></tr>`,
      `
      <tr><td style="padding:32px 40px 40px 40px;font-family:${SANS};">
        <p style="margin:0 0 4px 0;font-size:14px;line-height:1.6;color:${TEXT};">We read every reply.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;font-weight:700;color:${INK};">The Apex Root Solutions team</p>
      </td></tr>`,
      footerRow({ to: recipient.email, reason: `${reason} This is a one-time message.`, unsubPage }),
    ],
  });

  const text = [
    "APEX ROOT / SOLUTIONS",
    "",
    "HOW CAN WE HELP?",
    "",
    "Hello,",
    "",
    ...intro.flatMap((p) => [p, ""]),
    `Tell us about your project: reply to this email or write to ${CONTACT_EMAIL}`,
    "",
    ...SERVICES.map((s) => `- ${s.title}: ${s.body}`),
    "",
    "Want to see what we build and what it costs first?",
    `View services & pricing: ${landingUrl()}`,
    "",
    "We read every reply.",
    "The Apex Root Solutions team",
    "",
    "--",
    POSTAL_ADDRESS,
    `You received this promotional email at ${recipient.email} ${reason} This is a one-time message.`,
    `Unsubscribe: ${unsubPage}`,
  ].join("\n");

  return { subject, html, text, headers, replyTo: CONTACT_EMAIL };
}

// The people this message may go to, most-certain first, with a reason for each.
// `exclude` is a list of addresses the owner has reviewed and removed.
export async function outreachAudience({ exclude = [] } = {}) {
  await connectDb();
  const skip = new Set(exclude.map((e) => e.toLowerCase().trim()));
  for (const o of await OptOut.find({}, { email: 1 }).lean()) skip.add(o.email);
  // A subscriber record that is unsubscribed (including bot signups the owner
  // removed) blocks that address from every list.
  for (const s of await Subscriber.find({ unsubscribedAt: { $ne: null } }, { email: 1 }).lean()) skip.add(s.email);

  const byEmail = new Map();
  for (const s of await deliverableSubscribers()) if (!skip.has(s.email)) byEmail.set(s.email, { email: s.email, reason: "subscriber" });
  for (const q of await QuoteRequest.find({}, { email: 1 }).lean()) {
    const email = q.email.toLowerCase().trim();
    if (!skip.has(email) && !byEmail.has(email)) byEmail.set(email, { email, reason: "quote" });
  }
  return [...byEmail.values()];
}

const failureCode = (err) => String(err?.message ?? "error").replace(/[^\w .:-]/g, "").slice(0, 60);

async function deliver({ key, recipient, copy, reply = false, send, from }) {
  try {
    await OneOffSend.create({ key, emailHash: hashOf(recipient.email) });
  } catch (err) {
    if (err?.code === 11000) return "skipped"; // already handled for this message
    throw err;
  }
  try {
    const message = composeOutreach({ recipient, copy, reply });
    const result = await send({ to: recipient.email, ...message, ...(from ? { from } : {}) });
    if (!result) throw new Error("mail_not_configured");
    await OneOffSend.updateOne({ key, emailHash: hashOf(recipient.email) }, { $set: { status: "sent" } });
    return "sent";
  } catch (err) {
    await OneOffSend.updateOne({ key, emailHash: hashOf(recipient.email) }, { $set: { status: "failed", error: failureCode(err) } });
    return "failed";
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// mode: "dry-run" (nothing sent), "test" (only the owner's copy), "send" (owner's
// copy first, then everyone). The owner's copy goes first so a mail problem stops
// the run before anyone else is emailed.
export async function runOutreach({ mode = "dry-run", exclude = [], key = OUTREACH_KEY, send = sendMail, delayMs = 600, from, log = console.log } = {}) {
  const audience = await outreachAudience({ exclude });
  const owner = { email: adminNotifyAddress().toLowerCase(), reason: "subscriber" };
  log(`Audience: ${audience.length} (${audience.filter((a) => a.reason === "subscriber").length} confirmed subscribers, ${audience.filter((a) => a.reason === "quote").length} quote requesters).`);
  for (const a of audience) log(`  ${a.reason.padEnd(10)} ${maskEmail(a.email)}`);
  if (mode === "dry-run") return { mode, audience: audience.length, sent: 0, failed: 0, skipped: 0 };

  const copy = await deliver({ key, recipient: owner, copy: true, send, from });
  log(`Owner copy to ${maskEmail(owner.email)}: ${copy}`);
  if (copy === "failed") {
    log("Stopped: the owner's copy did not send, so nobody else was emailed.");
    return { mode, audience: audience.length, sent: 0, failed: 1, skipped: 0, stopped: true };
  }
  if (mode === "test") return { mode, audience: audience.length, sent: copy === "sent" ? 1 : 0, failed: 0, skipped: copy === "skipped" ? 1 : 0 };

  const tally = { sent: 0, failed: 0, skipped: 0 };
  for (const recipient of audience) {
    if (recipient.email === owner.email) continue; // the owner already has the copy
    const result = await deliver({ key, recipient, copy: false, send, from });
    tally[result] += 1;
    if (result !== "skipped" && delayMs) await sleep(delayMs); // stay under the provider's request rate
  }
  log(`Done: ${tally.sent} sent, ${tally.failed} failed, ${tally.skipped} already sent.`);
  return { mode, audience: audience.length, ...tally };
}

// ---------------------------------------------------------------------------
// Automatic reply to a form submission

export const autoReplyEnabled = () => process.env.CONTACT_AUTOREPLY?.trim().toLowerCase() !== "false";

// The forms are public, so a bot can type someone else's address into one. Every
// form already drops bots and limits requests per address; these caps are a
// second, lower ceiling on how many automatic replies can ever leave per hour and
// per day, whatever gets through.
export const autoReplyLimits = {
  hourly: createLimiter({ windowMs: 60 * 60 * 1000, max: 20 }),
  daily: createLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 60 }),
};

// Sends the "thanks for getting in touch: what does your project need?" message
// to someone who has just submitted the contact or quote form. source: "contact"
// or "quote". Called after the submission has passed the form's checks, and never
// awaited by the request: it resolves to a short status and never throws.
//
// It does not send when: the feature is switched off (CONTACT_AUTOREPLY=false),
// mail or link signing is not configured, a cap is reached, the address is on the
// do-not-email list or unsubscribed, or the address has already been sent this
// message (by this feature or by the one-off run), which keeps a person who writes
// twice from being answered twice.
export async function autoReply({ email, source = "contact", send = sendMail, from = process.env.CAMPAIGN_FROM?.trim() || undefined } = {}) {
  try {
    if (!autoReplyEnabled()) return "disabled";
    if (!mailTransport() || !unsubscribeConfigured()) return "not_configured";
    const address = String(email ?? "").toLowerCase().trim();
    if (!address) return "no_address";
    await connectDb();
    if (await isOptedOut(address)) return "opted_out";
    if (await Subscriber.exists({ email: address, unsubscribedAt: { $ne: null } })) return "opted_out";
    if (await OneOffSend.exists({ key: OUTREACH_KEY, emailHash: hashOf(address) })) return "already_sent";
    if (!autoReplyLimits.hourly.take("all") || !autoReplyLimits.daily.take("all")) return "capped";
    return await deliver({ key: OUTREACH_KEY, recipient: { email: address, reason: source === "quote" ? "quote" : "contact" }, copy: false, reply: true, send, from });
  } catch (err) {
    console.error("[AutoReply] failed:", err?.message ?? err);
    return "error";
  }
}
