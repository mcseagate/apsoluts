import { Invoice } from "../models/Invoice.js";
import { Payment } from "../models/Payment.js";
import { PaymentEvent } from "../models/PaymentEvent.js";
import { audit } from "../lib/audit.js";
import { conflict, HttpError } from "../lib/http.js";
import { siteUrl, stripeIsLiveKey } from "../lib/billingConfig.js";
import { formatMoney } from "../lib/money.js";
import { notifyAdmin } from "../lib/notify.js";
import { getStripe } from "./stripe.js";

// Payments through Stripe Checkout.
//
// Two rules run through this file:
//   1. The amount, currency and invoice that Stripe is asked to charge come from
//      the database, never from the browser.
//   2. An invoice becomes paid only here, in handleStripeEvent, from an event
//      whose signature was verified by the webhook route. The page the client
//      lands on after paying changes nothing.

const CHECKOUT_LIFETIME_SECONDS = 2 * 60 * 60;
// Another request is allowed to be creating a session for this long before its
// row is treated as abandoned.
const CREATING_GRACE_MS = 60 * 1000;

const logStripeError = (what, err) =>
  // type and code only: the message of a Stripe error can quote request fields.
  console.error(`[Payments] ${what} failed: ${err?.type ?? err?.name ?? "error"} ${err?.code ?? ""}`.trim());

// ---------------------------------------------------------------------------
// Checkout creation

export async function createCheckoutForInvoice(invoice, token) {
  const stripe = getStripe();
  if (!stripe) {
    throw new HttpError(503, "PAYMENTS_NOT_CONFIGURED", "Online payment is not available yet. Please contact us to pay.");
  }
  if (invoice.status === "paid") throw conflict("INVOICE_PAID", "This invoice has already been paid.");
  if (invoice.status === "void") throw conflict("INVOICE_VOID", "This invoice was cancelled and can no longer be paid.");
  if (invoice.status !== "unpaid") throw conflict("INVOICE_NOT_PAYABLE", "This invoice cannot be paid yet.");

  // Earlier attempts first: never leave two payable sessions behind.
  const attempts = await Payment.find({ invoiceId: invoice._id, status: { $in: ["creating", "open", "processing"] } });
  for (const attempt of attempts) {
    if (attempt.status === "processing") {
      throw conflict("PAYMENT_PROCESSING", "A payment for this invoice is already being confirmed. This page will update when it clears.");
    }
    if (attempt.status === "creating") {
      if (Date.now() - attempt.createdAt.getTime() < CREATING_GRACE_MS) {
        throw conflict("CHECKOUT_IN_PROGRESS", "A checkout is already being opened. Please try again in a moment.");
      }
      await Payment.updateOne({ _id: attempt._id, status: "creating" }, { $set: { status: "failed", failureCode: "abandoned" } });
      continue;
    }
    // open: reuse it while Stripe still holds it open.
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(attempt.checkoutSessionId);
    } catch (err) {
      logStripeError("Retrieving a checkout session", err);
      throw new HttpError(502, "PAYMENT_PROVIDER_ERROR", "We could not reach the payment provider. Please try again.");
    }
    if (session.status === "open" && session.url) return { url: session.url, reused: true };
    if (session.status === "complete") {
      // Paid, or being paid; the webhook will settle it. Do not offer a second payment.
      throw conflict("PAYMENT_CONFIRMING", "Your payment was received and is being confirmed. This page will update shortly.");
    }
    await Payment.updateOne({ _id: attempt._id, status: "open" }, { $set: { status: "expired" } });
    await audit("payment", attempt._id, "session_expired", { actor: "system", from: "open", to: "expired", detail: "found expired when a new checkout was requested" });
  }

  const payment = await Payment.create({
    invoiceId: invoice._id,
    amountMinor: invoice.amountMinor,
    currency: invoice.currency,
    livemode: stripeIsLiveKey(),
    status: "creating",
  });

  const metadata = {
    invoiceId: String(invoice._id),
    invoiceNumber: invoice.number,
    paymentId: String(payment._id),
  };
  const base = siteUrl();
  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: String(invoice._id),
        customer_email: invoice.clientEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: invoice.currency.toLowerCase(),
              unit_amount: invoice.amountMinor,
              product_data: {
                name: `Invoice ${invoice.number}`,
                description: `${invoice.projectTitle} - ${invoice.milestoneLabel}`.slice(0, 300),
              },
            },
          },
        ],
        metadata,
        payment_intent_data: { metadata, description: `Invoice ${invoice.number}` },
        success_url: `${base}/invoice?checkout=success#${token}`,
        cancel_url: `${base}/invoice?checkout=canceled#${token}`,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_LIFETIME_SECONDS,
      },
      { idempotencyKey: `checkout-${payment._id}` },
    );
  } catch (err) {
    logStripeError("Creating a checkout session", err);
    await Payment.updateOne({ _id: payment._id }, { $set: { status: "failed", failureCode: "checkout_create_failed" } });
    throw new HttpError(502, "PAYMENT_PROVIDER_ERROR", "We could not start the payment. Please try again in a moment.");
  }

  await Payment.updateOne(
    { _id: payment._id },
    { $set: { checkoutSessionId: session.id, status: "open", expiresAt: new Date(session.expires_at * 1000) } },
  );
  await audit("payment", payment._id, "checkout_created", { actor: "client", to: "open", detail: `invoice ${invoice.number}` });
  return { url: session.url, reused: false };
}

// Closes every open checkout for an invoice (used when it is voided). Throws a
// 409 if one has already been completed or is still clearing, because voiding
// then would leave a payment with nothing to apply to.
export async function closeOpenCheckouts(invoiceId) {
  const attempts = await Payment.find({ invoiceId, status: { $in: ["open", "processing", "creating"] } });
  if (!attempts.length) return;
  if (attempts.some((a) => a.status === "processing")) {
    throw conflict("PAYMENT_PROCESSING", "A payment is being confirmed for this invoice. Wait for it to clear before voiding.");
  }
  if (attempts.some((a) => a.status === "creating" && Date.now() - a.createdAt.getTime() < CREATING_GRACE_MS)) {
    throw conflict("CHECKOUT_IN_PROGRESS", "A client is opening checkout right now. Try again in a moment.");
  }
  const stripe = getStripe();
  for (const attempt of attempts) {
    if (attempt.status === "creating" || !attempt.checkoutSessionId) {
      await Payment.updateOne({ _id: attempt._id }, { $set: { status: "superseded" } });
      continue;
    }
    if (!stripe) throw new HttpError(503, "PAYMENTS_NOT_CONFIGURED", "Stripe is not configured, so open checkouts cannot be closed.");
    try {
      await stripe.checkout.sessions.expire(attempt.checkoutSessionId);
    } catch (err) {
      let session = null;
      try {
        session = await stripe.checkout.sessions.retrieve(attempt.checkoutSessionId);
      } catch (inner) {
        logStripeError("Retrieving a checkout session", inner);
      }
      if (session?.status === "complete") {
        throw conflict("PAYMENT_CONFIRMING", "The client has just paid this invoice. Wait for it to confirm, then handle it as a refund if needed.");
      }
      if (session?.status !== "expired") {
        logStripeError("Expiring a checkout session", err);
        throw new HttpError(502, "PAYMENT_PROVIDER_ERROR", "Could not close the open checkout at Stripe. Try again.");
      }
    }
    await Payment.updateOne({ _id: attempt._id }, { $set: { status: "superseded" } });
    await audit("payment", attempt._id, "session_closed", { actor: "admin", from: attempt.status, to: "superseded", detail: "invoice voided" });
  }
}

// ---------------------------------------------------------------------------
// Webhook events

const flag = (invoiceId, code, detail) =>
  Invoice.updateOne({ _id: invoiceId, "flags.code": { $ne: code } }, { $push: { flags: { code, detail: String(detail).slice(0, 300) } } });

async function findPayment({ sessionId, paymentIntentId, paymentId }) {
  if (sessionId) {
    const p = await Payment.findOne({ checkoutSessionId: sessionId });
    if (p) return p;
  }
  if (paymentIntentId) {
    const p = await Payment.findOne({ paymentIntentId });
    if (p) return p;
  }
  if (paymentId && /^[a-f0-9]{24}$/i.test(paymentId)) return Payment.findById(paymentId);
  return null;
}

const money = (minor, currency) => {
  try {
    return formatMoney(minor, currency);
  } catch {
    return `${minor} ${currency}`;
  }
};

// Applies a verified checkout.session.* event that says the money has arrived.
async function applyCheckoutPaid(event, session) {
  const payment = await findPayment({ sessionId: session.id });
  if (!payment) return { outcome: "ignored", reason: "unknown_session" };
  const invoice = await Invoice.findById(payment.invoiceId);
  if (!invoice) return { outcome: "ignored", reason: "unknown_invoice", payment };

  // Everything Stripe reports must agree with what we stored when we created the
  // session. If any of it differs, nothing is marked paid and a person looks.
  const problems = [];
  if (session.mode !== "payment") problems.push("mode");
  if (session.client_reference_id !== String(invoice._id)) problems.push("client_reference_id");
  if (session.metadata?.invoiceId !== String(invoice._id)) problems.push("metadata.invoiceId");
  if (session.amount_total !== payment.amountMinor || payment.amountMinor !== invoice.amountMinor) problems.push("amount");
  if (String(session.currency).toUpperCase() !== invoice.currency || payment.currency !== invoice.currency) problems.push("currency");
  if (problems.length) {
    await Payment.updateOne({ _id: payment._id }, { $set: { status: "rejected", failureCode: `mismatch:${problems.join(",")}` } });
    await flag(invoice._id, "payment_mismatch", `Stripe event did not match the invoice (${problems.join(", ")}).`);
    await audit("payment", payment._id, "rejected", { actor: "stripe", from: payment.status, to: "rejected", detail: `mismatch: ${problems.join(", ")}` });
    await notifyAdmin(`Payment mismatch on ${invoice.number}`, [
      `Stripe reported a payment for invoice ${invoice.number} that does not match the invoice (${problems.join(", ")}).`,
      "The invoice was NOT marked paid. Check the payment in the Stripe dashboard.",
    ]);
    return { outcome: "rejected", reason: `mismatch:${problems.join(",")}`, invoiceId: invoice._id };
  }

  // checkout.session.completed also fires for delayed methods before the money
  // clears; only payment_status === "paid" means it has.
  if (session.payment_status !== "paid") {
    const set = { status: "processing" };
    if (session.payment_intent) set.paymentIntentId = session.payment_intent;
    const moved = await Payment.updateOne({ _id: payment._id, status: { $in: ["open", "creating"] } }, { $set: set });
    if (moved.modifiedCount) {
      await audit("payment", payment._id, "processing", { actor: "stripe", from: "open", to: "processing", detail: "payment is not yet confirmed" });
    }
    return { outcome: "applied", reason: "awaiting_confirmation", invoiceId: invoice._id };
  }

  const paidAt = new Date();
  const marked = await Invoice.findOneAndUpdate(
    { _id: invoice._id, status: "unpaid" },
    { $set: { status: "paid", paidAt, paidPaymentId: payment._id, paymentIntentId: session.payment_intent ?? null } },
    { returnDocument: "after" },
  );
  if (marked) {
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { status: "paid", paidAt, paymentIntentId: session.payment_intent ?? null } },
    );
    await audit("invoice", invoice._id, "paid", { actor: "stripe", from: "unpaid", to: "paid", detail: `payment ${payment._id}` });
    await audit("payment", payment._id, "paid", { actor: "stripe", from: payment.status, to: "paid" });
    await notifyAdmin(`Payment received: ${invoice.number}`, [
      `${money(invoice.amountMinor, invoice.currency)} was paid on invoice ${invoice.number} (${invoice.projectTitle}).`,
      `Client: ${invoice.clientName}`,
    ]);
    return { outcome: "applied", reason: "paid", invoiceId: invoice._id };
  }

  // The invoice is not unpaid any more.
  const current = await Invoice.findById(invoice._id);
  if (current.status === "paid" && String(current.paidPaymentId) === String(payment._id)) {
    return { outcome: "ignored", reason: "already_paid", invoiceId: invoice._id }; // a redelivery
  }
  // The money did arrive, so the payment row says so, but the invoice cannot take it.
  await Payment.updateOne(
    { _id: payment._id },
    { $set: { status: "paid", paidAt, paymentIntentId: session.payment_intent ?? null } },
  );
  const code = current.status === "void" ? "paid_after_void" : "duplicate_payment";
  const detail = code === "paid_after_void" ? "Paid after the invoice was voided." : "A second payment arrived for an invoice that was already paid.";
  await flag(invoice._id, code, detail);
  await audit("payment", payment._id, code, { actor: "stripe", from: payment.status, to: "paid", detail });
  await notifyAdmin(`Action needed: ${code === "paid_after_void" ? "payment on a voided invoice" : "duplicate payment"} (${invoice.number})`, [
    `${money(payment.amountMinor, payment.currency)} was collected for invoice ${invoice.number}, but the invoice is ${current.status}.`,
    "The invoice status was not changed. Refund the extra payment in the Stripe dashboard.",
  ]);
  return { outcome: "applied", reason: code, invoiceId: invoice._id };
}

async function applyCheckoutClosed(event, session, to, reason) {
  const payment = await findPayment({ sessionId: session.id });
  if (!payment) return { outcome: "ignored", reason: "unknown_session" };
  const moved = await Payment.updateOne(
    { _id: payment._id, status: { $in: ["open", "creating", "processing"] } },
    { $set: { status: to, failureCode: reason } },
  );
  if (moved.modifiedCount) {
    await audit("payment", payment._id, reason, { actor: "stripe", from: payment.status, to, detail: "invoice stays unpaid" });
    if (to === "failed") {
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        await notifyAdmin(`Payment failed: ${invoice.number}`, [
          `A delayed payment for invoice ${invoice.number} did not clear. The invoice is still unpaid.`,
        ]);
      }
    }
  }
  return { outcome: "applied", reason, invoiceId: payment.invoiceId };
}

// A card was declined or similar. The customer can retry inside the same
// checkout session, so the payment stays open; we only record why.
async function applyPaymentFailed(event, intent) {
  const payment = await findPayment({ paymentIntentId: intent.id, paymentId: intent.metadata?.paymentId });
  if (!payment) return { outcome: "ignored", reason: "unknown_payment_intent" };
  const code = intent.last_payment_error?.decline_code || intent.last_payment_error?.code || "payment_failed";
  await Payment.updateOne({ _id: payment._id }, { $set: { failureCode: String(code).slice(0, 60), paymentIntentId: intent.id } });
  await audit("payment", payment._id, "attempt_failed", { actor: "stripe", from: payment.status, to: payment.status, detail: String(code).slice(0, 60) });
  return { outcome: "applied", reason: "attempt_failed", invoiceId: payment.invoiceId };
}

async function applyRefund(event, charge) {
  const payment = await findPayment({ paymentIntentId: charge.payment_intent, paymentId: charge.metadata?.paymentId });
  if (!payment) return { outcome: "ignored", reason: "unknown_charge" };
  if (String(charge.currency).toUpperCase() !== payment.currency) {
    return { outcome: "rejected", reason: "currency_mismatch", invoiceId: payment.invoiceId };
  }
  const invoice = await Invoice.findById(payment.invoiceId);
  if (!invoice || invoice.status !== "paid") {
    // A refund on something we never recorded as paid: keep the facts, change nothing.
    await audit("payment", payment._id, "refund_on_unpaid", { actor: "stripe", detail: `refunded ${charge.amount_refunded}` });
    return { outcome: "ignored", reason: "invoice_not_paid", invoiceId: payment.invoiceId };
  }
  const refunded = Math.min(Number(charge.amount_refunded) || 0, invoice.amountMinor);
  const full = refunded >= invoice.amountMinor;
  const to = full ? "refunded" : "partially_refunded";
  // Set, not add: a redelivered event carries the same total.
  await Payment.updateOne({ _id: payment._id }, { $set: { status: to, refundedMinor: refunded, chargeId: charge.id } });
  await Invoice.updateOne(
    { _id: invoice._id },
    { $set: { refundedMinor: refunded, ...(full ? { active: false } : {}) } },
  );
  await flag(invoice._id, "refunded", `${money(refunded, invoice.currency)} refunded.`);
  await audit("invoice", invoice._id, "refunded", { actor: "stripe", from: String(invoice.refundedMinor), to: String(refunded), detail: full ? "refunded in full" : "partial refund" });
  await notifyAdmin(`Refund recorded: ${invoice.number}`, [
    `${money(refunded, invoice.currency)} of ${money(invoice.amountMinor, invoice.currency)} was refunded on invoice ${invoice.number}.`,
    "The invoice stays marked paid; the refund is shown beside it.",
  ]);
  return { outcome: "applied", reason: to, invoiceId: invoice._id };
}

async function applyDispute(event, dispute) {
  const payment = await findPayment({ paymentIntentId: dispute.payment_intent });
  if (!payment) return { outcome: "ignored", reason: "unknown_dispute_payment" };
  const invoice = await Invoice.findById(payment.invoiceId);
  if (!invoice) return { outcome: "ignored", reason: "unknown_invoice" };
  const status = String(dispute.status || "unknown").slice(0, 40);
  await Invoice.updateOne({ _id: invoice._id }, { $set: { disputeStatus: status } });
  await flag(invoice._id, "disputed", `Dispute ${status}.`);
  await audit("invoice", invoice._id, event.type === "charge.dispute.closed" ? "dispute_closed" : "dispute", {
    actor: "stripe",
    to: status,
    detail: `reason: ${String(dispute.reason || "unknown").slice(0, 60)}`,
  });
  await notifyAdmin(`Dispute ${status}: ${invoice.number}`, [
    `A card dispute on invoice ${invoice.number} is now "${status}".`,
    "The invoice status was not changed. Respond to the dispute in the Stripe dashboard.",
  ]);
  return { outcome: "applied", reason: `dispute_${status}`, invoiceId: invoice._id };
}

async function applyEvent(event) {
  const object = event.data?.object ?? {};
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return applyCheckoutPaid(event, object);
    case "checkout.session.async_payment_failed":
      return applyCheckoutClosed(event, object, "failed", "async_payment_failed");
    case "checkout.session.expired":
      return applyCheckoutClosed(event, object, "expired", "session_expired");
    case "payment_intent.payment_failed":
      return applyPaymentFailed(event, object);
    case "charge.refunded":
      return applyRefund(event, object);
    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed":
      return applyDispute(event, object);
    default:
      return { outcome: "ignored", reason: "unhandled_type" };
  }
}

// Entry point for a verified event. Safe to call any number of times with the
// same event: the first call records and applies it, later ones do nothing.
// A throw means "not applied"; the route answers 500 and Stripe retries.
export async function handleStripeEvent(event) {
  let previous;
  try {
    previous = await PaymentEvent.findOneAndUpdate(
      { eventId: event.id },
      { $setOnInsert: { provider: "stripe", eventId: event.id, type: event.type, livemode: Boolean(event.livemode), receivedAt: new Date() } },
      { upsert: true, returnDocument: "before" },
    );
  } catch (err) {
    if (err?.code === 11000) throw new Error("Event is being processed by another request."); // retry later
    throw err;
  }
  if (previous?.processedAt) return { outcome: "duplicate", reason: "already_processed" };

  // A test-mode event must never touch a live-mode setup, or the reverse.
  let result;
  if (Boolean(event.livemode) !== stripeIsLiveKey()) {
    result = { outcome: "rejected", reason: "livemode_mismatch" };
  } else {
    result = await applyEvent(event);
  }

  await PaymentEvent.updateOne(
    { eventId: event.id },
    { $set: { outcome: result.outcome, reason: result.reason ?? "", invoiceId: result.invoiceId ?? null, processedAt: new Date() } },
  );
  return result;
}
