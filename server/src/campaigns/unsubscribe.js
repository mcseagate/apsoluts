import { createHmac, timingSafeEqual } from "node:crypto";
import { invoiceLinkSecret, siteUrl } from "../lib/billingConfig.js";

// Unsubscribe links carry `<subscriberId>.<mac>` with
// mac = HMAC-SHA256(secret, "unsubscribe:<id>"), the same stateless idea as the
// invoice links: nothing secret is stored, a link cannot be guessed or forged, and
// unsubscribing is safe to repeat. The signing secret is shared with the invoice
// links (INVOICE_LINK_SECRET) under a different label, so the two kinds of link are
// not interchangeable.

const ID = /^[a-f0-9]{24}$/;
const MAC = /^[A-Za-z0-9_-]{43}$/;

const macFor = (id) => createHmac("sha256", invoiceLinkSecret()).update(`unsubscribe:${id}`).digest("base64url");

export const unsubscribeConfigured = () => Boolean(invoiceLinkSecret());

export function makeUnsubscribeToken(subscriberId) {
  const id = String(subscriberId);
  return `${id}.${macFor(id)}`;
}

// Returns the subscriber id when the token is genuine, else null.
export function verifyUnsubscribeToken(token) {
  if (!invoiceLinkSecret() || typeof token !== "string" || token.length > 100) return null;
  const [id, mac, extra] = token.split(".");
  if (extra !== undefined || !ID.test(id ?? "") || !MAC.test(mac ?? "")) return null;
  const expected = Buffer.from(macFor(id));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

// Link people click (a page with a button), and the address mail apps call for
// one-click unsubscribe (RFC 8058).
export const unsubscribePageUrl = (token) => `${siteUrl()}/unsubscribe#${token}`;
export const oneClickUnsubscribeUrl = (token) => `${siteUrl()}/api/newsletter/unsubscribe?t=${token}`;
