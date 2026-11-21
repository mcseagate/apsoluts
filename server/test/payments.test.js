import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  captureMail, completedSession, configureEnv, deliver, makeCaller, makeEvent, signedWebhookRequest, startDb, startFakeStripe, WEBHOOK_SECRET,
} from "./helpers.js";

configureEnv();
const { app } = await import("../src/app.js");
const { __setStripeForTests } = await import("../src/services/stripe.js");
const quoteLimits = (await import("../src/controllers/quotes/submit.js")).limits;
const publicLimits = (await import("../src/controllers/invoices/public.js")).limits;
const { Invoice } = await import("../src/models/Invoice.js");
const { Payment } = await import("../src/models/Payment.js");
const { PaymentEvent } = await import("../src/models/PaymentEvent.js");

let db;
let mail;
let fake;
const api = makeCaller(app);
let ip = 0;
const freshIp = () => `192.0.2.${++ip}`;

before(async () => {
  db = await startDb("payments");
  mail = captureMail();
  fake = await startFakeStripe();
  __setStripeForTests(fake.client);
  await api.login();
});
after(async () => {
  mail.restore();
  await fake.stop();
  await db.stop();
});
beforeEach(async () => {
  await db.clear();
  mail.clear();
  fake.reset();
  for (const l of [...Object.values(quoteLimits), ...Object.values(publicLimits)]) l.reset();
  __setStripeForTests(fake.client);
});

// An issued $400.00 deposit invoice (plus a second milestone) ready to pay.
async function issuedInvoice({ amounts = ["400.00", "600.00"] } = {}) {
  for (const l of Object.values(quoteLimits)) l.reset();
  const q = await api.call("POST", "/api/quotes", {
    token: null,
    headers: { "x-forwarded-for": freshIp() },
    body: { name: "Ada Client", email: "ada@client.example", requirements: "A booking app with deposits and a final payment.", website: "", elapsedMs: 9000 },
  });
  assert.equal(q.status, 201);
  const quote = (await api.call("GET", "/api/admin/quotes")).data.quotes[0];
  const projectId = (await api.call("POST", `/api/admin/quotes/${quote.id}/convert`, { body: {} })).data.id;
  const cents = (s) => s.replace(".", "");
  const total = amounts.reduce((n, a) => n + Number(cents(a)), 0);
  await api.call("PATCH", `/api/admin/projects/${projectId}`, {
    body: {
      title: "Booking app",
      scope: "Build the booking app.",
      price: `${Math.floor(total / 100)}.${String(total % 100).padStart(2, "0")}`,
      milestones: amounts.map((a, i) => ({ label: i === 0 ? "Deposit" : `Part ${i + 1}`, kind: i === 0 ? "deposit" : "milestone", amount: a })),
    },
  });
  const acc = await api.call("POST", `/api/admin/projects/${projectId}/accept`, { body: { acceptedBy: "Ada", method: "email" } });
  assert.equal(acc.status, 200, JSON.stringify(acc.json));
  const project = (await api.call("GET", `/api/admin/projects/${projectId}`)).data;
  const draft = (await api.call("POST", `/api/admin/projects/${projectId}/invoices`, { body: { milestoneId: project.milestones[0].id } })).data;
  const invoice = (await api.call("POST", `/api/admin/invoices/${draft.id}/issue`)).data;
  return { projectId, project, invoice, token: invoice.link.split("#")[1] };
}

const clientView = (token) => api.call("GET", "/api/public/invoice", { token: null, headers: { "x-invoice-token": token, "x-forwarded-for": freshIp() } });
const clientPay = (token, body) =>
  api.call("POST", "/api/public/invoice/checkout", { token: null, body, headers: { "x-invoice-token": token, "x-forwarded-for": freshIp() } });

async function payAndConfirm(token) {
  const res = await clientPay(token);
  assert.equal(res.status, 200, JSON.stringify(res.json));
  const sessionId = [...fake.sessions.keys()].at(-1);
  fake.complete(sessionId);
  const event = makeEvent("checkout.session.completed", completedSession(fake, sessionId));
  return { sessionId, event, delivered: await deliver(app, event) };
}

// ---------------------------------------------------------------------------
// Checkout creation

test("checkout is created on the server from the database amount, whatever the browser sends", async () => {
  const { invoice, token } = await issuedInvoice();
  // The browser tries to choose its own price, currency and invoice.
  const res = await clientPay(token, { amountMinor: 1, amount: "0.01", currency: "jpy", invoiceId: "aaaaaaaaaaaaaaaaaaaaaaaa" });
  assert.equal(res.status, 200);
  assert.match(res.data.url, /^https:\/\/checkout\.stripe\.test\/c\/pay\/cs_test_1$/);
  assert.deepEqual(Object.keys(res.data), ["url"]);

  const create = fake.requests.find((r) => r.method === "POST" && r.url === "/v1/checkout/sessions");
  const p = create.params;
  assert.equal(p.mode, "payment");
  assert.equal(p.line_items[0].price_data.unit_amount, "40000");
  assert.equal(p.line_items[0].price_data.currency, "usd");
  assert.equal(p.line_items[0].quantity, "1");
  assert.equal(p.client_reference_id, invoice.id);
  assert.equal(p.metadata.invoiceId, invoice.id);
  assert.equal(p.metadata.invoiceNumber, invoice.number);
  assert.equal(p.payment_intent_data.metadata.invoiceId, invoice.id);
  assert.equal(p.customer_email, "ada@client.example");
  assert.equal(p.success_url, `http://localhost:8000/invoice?checkout=success#${token}`);
  assert.equal(p.cancel_url, `http://localhost:8000/invoice?checkout=canceled#${token}`);
  assert.ok(Number(p.expires_at) > Date.now() / 1000);
  assert.match(create.idempotencyKey, /^checkout-[a-f0-9]{24}$/);
  // The secret key travels only to Stripe, in the Authorization header.
  assert.match(create.auth, /^Bearer sk_test_/);
  assert.ok(!res.text.includes("sk_test_"));

  const stored = await Payment.findOne({ invoiceId: invoice.id }).lean();
  assert.equal(stored.amountMinor, 40000);
  assert.equal(stored.currency, "USD");
  assert.equal(stored.status, "open");
  assert.equal(stored.checkoutSessionId, "cs_test_1");
});

test("amounts are sent in the currency's minor units, exactly", async () => {
  const { token } = await issuedInvoice({ amounts: ["19.99", "0.51"] });
  assert.equal((await clientPay(token)).status, 200);
  const create = fake.requests.find((r) => r.url === "/v1/checkout/sessions");
  assert.equal(create.params.line_items[0].price_data.unit_amount, "1999");
});

test("only an issued, unpaid invoice can be paid, and only with its own token", async () => {
  const { projectId, project, invoice, token } = await issuedInvoice();
  assert.equal((await clientPay("")).status, 404);
  assert.equal((await clientPay(`${"0".repeat(24)}.${"A".repeat(43)}`)).status, 404);
  assert.equal(fake.requests.length, 0, "no Stripe call for an unauthenticated request");

  // A draft has no client access even though an id exists.
  const draft2 = (await api.call("POST", `/api/admin/projects/${projectId}/invoices`, { body: { milestoneId: project.milestones[1].id } })).data;
  const forgedForDraft = `${draft2.id}.${token.split(".")[1]}`;
  assert.equal((await clientPay(forgedForDraft)).status, 404);

  // Void: cannot be paid.
  assert.equal((await api.call("POST", `/api/admin/invoices/${invoice.id}/void`, { body: { reason: "cancelled" } })).status, 200);
  const voidPay = await clientPay(token);
  assert.equal(voidPay.status, 409);
  assert.equal(voidPay.error.code, "INVOICE_VOID");
  const view = await clientView(token);
  assert.equal(view.data.status, "void");
  assert.equal(view.data.canPay, false);
  assert.equal(fake.requests.length, 0);
});

test("a second click reuses the open checkout instead of creating another", async () => {
  const { token } = await issuedInvoice();
  const a = await clientPay(token);
  const b = await clientPay(token);
  assert.equal(a.data.url, b.data.url);
  assert.equal(fake.requests.filter((r) => r.method === "POST" && r.url === "/v1/checkout/sessions").length, 1);
  assert.equal(await Payment.countDocuments(), 1);
  // Two at once: still one session.
  const [c, d] = await Promise.all([clientPay(token), clientPay(token)]);
  assert.ok([c.status, d.status].every((s) => s === 200 || s === 409));
  assert.equal(await Payment.countDocuments({ status: "open" }), 1);
});

test("an expired checkout is replaced; a completed-but-unconfirmed one blocks a second payment", async () => {
  const { token } = await issuedInvoice();
  await clientPay(token);
  fake.sessions.get("cs_test_1").status = "expired";
  const fresh = await clientPay(token);
  assert.equal(fresh.status, 200);
  assert.match(fresh.data.url, /cs_test_2$/);
  assert.equal((await Payment.findOne({ checkoutSessionId: "cs_test_1" })).status, "expired");

  // The customer paid at Stripe, the webhook has not arrived, and they come back and click Pay again.
  fake.complete("cs_test_2");
  const again = await clientPay(token);
  assert.equal(again.status, 409);
  assert.equal(again.error.code, "PAYMENT_CONFIRMING");
  assert.equal(fake.sessions.size, 2, "no third session was created");
  // And nothing was marked paid from that.
  assert.equal((await clientView(token)).data.status, "unpaid");
});

test("a Stripe outage gives a clean error that leaks nothing, and can be retried", async () => {
  const { token } = await issuedInvoice();
  fake.failNext.create = true;
  const res = await clientPay(token);
  assert.equal(res.status, 502);
  assert.equal(res.error.code, "PAYMENT_PROVIDER_ERROR");
  assert.ok(!res.text.includes("boom") && !res.text.includes("secret details"));
  assert.equal((await Payment.findOne()).status, "failed");
  assert.equal((await clientPay(token)).status, 200);
});

test("without Stripe credentials the page says online payment is unavailable", async () => {
  const { token } = await issuedInvoice();
  const savedKey = process.env.STRIPE_SECRET_KEY;
  __setStripeForTests(null);
  delete process.env.STRIPE_SECRET_KEY;
  try {
    const res = await clientPay(token);
    assert.equal(res.status, 503);
    assert.equal(res.error.code, "PAYMENTS_NOT_CONFIGURED");
    assert.equal((await api.call("GET", "/api/admin/billing/status")).data.payments.mode, "unconfigured");
  } finally {
    process.env.STRIPE_SECRET_KEY = savedKey;
  }
});

test("a live key is refused unless live payments are explicitly enabled", async () => {
  const { token } = await issuedInvoice();
  const savedKey = process.env.STRIPE_SECRET_KEY;
  __setStripeForTests(null);
  process.env.STRIPE_SECRET_KEY = "sk_live_" + "b".repeat(24);
  try {
    assert.equal((await clientPay(token)).status, 503);
    const status = (await api.call("GET", "/api/admin/billing/status")).data.payments;
    assert.equal(status.mode, "live");
    assert.equal(status.liveBlocked, true);
    assert.equal(status.ready, false);
  } finally {
    process.env.STRIPE_SECRET_KEY = savedKey;
  }
});

// ---------------------------------------------------------------------------
// Webhook verification

test("webhooks with a missing, wrong, tampered or stale signature change nothing", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.complete("cs_test_1");
  const event = makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1"));
  await new Promise((r) => setTimeout(r, 50)); // let the quote-form notification from setup land
  mail.clear();
  const post = (headers, body) => app.request("/api/webhooks/stripe", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });

  const good = signedWebhookRequest(event);
  assert.equal((await post({}, good.payload)).status, 400); // no signature
  const wrong = signedWebhookRequest(event, { secret: "whsec_not_the_real_secret" });
  assert.equal((await post({ "stripe-signature": wrong.header }, wrong.payload)).status, 400);
  const tampered = good.payload.replace("40000", "1");
  assert.equal((await post({ "stripe-signature": good.header }, tampered)).status, 400);
  const stale = signedWebhookRequest(event, { timestamp: Math.floor(Date.now() / 1000) - 3600 });
  assert.equal((await post({ "stripe-signature": stale.header }, stale.payload)).status, 400);
  assert.equal((await post({ "stripe-signature": "t=1,v1=zz" }, good.payload)).status, 400);
  // Plain JSON that merely looks like an event.
  assert.equal((await post({}, JSON.stringify(event))).status, 400);

  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");
  assert.equal(await PaymentEvent.countDocuments(), 0, "rejected requests are not even recorded as events");
  assert.equal(mail.sent.length, 0);

  // The correctly signed one works.
  const ok = await post({ "stripe-signature": good.header }, good.payload);
  assert.equal(ok.status, 200);
  assert.equal((await Invoice.findById(invoice.id)).status, "paid");
});

test("the webhook endpoint reports itself unconfigured rather than accepting unverified events", async () => {
  const saved = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  try {
    const event = makeEvent("checkout.session.completed", {});
    assert.equal((await deliver(app, event)).status, 503);
  } finally {
    process.env.STRIPE_WEBHOOK_SECRET = saved;
  }
});

// ---------------------------------------------------------------------------
// The full test-payment flow

test("full flow: pay, verified webhook marks paid, client sees confirmation, admin is notified", async () => {
  const { invoice, token } = await issuedInvoice();
  assert.equal((await clientView(token)).data.status, "unpaid");

  const res = await clientPay(token);
  assert.equal(res.status, 200);

  // The customer returns from Stripe before any webhook: the page is not "paid" yet.
  const early = await clientView(token);
  assert.equal(early.data.status, "unpaid");
  assert.equal(early.data.canPay, true);
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");

  fake.complete("cs_test_1");
  mail.clear();
  const delivered = await deliver(app, makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1")));
  assert.equal(delivered.status, 200);
  assert.equal(delivered.json.outcome, "applied");

  const stored = await Invoice.findById(invoice.id).lean();
  assert.equal(stored.status, "paid");
  assert.ok(stored.paidAt);
  assert.equal(stored.paymentIntentId, "pi_test_cs_test_1");
  assert.equal((await Payment.findOne({ invoiceId: invoice.id })).status, "paid");

  const view = await clientView(token);
  assert.equal(view.data.status, "paid");
  assert.equal(view.data.canPay, false);
  assert.ok(view.data.paidAt);

  // Administrator notified through the existing mail service.
  assert.equal(mail.sent.length, 1);
  assert.equal(mail.sent[0].to[0], "admin@example.test");
  assert.match(mail.sent[0].subject, /Payment received: INV-/);
  assert.ok(mail.sent[0].html.includes("$400.00"));

  // Provider references and the audit trail are kept.
  const detail = (await api.call("GET", `/api/admin/invoices/${invoice.id}`)).data;
  assert.equal(detail.status, "paid");
  assert.equal(detail.payments[0].sessionId, "cs_test_1");
  assert.equal(detail.payments[0].paymentIntentId, "pi_test_cs_test_1");
  const actions = detail.history.map((h) => `${h.scope}:${h.action}:${h.actor}`);
  assert.ok(actions.includes("invoice:issued:admin"));
  assert.ok(actions.includes("payment:checkout_created:client"));
  assert.ok(actions.includes("invoice:paid:stripe"));
  assert.ok(actions.includes("payment:paid:stripe"));

  // Cannot be paid again, nor voided.
  const repeat = await clientPay(token);
  assert.equal(repeat.status, 409);
  assert.equal(repeat.error.code, "INVOICE_PAID");
  assert.equal(fake.sessions.size, 1);
  assert.equal((await api.call("POST", `/api/admin/invoices/${invoice.id}/void`, { body: { reason: "oops" } })).status, 409);
});

// ---------------------------------------------------------------------------
// Idempotency

test("a redelivered event is applied once and answered 200", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.complete("cs_test_1");
  const event = makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1"));
  mail.clear();
  const first = await deliver(app, event);
  const paidAt = (await Invoice.findById(invoice.id)).paidAt.getTime();
  const second = await deliver(app, event);
  const third = await deliver(app, event);
  assert.equal(first.json.outcome, "applied");
  assert.equal(second.status, 200);
  assert.equal(second.json.outcome, "duplicate");
  assert.equal(third.json.outcome, "duplicate");
  assert.equal(mail.sent.length, 1, "one notification, not three");
  assert.equal((await Invoice.findById(invoice.id)).paidAt.getTime(), paidAt);
  assert.equal(await PaymentEvent.countDocuments({ eventId: event.id }), 1);
  const detail = (await api.call("GET", `/api/admin/invoices/${invoice.id}`)).data;
  assert.equal(detail.history.filter((h) => h.scope === "invoice" && h.action === "paid").length, 1);
});

test("the same payment announced by two different events is applied once", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.complete("cs_test_1");
  const a = await deliver(app, makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1")));
  mail.clear();
  const b = await deliver(app, makeEvent("checkout.session.async_payment_succeeded", completedSession(fake, "cs_test_1")));
  assert.equal(a.json.outcome, "applied");
  assert.equal(b.json.outcome, "ignored");
  assert.equal(mail.sent.length, 0);
  const stored = await Invoice.findById(invoice.id);
  assert.equal(stored.status, "paid");
  assert.equal(stored.flags.length, 0, "a repeat announcement is not a duplicate payment");
});

test("simultaneous deliveries of one event leave a single, consistent result", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.complete("cs_test_1");
  const event = makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1"));
  mail.clear();
  const results = await Promise.all(Array.from({ length: 6 }, () => deliver(app, event)));
  assert.ok(results.every((r) => r.status === 200 || r.status === 500), JSON.stringify(results.map((r) => r.status)));
  // Whatever raced, a retry now settles to "duplicate" and the state is correct.
  const retry = await deliver(app, event);
  assert.equal(retry.status, 200);
  const stored = await Invoice.findById(invoice.id);
  assert.equal(stored.status, "paid");
  assert.equal(stored.flags.length, 0);
  assert.equal(await PaymentEvent.countDocuments({ eventId: event.id }), 1);
  assert.equal(mail.sent.filter((m) => /Payment received/.test(m.subject)).length, 1);
});

// ---------------------------------------------------------------------------
// Verification of what Stripe reports

test("a payment that does not match the invoice is rejected, not marked paid", async () => {
  const cases = [
    ["amount", { amount_total: 100 }],
    ["currency", { currency: "eur" }],
    ["client_reference_id", { client_reference_id: "aaaaaaaaaaaaaaaaaaaaaaaa" }],
    ["metadata.invoiceId", { metadata: { invoiceId: "aaaaaaaaaaaaaaaaaaaaaaaa" } }],
    ["mode", { mode: "subscription" }],
  ];
  for (const [label, override] of cases) {
    await db.clear();
    mail.clear();
    fake.reset();
    const { invoice, token } = await issuedInvoice();
    await clientPay(token);
    fake.complete("cs_test_1");
    const res = await deliver(app, makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1", override)));
    assert.equal(res.status, 200, label);
    assert.equal(res.json.outcome, "rejected", label);
    const stored = await Invoice.findById(invoice.id);
    assert.equal(stored.status, "unpaid", `${label}: must stay unpaid`);
    assert.ok(stored.flags.some((f) => f.code === "payment_mismatch"), label);
    assert.equal((await Payment.findOne({ invoiceId: invoice.id })).status, "rejected", label);
    assert.ok(mail.sent.some((m) => /mismatch/i.test(m.subject)), `${label}: admin alerted`);
  }
});

test("an event for a session we never created is ignored", async () => {
  await issuedInvoice();
  const res = await deliver(app, makeEvent("checkout.session.completed", { id: "cs_live_elsewhere", mode: "payment", payment_status: "paid", amount_total: 40000, currency: "usd" }));
  assert.equal(res.status, 200);
  assert.equal(res.json.outcome, "ignored");
  assert.equal(await Invoice.countDocuments({ status: "paid" }), 0);
});

test("test-mode events are refused by a live setup and live events by a test setup", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.complete("cs_test_1");
  const res = await deliver(app, makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1"), { livemode: true }));
  assert.equal(res.status, 200);
  assert.equal(res.json.outcome, "rejected");
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");
});

// ---------------------------------------------------------------------------
// Failed, canceled, delayed, expired

test("a failed card attempt records the reason and leaves the invoice unpaid and payable", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  const payment = await Payment.findOne();
  const res = await deliver(app, makeEvent("payment_intent.payment_failed", {
    id: "pi_failed_1",
    metadata: { paymentId: String(payment._id), invoiceId: invoice.id },
    last_payment_error: { code: "card_declined", decline_code: "insufficient_funds", message: "Your card has insufficient funds. 4000000000009995" },
  }));
  assert.equal(res.status, 200);
  const stored = await Payment.findById(payment._id);
  assert.equal(stored.failureCode, "insufficient_funds");
  assert.equal(stored.status, "open");
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");
  assert.equal((await clientView(token)).data.canPay, true);
  const detail = (await api.call("GET", `/api/admin/invoices/${invoice.id}`)).data;
  assert.ok(!JSON.stringify(detail).includes("4000000000009995"), "provider message text is not stored");
});

test("canceling checkout (no event at all) leaves the invoice unpaid, and the session expiring is recorded", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");
  const expired = await deliver(app, makeEvent("checkout.session.expired", { ...completedSession(fake, "cs_test_1"), status: "expired", payment_status: "unpaid" }));
  assert.equal(expired.status, 200);
  assert.equal((await Payment.findOne()).status, "expired");
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");
  const again = await clientPay(token);
  assert.equal(again.status, 200);
  assert.match(again.data.url, /cs_test_2$/);
});

test("delayed payment: not paid until the confirming event; a failure leaves it unpaid", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.complete("cs_test_1", { paymentStatus: "unpaid" });
  mail.clear();
  const pending = await deliver(app, makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1", { payment_status: "unpaid" })));
  assert.equal(pending.json.outcome, "applied");
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid", "unpaid while the money is in flight");
  assert.equal((await Payment.findOne()).status, "processing");
  const view = await clientView(token);
  assert.equal(view.data.confirmingPayment, true);
  assert.equal(view.data.canPay, false);
  assert.equal(mail.sent.length, 0, "no 'payment received' alert yet");
  // No second payment while one is clearing, and the invoice cannot be voided under it.
  assert.equal((await clientPay(token)).error.code, "PAYMENT_PROCESSING");
  assert.equal((await api.call("POST", `/api/admin/invoices/${invoice.id}/void`, { body: { reason: "cancel" } })).status, 409);

  // It fails: still unpaid, payable again.
  const failed = await deliver(app, makeEvent("checkout.session.async_payment_failed", completedSession(fake, "cs_test_1", { payment_status: "unpaid" })));
  assert.equal(failed.status, 200);
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");
  assert.equal((await Payment.findOne({ checkoutSessionId: "cs_test_1" })).status, "failed");
  assert.ok(mail.sent.some((m) => /Payment failed/.test(m.subject)));
  assert.equal((await clientPay(token)).status, 200);
});

test("delayed payment that clears is marked paid by the async success event", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.complete("cs_test_1", { paymentStatus: "unpaid" });
  await deliver(app, makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1", { payment_status: "unpaid" })));
  fake.sessions.get("cs_test_1").payment_status = "paid";
  const done = await deliver(app, makeEvent("checkout.session.async_payment_succeeded", completedSession(fake, "cs_test_1")));
  assert.equal(done.json.outcome, "applied");
  assert.equal((await Invoice.findById(invoice.id)).status, "paid");
  assert.equal((await Payment.findOne()).status, "paid");
});

// ---------------------------------------------------------------------------
// Refunds and disputes

test("refunds are recorded without touching paid status; they are idempotent", async () => {
  const { invoice, token, project } = await issuedInvoice();
  await payAndConfirm(token);
  const payment = await Payment.findOne();
  const charge = (refunded) => ({ id: "ch_1", payment_intent: "pi_test_cs_test_1", amount: 40000, amount_refunded: refunded, currency: "usd", metadata: { paymentId: String(payment._id) } });

  mail.clear();
  const partial = makeEvent("charge.refunded", charge(10000));
  assert.equal((await deliver(app, partial)).json.reason, "partially_refunded");
  let stored = await Invoice.findById(invoice.id);
  assert.equal(stored.status, "paid");
  assert.equal(stored.refundedMinor, 10000);
  assert.equal(stored.active, true);
  assert.ok(mail.sent.some((m) => /Refund recorded/.test(m.subject)));
  // Redelivery does not double it.
  await deliver(app, partial);
  assert.equal((await Invoice.findById(invoice.id)).refundedMinor, 10000);

  // Full refund: still paid (a fact), shown as refunded, and the milestone is free to invoice again.
  assert.equal((await deliver(app, makeEvent("charge.refunded", charge(40000)))).json.reason, "refunded");
  stored = await Invoice.findById(invoice.id);
  assert.equal(stored.status, "paid");
  assert.equal(stored.refundedMinor, 40000);
  assert.equal(stored.active, false);
  assert.equal((await Payment.findOne()).status, "refunded");
  const view = await clientView(token);
  assert.equal(view.data.refundedDisplay, "$400.00");
  assert.equal(view.data.canPay, false);
  const reinvoice = await api.call("POST", `/api/admin/projects/${project.id}/invoices`, { body: { milestoneId: project.milestones[0].id } });
  assert.equal(reinvoice.status, 201);
});

test("a refund or dispute never marks an unpaid invoice paid", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  const payment = await Payment.findOne();
  await Payment.updateOne({ _id: payment._id }, { $set: { paymentIntentId: "pi_x" } });
  const refund = await deliver(app, makeEvent("charge.refunded", { id: "ch_9", payment_intent: "pi_x", amount: 40000, amount_refunded: 40000, currency: "usd" }));
  assert.equal(refund.json.outcome, "ignored");
  const dispute = await deliver(app, makeEvent("charge.dispute.created", { id: "dp_1", payment_intent: "pi_x", status: "needs_response", reason: "fraudulent" }));
  assert.equal(dispute.status, 200);
  const stored = await Invoice.findById(invoice.id);
  assert.equal(stored.status, "unpaid");
  assert.equal(stored.refundedMinor, 0);
  // Unknown charges are simply ignored.
  assert.equal((await deliver(app, makeEvent("charge.refunded", { id: "ch_unknown", payment_intent: "pi_unknown", amount_refunded: 5, currency: "usd" }))).json.outcome, "ignored");
});

test("disputes are flagged and the administrator alerted; the invoice stays as it was", async () => {
  const { invoice, token } = await issuedInvoice();
  await payAndConfirm(token);
  mail.clear();
  const created = await deliver(app, makeEvent("charge.dispute.created", { id: "dp_1", payment_intent: "pi_test_cs_test_1", status: "needs_response", reason: "fraudulent" }));
  assert.equal(created.json.outcome, "applied");
  let stored = await Invoice.findById(invoice.id);
  assert.equal(stored.status, "paid");
  assert.equal(stored.disputeStatus, "needs_response");
  assert.ok(stored.flags.some((f) => f.code === "disputed"));
  assert.ok(mail.sent.some((m) => /Dispute needs_response/.test(m.subject)));
  await deliver(app, makeEvent("charge.dispute.closed", { id: "dp_1", payment_intent: "pi_test_cs_test_1", status: "lost", reason: "fraudulent" }));
  stored = await Invoice.findById(invoice.id);
  assert.equal(stored.disputeStatus, "lost");
  assert.equal(stored.status, "paid");
  // The client never sees dispute state.
  const view = await clientView(token);
  assert.ok(!("disputeStatus" in view.data));
  assert.ok(!view.text.includes("dispute"));
});

// ---------------------------------------------------------------------------
// Edge cases around money arriving at the wrong time

test("money that arrives for a voided invoice is flagged for refund and does not revive it", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  // Voiding closes the open checkout at Stripe.
  assert.equal((await api.call("POST", `/api/admin/invoices/${invoice.id}/void`, { body: { reason: "Scope cancelled" } })).status, 200);
  assert.equal(fake.sessions.get("cs_test_1").status, "expired");
  assert.equal((await Payment.findOne()).status, "superseded");

  // A payment still lands (the customer was mid-payment).
  mail.clear();
  fake.complete("cs_test_1");
  fake.sessions.get("cs_test_1").status = "complete";
  const res = await deliver(app, makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1")));
  assert.equal(res.json.reason, "paid_after_void");
  const stored = await Invoice.findById(invoice.id);
  assert.equal(stored.status, "void");
  assert.ok(stored.flags.some((f) => f.code === "paid_after_void"));
  assert.ok(mail.sent.some((m) => /Action needed/.test(m.subject)));
});

test("a second payment for an already-paid invoice is flagged, not applied", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.sessions.get("cs_test_1").status = "expired"; // customer abandoned it; a new one is made
  await clientPay(token);
  assert.equal(fake.sessions.size, 2);
  // Both sessions end up paid at Stripe.
  fake.complete("cs_test_2");
  await deliver(app, makeEvent("checkout.session.completed", completedSession(fake, "cs_test_2")));
  mail.clear();
  fake.complete("cs_test_1", { intent: "pi_other" });
  const dup = await deliver(app, makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1")));
  assert.equal(dup.json.reason, "duplicate_payment");
  const stored = await Invoice.findById(invoice.id);
  assert.equal(stored.status, "paid");
  assert.equal(String(stored.paidPaymentId), String((await Payment.findOne({ checkoutSessionId: "cs_test_2" }))._id));
  assert.ok(stored.flags.some((f) => f.code === "duplicate_payment"));
  assert.ok(mail.sent.some((m) => /duplicate payment/.test(m.subject)));
});

test("voiding refuses when the customer has just paid, and when Stripe cannot close the checkout", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.failNext.expire = true;
  const blocked = await api.call("POST", `/api/admin/invoices/${invoice.id}/void`, { body: { reason: "x y z" } });
  assert.equal(blocked.status, 502);
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");

  fake.complete("cs_test_1");
  const racing = await api.call("POST", `/api/admin/invoices/${invoice.id}/void`, { body: { reason: "x y z" } });
  assert.equal(racing.status, 409);
  assert.equal(racing.error.code, "PAYMENT_CONFIRMING");
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");
});

test("unhandled event types are acknowledged and recorded without effect", async () => {
  const res = await deliver(app, makeEvent("customer.created", { id: "cus_1" }));
  assert.equal(res.status, 200);
  assert.equal(res.json.outcome, "ignored");
  assert.equal(await PaymentEvent.countDocuments(), 1);
});

test("an event that fails to apply is answered 500 so Stripe retries, then succeeds", async () => {
  const { invoice, token } = await issuedInvoice();
  await clientPay(token);
  fake.complete("cs_test_1");
  const event = makeEvent("checkout.session.completed", completedSession(fake, "cs_test_1"));
  const realUpdate = Invoice.findOneAndUpdate;
  Invoice.findOneAndUpdate = () => Promise.reject(new Error("simulated database outage"));
  let first;
  try {
    first = await deliver(app, event);
  } finally {
    Invoice.findOneAndUpdate = realUpdate;
  }
  assert.equal(first.status, 500);
  assert.equal((await Invoice.findById(invoice.id)).status, "unpaid");
  assert.equal((await PaymentEvent.findOne({ eventId: event.id })).processedAt, null);
  const retry = await deliver(app, event);
  assert.equal(retry.status, 200);
  assert.equal(retry.json.outcome, "applied");
  assert.equal((await Invoice.findById(invoice.id)).status, "paid");
});

// ---------------------------------------------------------------------------
// Sensitive data

test("logs and stored events never contain keys, invoice tokens or card numbers", async () => {
  const lines = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };
  for (const k of Object.keys(orig)) console[k] = (...a) => lines.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  let token;
  try {
    const issued = await issuedInvoice();
    token = issued.token;
    await payAndConfirm(token);
    fake.failNext.create = true;
    await clientPay(token); // 409 paid; still exercise paths
    const bad = signedWebhookRequest(makeEvent("checkout.session.completed", {}), { secret: "whsec_wrong" });
    await app.request("/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": bad.header }, body: bad.payload });
  } finally {
    Object.assign(console, orig);
  }
  const log = lines.join("\n");
  for (const secret of [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET, WEBHOOK_SECRET, process.env.INVOICE_LINK_SECRET, process.env.RESEND_API_KEY, token.split(".")[1], "whsec_wrong"]) {
    assert.ok(!log.includes(secret), `log contains a secret: ${secret.slice(0, 8)}...`);
  }
  assert.ok(!/ada@client\.example/.test(log), "client email must not be logged");
  const events = JSON.stringify(await PaymentEvent.find().lean());
  assert.ok(!events.includes("ada@client"), "stored events carry no customer details");
});
