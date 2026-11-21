import { Invoice } from "../../models/Invoice.js";
import { connectDb } from "../../config/db.js";
import { clientIp, handle, HttpError, notFound } from "../../lib/http.js";
import { createLimiter } from "../../lib/rateLimit.js";
import { parseInvoiceToken, tokenMatches } from "../../lib/invoiceLinks.js";
import { publicInvoiceView } from "../../services/invoices.js";
import { createCheckoutForInvoice } from "../../services/payments.js";

// What a client can do with their invoice link: read that one invoice and start
// paying it. The token arrives in the X-Invoice-Token header, not the URL, so it
// never appears in request logs. Everything that is not a valid, enabled link to
// an issued invoice answers the same 404, so nothing can be probed.

export const limits = {
  view: createLimiter({ windowMs: 10 * 60 * 1000, max: 120 }),
  checkout: createLimiter({ windowMs: 10 * 60 * 1000, max: 12 }),
};

const DUMMY_MAC = "A".repeat(43);

async function resolveInvoice(c) {
  const parsed = parseInvoiceToken(c.req.header("x-invoice-token"));
  if (!parsed) throw notFound();
  await connectDb();
  const invoice = await Invoice.findById(parsed.id);
  // Compare against something either way, so a missing invoice costs the same.
  const ok = tokenMatches(invoice, invoice ? parsed.mac : DUMMY_MAC);
  if (!invoice || !ok || invoice.status === "draft") throw notFound();
  return { invoice, token: c.req.header("x-invoice-token") };
}

function privateHeaders(c) {
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  c.header("Referrer-Policy", "no-referrer");
}

export const viewInvoice = handle(async (c) => {
  privateHeaders(c);
  if (!limits.view.take(clientIp(c))) throw new HttpError(429, "RATE_LIMITED", "Too many requests. Please wait a moment.");
  const { invoice } = await resolveInvoice(c);
  return c.json({ data: await publicInvoiceView(invoice) });
});

export const startCheckout = handle(async (c) => {
  privateHeaders(c);
  if (!limits.checkout.take(clientIp(c))) throw new HttpError(429, "RATE_LIMITED", "Too many requests. Please wait a moment.");
  const { invoice, token } = await resolveInvoice(c);
  if (!limits.checkout.take(`invoice:${invoice._id}`)) throw new HttpError(429, "RATE_LIMITED", "Too many attempts on this invoice. Please wait a moment.");
  const { url } = await createCheckoutForInvoice(invoice, token);
  return c.json({ data: { url } });
});
