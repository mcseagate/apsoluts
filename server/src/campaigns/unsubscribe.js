import { createHmac, timingSafeEqual } from "node:crypto";
import { invoiceLinkSecret, siteUrl } from "../lib/billingConfig.js";

// Signed links for three things, all stateless (nothing secret is stored, a link
// cannot be guessed or forged, repeating one is harmless), all signed with
// INVOICE_LINK_SECRET under a different label so they are not interchangeable:
//
//   unsubscribe  <subscriberId>.<mac>   for people on the subscriber list
//   confirm      <subscriberId>.<mac>   the link in the "please confirm" email
//   opt-out      <base64url(email)>.<mac>  for people who are not subscribers,
//                                          for example one-off messages to quote
//                                          requesters

const ID = /^[a-f0-9]{24}$/;
const MAC = /^[A-Za-z0-9_-]{43}$/;

const macFor = (label, value) => createHmac("sha256", invoiceLinkSecret()).update(`${label}:${value}`).digest("base64url");

const matches = (mac, expected) => {
  const a = Buffer.from(expected);
  const b = Buffer.from(mac);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const unsubscribeConfigured = () => Boolean(invoiceLinkSecret());

function makeIdToken(label, subscriberId) {
  const id = String(subscriberId);
  return `${id}.${macFor(label, id)}`;
}

// Returns the subscriber id when the token is genuine, else null.
function verifyIdToken(label, token) {
  if (!invoiceLinkSecret() || typeof token !== "string" || token.length > 100) return null;
  const [id, mac, extra] = token.split(".");
  if (extra !== undefined || !ID.test(id ?? "") || !MAC.test(mac ?? "")) return null;
  return matches(mac, macFor(label, id)) ? id : null;
}

export const makeUnsubscribeToken = (subscriberId) => makeIdToken("unsubscribe", subscriberId);
export const verifyUnsubscribeToken = (token) => verifyIdToken("unsubscribe", token);
export const makeConfirmToken = (subscriberId) => makeIdToken("confirm", subscriberId);
export const verifyConfirmToken = (token) => verifyIdToken("confirm", token);

export function makeOptOutToken(email) {
  const normalized = String(email).trim().toLowerCase();
  return `${Buffer.from(normalized).toString("base64url")}.${macFor("optout", normalized)}`;
}

// Returns the address when the token is genuine, else null.
export function verifyOptOutToken(token) {
  if (!invoiceLinkSecret() || typeof token !== "string" || token.length > 400) return null;
  const [encoded, mac, extra] = token.split(".");
  if (extra !== undefined || !encoded || !MAC.test(mac ?? "")) return null;
  let email;
  try {
    email = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email || email.length > 254 || email !== email.toLowerCase() || !email.includes("@")) return null;
  return matches(mac, macFor("optout", email)) ? email : null;
}

// Link people click (a page with a button), and the address mail apps call for
// one-click unsubscribe (RFC 8058).
export const unsubscribePageUrl = (token) => `${siteUrl()}/unsubscribe#${token}`;
export const oneClickUnsubscribeUrl = (token) => `${siteUrl()}/api/newsletter/unsubscribe?t=${token}`;
export const confirmPageUrl = (token) => `${siteUrl()}/confirm#${token}`;
