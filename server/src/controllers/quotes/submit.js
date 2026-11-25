import { createHash } from "node:crypto";
import { QuoteRequest } from "../../models/QuoteRequest.js";
import { connectDb } from "../../config/db.js";
import { audit } from "../../lib/audit.js";
import { clientIp, handle, HttpError, readJson } from "../../lib/http.js";
import { createLimiter } from "../../lib/rateLimit.js";
import { notifyAdminOfQuote } from "../../lib/notify.js";
import { autoReply } from "../../campaigns/outreach.js";
import { email, text, todayUtc } from "../../lib/validate.js";
import { resolveOffer } from "../../campaigns/offers.js";

// The public quote form. Spam is handled in layers, none of which asks the
// visitor to solve anything:
//   - a hidden "website" field that people never fill in and bots usually do;
//   - a minimum time between the form appearing and being sent;
//   - request limits per address, per email and overall;
//   - strict length limits, and an identical repeat is dropped.
// A request that trips the first two gets the normal success reply and is not
// stored, so a bot learns nothing about why it failed.

export const limits = {
  perIp: createLimiter({ windowMs: 60 * 60 * 1000, max: 5 }),
  perEmail: createLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 3 }),
  global: createLimiter({ windowMs: 60 * 60 * 1000, max: 100 }),
};

const MIN_FILL_MS = 2500;
const MESSAGE = "Thanks. We have your request and will reply by email, usually within one business day.";
const OK = { data: { success: true, message: MESSAGE, offer: null } };

export const submitQuote = handle(async (c) => {
  const ip = clientIp(c);
  if (!limits.global.take("all") || !limits.perIp.take(ip)) {
    throw new HttpError(429, "RATE_LIMITED", "Too many requests. Please try again later.");
  }

  const body = await readJson(c, 16 * 1024);

  if (typeof body.website === "string" && body.website.trim() !== "") return c.json(OK);
  if (typeof body.elapsedMs !== "number" || !Number.isFinite(body.elapsedMs)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Please send this request from the form on our site.");
  }
  if (body.elapsedMs < MIN_FILL_MS) return c.json(OK);

  const quote = {
    name: text(body.name, "Name", { min: 2, max: 100 }),
    email: email(body.email, "Email"),
    requirements: text(body.requirements, "Project requirements", { min: 20, max: 5000, multiline: true }),
    budget: text(body.budget, "Budget", { max: 100, optional: true }),
  };
  // An offer code is checked against what is running today. A wrong or expired
  // code never blocks the request; it just is not recorded.
  const typedCode = text(body.offerCode, "Offer code", { max: 40, optional: true });
  const offer = resolveOffer(typedCode, todayUtc());

  if (!limits.perEmail.take(quote.email)) {
    throw new HttpError(429, "RATE_LIMITED", "We already have your recent requests. We will be in touch soon.");
  }

  await connectDb();
  const fingerprint = createHash("sha256").update(`${quote.email}\n${quote.requirements.toLowerCase()}`).digest("hex");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (await QuoteRequest.exists({ fingerprint, createdAt: { $gte: since } })) return c.json(OK);

  const saved = await QuoteRequest.create({
    ...quote,
    fingerprint,
    offer: offer ? { code: offer.code, holiday: offer.holiday, percent: offer.percent, validThrough: offer.validThrough } : null,
  });
  await audit("quote", saved._id, "received", { actor: "client", to: "new" });
  // Not awaited for the visitor's sake; notifyAdminOfQuote never throws.
  void notifyAdminOfQuote({ ...quote, offer });
  void autoReply({ email: quote.email, source: "quote" });
  const status = offer ? "applied" : typedCode ? "not_active" : null;
  const note =
    status === "applied"
      ? ` Your ${offer.percent}% ${offer.holiday} offer was recorded.`
      : status === "not_active"
        ? " That offer code is not running right now, so it was not applied, but we will still reply to your request."
        : "";
  return c.json({ data: { success: true, message: MESSAGE + note, offer: status } }, 201);
});
