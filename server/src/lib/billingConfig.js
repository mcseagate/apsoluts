import { normalizeCurrency } from "./money.js";

// Everything the invoicing feature reads from the environment, in one place.
// Nothing here has an invented default for a legal or financial fact: the
// business name and address are required to issue an invoice, and the tax note is
// printed only if the owner supplies it.

const env = (name) => (process.env[name] ?? "").trim();

export function billingCurrency() {
  return normalizeCurrency(env("BILLING_CURRENCY") || "USD");
}

// Where the site lives: used for the invoice link in emails and for Stripe's
// return URLs. Must be https in production.
export function siteUrl() {
  const raw = env("SITE_URL") || (process.env.NODE_ENV === "production" ? "https://www.apsoluts.com" : "http://localhost:8000");
  const url = new URL(raw);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("SITE_URL must be an https URL in production.");
  }
  return url.origin;
}

export function invoicePrefix() {
  const prefix = env("INVOICE_PREFIX") || "INV";
  return /^[A-Z0-9]{1,8}$/i.test(prefix) ? prefix.toUpperCase() : "INV";
}

export function defaultDueDays() {
  const n = Number(env("INVOICE_DEFAULT_DUE_DAYS"));
  return Number.isInteger(n) && n >= 0 && n <= 365 ? n : 14;
}

// BUSINESS_ADDRESS is one line in an environment variable; "\n" or "|" marks a
// line break.
function businessAddress() {
  return env("BUSINESS_ADDRESS")
    .split(/\\n|\|/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

export function businessProfile() {
  return {
    legalName: env("BUSINESS_LEGAL_NAME"),
    address: businessAddress(),
    email: env("BUSINESS_EMAIL"),
    phone: env("BUSINESS_PHONE"),
    taxId: env("BUSINESS_TAX_ID"),
    taxNote: env("INVOICE_TAX_NOTE"),
  };
}

// The facts an invoice cannot be issued without. Returns the names of the
// missing variables.
export function missingBusinessDetails() {
  const missing = [];
  if (!env("BUSINESS_LEGAL_NAME")) missing.push("BUSINESS_LEGAL_NAME");
  if (!businessAddress()) missing.push("BUSINESS_ADDRESS");
  if (!env("BUSINESS_EMAIL")) missing.push("BUSINESS_EMAIL");
  return missing;
}

export function invoiceLinkSecret() {
  const secret = env("INVOICE_LINK_SECRET");
  return secret.length >= 32 ? secret : null;
}

// Where administrator notifications go. Matches the newsletter alert's default.
export function adminNotifyAddress() {
  return env("ADMIN_NOTIFY_EMAIL") || env("SMTP_USER") || "contact@apsoluts.com";
}

// Stripe ----------------------------------------------------------------

export function stripeSecretKey() {
  const key = env("STRIPE_SECRET_KEY");
  if (!key) return null;
  if (!/^(sk|rk)_(test|live)_/.test(key)) return null;
  return key;
}

export function stripeIsLiveKey() {
  return /^(sk|rk)_live_/.test(env("STRIPE_SECRET_KEY"));
}

// Live keys are refused unless the owner explicitly turns live payments on, so
// pasting the wrong key cannot start charging real cards.
export function livePaymentsAllowed() {
  return env("STRIPE_ENABLE_LIVE") === "true";
}

export function stripeWebhookSecret() {
  const secret = env("STRIPE_WEBHOOK_SECRET");
  return /^whsec_/.test(secret) ? secret : null;
}

export function paymentsConfigured() {
  if (!stripeSecretKey()) return false;
  if (stripeIsLiveKey() && !livePaymentsAllowed()) return false;
  return true;
}

// A summary for the admin screen: which pieces are set, never their values.
export function billingStatus() {
  const missing = missingBusinessDetails();
  return {
    currency: billingCurrency(),
    businessDetails: { ready: missing.length === 0, missing },
    invoiceLinks: { ready: Boolean(invoiceLinkSecret()) },
    payments: {
      ready: paymentsConfigured(),
      webhookReady: Boolean(stripeWebhookSecret()),
      mode: !stripeSecretKey() ? "unconfigured" : stripeIsLiveKey() ? "live" : "test",
      liveBlocked: Boolean(stripeSecretKey()) && stripeIsLiveKey() && !livePaymentsAllowed(),
    },
    email: { ready: Boolean(env("RESEND_API_KEY") || env("SMTP_PASS")) },
  };
}
