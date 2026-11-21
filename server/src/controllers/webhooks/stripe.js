import { HttpError } from "../../lib/http.js";
import { getStripe, stripeWebhookSecret } from "../../services/stripe.js";
import { handleStripeEvent } from "../../services/payments.js";

// Stripe's only way in. The body is read as the exact text Stripe signed, and
// nothing is believed until the signature checks out against the webhook secret.
// Answering 2xx tells Stripe to stop retrying; any failure to apply an event
// answers 500 so Stripe delivers it again.

const MAX_BYTES = 1024 * 1024;

export async function stripeWebhook(c) {
  const stripe = getStripe();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) {
    console.error("[Webhook] Stripe is not configured (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET); rejecting.");
    return c.json({ error: { message: "Webhook is not configured.", code: "NOT_CONFIGURED" } }, 503);
  }

  const signature = c.req.header("stripe-signature");
  if (!signature) return c.json({ error: { message: "Missing signature.", code: "INVALID_SIGNATURE" } }, 400);

  const raw = await c.req.text();
  if (Buffer.byteLength(raw) > MAX_BYTES) return c.json({ error: { message: "Payload too large.", code: "PAYLOAD_TOO_LARGE" } }, 413);

  let event;
  try {
    // The third argument is how old a signature may be, in seconds: a captured
    // request cannot be replayed later.
    event = stripe.webhooks.constructEvent(raw, signature, secret, 300);
  } catch {
    // Neither the payload nor the signature header is logged.
    console.warn("[Webhook] Rejected a request with an invalid signature.");
    return c.json({ error: { message: "Invalid signature.", code: "INVALID_SIGNATURE" } }, 400);
  }

  try {
    const result = await handleStripeEvent(event);
    console.log(`[Webhook] ${event.type} ${event.id}: ${result.outcome}${result.reason ? ` (${result.reason})` : ""}`);
    return c.json({ received: true, outcome: result.outcome, reason: result.reason ?? null });
  } catch (err) {
    console.error(`[Webhook] ${event.type} ${event.id} failed to apply: ${err instanceof HttpError ? err.code : err?.name}: ${err?.message}`);
    return c.json({ error: { message: "Could not apply event.", code: "PROCESSING_ERROR" } }, 500);
  }
}
