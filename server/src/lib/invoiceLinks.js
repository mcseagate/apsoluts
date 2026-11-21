import { createHmac, timingSafeEqual } from "node:crypto";
import { invoiceLinkSecret } from "./billingConfig.js";

// Client access to one invoice, without an account.
//
// The link carries `<invoiceId>.<mac>`, where mac = HMAC-SHA256(INVOICE_LINK_SECRET,
// "invoice:<id>:<linkVersion>"), base64url: 256 bits an outsider cannot guess or
// derive. Nothing secret is stored, so an administrator can copy the same link
// again later, and a database leak alone does not reveal any link.
//
// Revoking is a database change: disabling the link, or bumping linkVersion,
// makes every earlier link fail on its next use.

const ID = /^[a-f0-9]{24}$/;
const MAC = /^[A-Za-z0-9_-]{43}$/;

const macFor = (id, version) =>
  createHmac("sha256", invoiceLinkSecret()).update(`invoice:${id}:${version}`).digest("base64url");

export function invoiceLinksConfigured() {
  return Boolean(invoiceLinkSecret());
}

export function makeInvoiceToken(invoice) {
  if (!invoiceLinkSecret()) throw new Error("INVOICE_LINK_SECRET is not set (32+ characters required).");
  const id = String(invoice._id);
  return `${id}.${macFor(id, invoice.linkVersion)}`;
}

// Splits a presented token into its invoice id and mac, or null when it is not
// even shaped like one.
export function parseInvoiceToken(token) {
  if (typeof token !== "string" || token.length > 100) return null;
  const [id, mac, extra] = token.split(".");
  if (extra !== undefined || !ID.test(id ?? "") || !MAC.test(mac ?? "")) return null;
  return { id, mac };
}

// True when `mac` is the right one for this invoice and its link is switched on.
export function tokenMatches(invoice, mac) {
  if (!invoiceLinkSecret() || !invoice || !invoice.linkEnabled) return false;
  const expected = Buffer.from(macFor(String(invoice._id), invoice.linkVersion));
  const given = Buffer.from(String(mac));
  return expected.length === given.length && timingSafeEqual(expected, given);
}
