import Stripe from "stripe";
import { livePaymentsAllowed, stripeIsLiveKey, stripeSecretKey, stripeWebhookSecret } from "../lib/billingConfig.js";

// The one place a Stripe client is built. The secret key is read here, on the
// server, and is never put in a response, a log line or an error message.

let override = null;
let cached = null;

// Tests point the SDK at a local fake Stripe server (or a stub).
export function __setStripeForTests(client) {
  override = client;
  cached = null;
}

export function getStripe() {
  if (override) return override;
  if (cached) return cached;
  const key = stripeSecretKey();
  if (!key) return null;
  if (stripeIsLiveKey() && !livePaymentsAllowed()) return null;
  cached = new Stripe(key, { maxNetworkRetries: 1, timeout: 20_000 });
  return cached;
}

export { stripeWebhookSecret };
