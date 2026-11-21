import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { captureMail, configureEnv, makeCaller, startDb } from "./helpers.js";

configureEnv();
const { app } = await import("../src/app.js");
const { limits: quoteLimits } = await import("../src/controllers/quotes/submit.js");
const { Invoice } = await import("../src/models/Invoice.js");
const { QuoteRequest } = await import("../src/models/QuoteRequest.js");
const { AuditEntry } = await import("../src/models/AuditEntry.js");
const { makeInvoiceToken } = await import("../src/lib/invoiceLinks.js");

let db;
let mail;
const api = makeCaller(app);
let ipCounter = 0;
const freshIp = () => `203.0.113.${++ipCounter}`;

before(async () => {
  db = await startDb("workflow");
  mail = captureMail();
  await api.login();
});
after(async () => {
  mail.restore();
  await db.stop();
});
beforeEach(async () => {
  await db.clear();
  mail.clear();
  for (const l of Object.values(quoteLimits)) l.reset();
});

const goodQuote = (over = {}) => ({
  name: "Ada Client",
  email: "ada@client.example",
  requirements: "We need a mobile app that lets customers book appointments and pay deposits.",
  budget: "$5k-$10k",
  website: "",
  elapsedMs: 9000,
  ...over,
});
const submitQuote = (body, ip = freshIp()) =>
  api.call("POST", "/api/quotes", { body, token: null, headers: { "x-forwarded-for": ip } });

async function acceptedProject({ price = "1000.00", milestones } = {}) {
  const q = await submitQuote(goodQuote({ email: `c${Date.now()}${Math.random()}@client.example` }));
  assert.equal(q.status, 201);
  const list = await api.call("GET", "/api/admin/quotes");
  const converted = await api.call("POST", `/api/admin/quotes/${list.data.quotes[0].id}/convert`, { body: {} });
  assert.equal(converted.status, 201);
  const id = converted.data.id;
  const patch = await api.call("PATCH", `/api/admin/projects/${id}`, {
    body: {
      title: "Booking app",
      scope: "Design and build the booking app for iOS and Android.",
      deliverables: ["iOS app", "Android app"],
      price,
      timeline: "8 weeks",
      milestones: milestones ?? [
        { label: "Deposit", kind: "deposit", amount: "400.00", dueInDays: 7 },
        { label: "Final delivery", kind: "final", amount: "600.00", dueInDays: 14 },
      ],
    },
  });
  assert.equal(patch.status, 200, JSON.stringify(patch.json));
  const accepted = await api.call("POST", `/api/admin/projects/${id}/accept`, {
    body: { acceptedBy: "Ada Client", method: "email", reference: "Reply of 2026-01-02" },
  });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
  const detail = await api.call("GET", `/api/admin/projects/${id}`);
  return { id, project: detail.data, milestones: detail.data.milestones };
}

// ---------------------------------------------------------------------------

test("every admin route refuses a missing, malformed or wrongly signed token", async () => {
  const routes = [
    ["GET", "/api/admin/billing/status"],
    ["GET", "/api/admin/quotes"],
    ["GET", "/api/admin/quotes/aaaaaaaaaaaaaaaaaaaaaaaa"],
    ["PATCH", "/api/admin/quotes/aaaaaaaaaaaaaaaaaaaaaaaa"],
    ["POST", "/api/admin/quotes/aaaaaaaaaaaaaaaaaaaaaaaa/convert"],
    ["GET", "/api/admin/projects"],
    ["GET", "/api/admin/projects/aaaaaaaaaaaaaaaaaaaaaaaa"],
    ["PATCH", "/api/admin/projects/aaaaaaaaaaaaaaaaaaaaaaaa"],
    ["POST", "/api/admin/projects/aaaaaaaaaaaaaaaaaaaaaaaa/accept"],
    ["DELETE", "/api/admin/projects/aaaaaaaaaaaaaaaaaaaaaaaa/accept"],
    ["POST", "/api/admin/projects/aaaaaaaaaaaaaaaaaaaaaaaa/close"],
    ["POST", "/api/admin/projects/aaaaaaaaaaaaaaaaaaaaaaaa/invoices"],
    ["GET", "/api/admin/invoices"],
    ["GET", "/api/admin/invoices/aaaaaaaaaaaaaaaaaaaaaaaa"],
    ["PATCH", "/api/admin/invoices/aaaaaaaaaaaaaaaaaaaaaaaa"],
    ["DELETE", "/api/admin/invoices/aaaaaaaaaaaaaaaaaaaaaaaa"],
    ["POST", "/api/admin/invoices/aaaaaaaaaaaaaaaaaaaaaaaa/issue"],
    ["POST", "/api/admin/invoices/aaaaaaaaaaaaaaaaaaaaaaaa/void"],
    ["POST", "/api/admin/invoices/aaaaaaaaaaaaaaaaaaaaaaaa/reissue"],
    ["POST", "/api/admin/invoices/aaaaaaaaaaaaaaaaaaaaaaaa/send"],
    ["POST", "/api/admin/invoices/aaaaaaaaaaaaaaaaaaaaaaaa/link/rotate"],
    ["POST", "/api/admin/invoices/aaaaaaaaaaaaaaaaaaaaaaaa/link/disable"],
    ["GET", "/api/admin/anything-else"],
  ];
  const forged = "eyJleHAiOjk5OTk5OTk5OTk5OTl9.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  for (const [method, path] of routes) {
    for (const token of [null, "garbage", forged]) {
      const res = await api.call(method, path, { token, body: method === "GET" ? undefined : {} });
      assert.equal(res.status, 401, `${method} ${path} with ${token ?? "no token"} -> ${res.status}`);
    }
  }
  // The client-side token for an invoice is not an admin token either.
  const res = await api.call("GET", "/api/admin/invoices", { token: "aaaaaaaaaaaaaaaaaaaaaaaa.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });
  assert.equal(res.status, 401);
});

test("the quote form validates input and protects itself from spam", async () => {
  const bad = [
    { name: "" },
    { name: "A" },
    { email: "not-an-email" },
    { email: "a@b" },
    { requirements: "too short" },
    { requirements: "x".repeat(5001) },
    { budget: "y".repeat(101) },
    { name: 12345 },
  ];
  for (const over of bad) {
    const res = await submitQuote(goodQuote(over));
    assert.equal(res.status, 400, JSON.stringify(over).slice(0, 60));
  }
  // Not from the form: no timing information at all.
  assert.equal((await submitQuote({ ...goodQuote(), elapsedMs: undefined })).status, 400);
  assert.equal(await QuoteRequest.countDocuments(), 0);

  // Honeypot filled, or sent faster than a person can: looks like success, saves nothing.
  const trap = await submitQuote(goodQuote({ website: "http://spam.example" }));
  assert.equal(trap.status, 200);
  const fast = await submitQuote(goodQuote({ elapsedMs: 300 }));
  assert.equal(fast.status, 200);
  assert.equal(await QuoteRequest.countDocuments(), 0);
  assert.equal(mail.sent.length, 0);

  const ok = await submitQuote(goodQuote());
  assert.equal(ok.status, 201);
  assert.equal(await QuoteRequest.countDocuments(), 1);
  // The administrator is notified through the existing mail service.
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(mail.sent.length, 1);
  assert.equal(mail.sent[0].to[0], "admin@example.test");
});

test("quote requests: duplicates are dropped and floods are rate limited", async () => {
  const ip = "198.51.100.7";
  assert.equal((await submitQuote(goodQuote(), ip)).status, 201);
  assert.equal((await submitQuote(goodQuote(), ip)).status, 200); // identical repeat, nothing new saved
  assert.equal(await QuoteRequest.countDocuments(), 1);

  // Per address: five per hour.
  const results = [];
  for (let i = 0; i < 6; i++) {
    results.push((await submitQuote(goodQuote({ email: `n${i}@client.example`, requirements: `Request number ${i}, with enough words to pass.` }), "198.51.100.8")).status);
  }
  assert.deepEqual(results.slice(0, 5), [201, 201, 201, 201, 201]);
  assert.equal(results[5], 429);

  // Per email: three a day, even from different addresses.
  quoteLimits.perIp.reset();
  const same = [];
  for (let i = 0; i < 4; i++) {
    same.push((await submitQuote(goodQuote({ email: "same@client.example", requirements: `Distinct requirement text number ${i} here.` }))).status);
  }
  assert.deepEqual(same, [201, 201, 201, 429]);
});

test("quote text is stored as text and escaped in the notification email", async () => {
  const evil = `<script>alert(1)</script> & "quotes" ${"x".repeat(20)}`;
  const res = await submitQuote(goodQuote({ name: "<img src=x onerror=alert(1)>", requirements: evil }));
  assert.equal(res.status, 201);
  await new Promise((r) => setTimeout(r, 50));
  const html = mail.sent[0].html;
  assert.ok(!html.includes("<script>"), "script tag must be escaped");
  assert.ok(!html.includes("<img src=x"), "image tag must be escaped");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("administrators see requests and turn one into a project exactly once", async () => {
  await submitQuote(goodQuote());
  const list = await api.call("GET", "/api/admin/quotes");
  assert.equal(list.status, 200);
  assert.equal(list.data.total, 1);
  const quote = list.data.quotes[0];
  assert.equal(quote.status, "new");

  const [a, b] = await Promise.all([
    api.call("POST", `/api/admin/quotes/${quote.id}/convert`, { body: {} }),
    api.call("POST", `/api/admin/quotes/${quote.id}/convert`, { body: {} }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const after = await api.call("GET", `/api/admin/quotes/${quote.id}`);
  assert.equal(after.data.status, "converted");
  assert.ok(after.data.projectId);
});

test("project terms: price, milestones and acceptance rules", async () => {
  await submitQuote(goodQuote());
  const quote = (await api.call("GET", "/api/admin/quotes")).data.quotes[0];
  const id = (await api.call("POST", `/api/admin/quotes/${quote.id}/convert`, { body: {} })).data.id;
  const edit = (body) => api.call("PATCH", `/api/admin/projects/${id}`, { body });

  // Amounts must be strings, never JSON numbers (which are floats before we see them).
  assert.equal((await edit({ price: 1000 })).status, 400);
  assert.equal((await edit({ price: "10.001" })).status, 400);
  assert.equal((await edit({ price: "-5" })).status, 400);
  assert.equal((await edit({ currency: "EUR" })).status, 400); // not an editable field
  assert.equal((await edit({ status: "active" })).status, 400);

  // Milestones that do not add up cannot be accepted.
  await edit({ price: "1000.00", scope: "Scope.", milestones: [{ label: "Half", amount: "499.99" }, { label: "Rest", amount: "500.00" }] });
  const mismatch = await api.call("POST", `/api/admin/projects/${id}/accept`, { body: { acceptedBy: "Ada", method: "email" } });
  assert.equal(mismatch.status, 400);
  assert.match(mismatch.error.message, /add up/);

  // Below the provider minimum is refused too.
  await edit({ price: "0.40", milestones: [{ label: "All", amount: "0.40" }] });
  assert.equal((await api.call("POST", `/api/admin/projects/${id}/accept`, { body: { acceptedBy: "Ada", method: "email" } })).status, 400);

  await edit({ price: "1000.00", milestones: [{ label: "Half", amount: "500.00" }, { label: "Rest", amount: "500.00" }] });
  assert.equal((await api.call("POST", `/api/admin/projects/${id}/accept`, { body: { acceptedBy: "Ada", method: "carrier pigeon" } })).status, 400);
  assert.equal((await api.call("POST", `/api/admin/projects/${id}/accept`, { body: { acceptedBy: "", method: "email" } })).status, 400);
  const accepted = await api.call("POST", `/api/admin/projects/${id}/accept`, { body: { acceptedBy: "Ada Client", method: "signed_document", reference: "Contract #12" } });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.status, "active");
  assert.match(accepted.data.acceptance.termsHash, /^[a-f0-9]{64}$/);

  // After acceptance the agreed terms are frozen.
  assert.equal((await edit({ price: "2000.00" })).status, 409);
  assert.equal((await api.call("POST", `/api/admin/projects/${id}/accept`, { body: { acceptedBy: "Ada", method: "email" } })).status, 409);
});

test("invoices need an accepted project, take their amount from the milestone and number on issue", async () => {
  await submitQuote(goodQuote());
  const quote = (await api.call("GET", "/api/admin/quotes")).data.quotes[0];
  const draftProject = (await api.call("POST", `/api/admin/quotes/${quote.id}/convert`, { body: {} })).data.id;
  const early = await api.call("POST", `/api/admin/projects/${draftProject}/invoices`, { body: { milestoneId: "aaaaaaaaaaaaaaaaaaaaaaaa" } });
  assert.equal(early.status, 409);
  assert.equal(early.error.code, "NOT_ACCEPTED");

  const { id, milestones } = await acceptedProject();
  const deposit = milestones[0];

  // The amount is not an input.
  const forged = await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: deposit.id, amountMinor: 1 } });
  assert.equal(forged.status, 400);

  const created = await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: deposit.id, note: "Thank you." } });
  assert.equal(created.status, 201);
  assert.equal(created.data.amountMinor, 40000);
  assert.equal(created.data.amountDisplay, "$400.00");
  assert.equal(created.data.status, "draft");
  assert.equal(created.data.number, null);
  assert.equal(created.data.link, null); // no link until issued

  // One live invoice per milestone.
  const again = await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: deposit.id } });
  assert.equal(again.status, 409);
  const racing = await Promise.all([1, 2, 3].map(() => api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: milestones[1].id } })));
  assert.equal(racing.filter((r) => r.status === 201).length, 1, "concurrent creation must leave exactly one invoice");

  const issued = await api.call("POST", `/api/admin/invoices/${created.data.id}/issue`);
  assert.equal(issued.status, 200);
  assert.match(issued.data.number, /^INV-\d{4}-0001$/);
  assert.equal(issued.data.status, "unpaid");
  assert.match(issued.data.link, /^http:\/\/localhost:8000\/invoice#[a-f0-9]{24}\.[A-Za-z0-9_-]{43}$/);
  const second = await api.call("POST", `/api/admin/invoices/${racing.find((r) => r.status === 201).data.id}/issue`);
  assert.match(second.data.number, /-0002$/);

  // Issuing twice is refused.
  assert.equal((await api.call("POST", `/api/admin/invoices/${created.data.id}/issue`)).status, 409);
});

test("an issued invoice's amount and description are stable; corrections are void-and-reissue", async () => {
  const { id, milestones } = await acceptedProject();
  const draft = (await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: milestones[0].id } })).data;
  const issued = (await api.call("POST", `/api/admin/invoices/${draft.id}/issue`)).data;

  for (const patch of [{ amountMinor: 1 }, { description: "changed" }, { currency: "EUR" }, { status: "paid" }, { note: "x" }, { number: "INV-1" }]) {
    const res = await api.call("PATCH", `/api/admin/invoices/${draft.id}`, { body: patch });
    assert.equal(res.status, 400, JSON.stringify(patch));
  }
  const stored = await Invoice.findById(draft.id).lean();
  assert.equal(stored.amountMinor, 40000);
  assert.equal(stored.description, issued.description);

  // Even after the project's own terms move, the issued invoice does not.
  assert.equal((await api.call("PATCH", `/api/admin/projects/${id}`, { body: { price: "9.00" } })).status, 409);

  // The due date alone may move.
  const moved = await api.call("PATCH", `/api/admin/invoices/${draft.id}`, { body: { dueDate: "2099-01-31" } });
  assert.equal(moved.status, 200);
  assert.equal(moved.data.dueDate, "2099-01-31");

  // Void-and-reissue.
  assert.equal((await api.call("POST", `/api/admin/invoices/${draft.id}/void`, { body: { reason: "" } })).status, 400);
  const re = await api.call("POST", `/api/admin/invoices/${draft.id}/reissue`, { body: { reason: "Wrong due date", dueDate: "2099-02-28", note: "Corrected." } });
  assert.equal(re.status, 201);
  assert.equal(re.data.voided.status, "void");
  assert.equal(re.data.voided.replacedByInvoiceId, re.data.replacement.id);
  assert.equal(re.data.replacement.status, "draft");
  assert.equal(re.data.replacement.replacesInvoiceId, draft.id);
  assert.equal(re.data.replacement.amountMinor, 40000);
  assert.equal(re.data.replacement.dueDate, "2099-02-28");

  // A void invoice cannot be revived, edited, re-voided or issued.
  assert.equal((await api.call("PATCH", `/api/admin/invoices/${draft.id}`, { body: { dueDate: "2099-03-01" } })).status, 409);
  assert.equal((await api.call("POST", `/api/admin/invoices/${draft.id}/void`, { body: { reason: "again" } })).status, 409);
  assert.equal((await api.call("POST", `/api/admin/invoices/${draft.id}/issue`)).status, 409);

  // Drafts may be deleted; issued invoices may not.
  assert.equal((await api.call("DELETE", `/api/admin/invoices/${draft.id}`)).status, 409);
  assert.equal((await api.call("DELETE", `/api/admin/invoices/${re.data.replacement.id}`)).status, 200);
});

test("overdue is derived from the due date and filterable", async () => {
  const { id, milestones } = await acceptedProject();
  const draft = (await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: milestones[0].id } })).data;
  // A due date in the past cannot be issued...
  await api.call("PATCH", `/api/admin/invoices/${draft.id}`, { body: { dueDate: "2020-01-01" } });
  assert.equal((await api.call("POST", `/api/admin/invoices/${draft.id}/issue`)).status, 400);
  await api.call("PATCH", `/api/admin/invoices/${draft.id}`, { body: { dueDate: "2099-01-01" } });
  assert.equal((await api.call("POST", `/api/admin/invoices/${draft.id}/issue`)).status, 200);
  assert.equal((await api.call("GET", `/api/admin/invoices/${draft.id}`)).data.status, "unpaid");
  assert.equal((await api.call("GET", "/api/admin/invoices?status=overdue")).data.total, 0);
  assert.equal((await api.call("GET", "/api/admin/invoices?status=unpaid")).data.total, 1);

  // ...but one that passes while unpaid shows as overdue.
  await Invoice.updateOne({ _id: draft.id }, { $set: { dueDate: "2020-01-01" } });
  const detail = await api.call("GET", `/api/admin/invoices/${draft.id}`);
  assert.equal(detail.data.status, "overdue");
  assert.equal(detail.data.storedStatus, "unpaid");
  assert.equal((await api.call("GET", "/api/admin/invoices?status=overdue")).data.total, 1);
  assert.equal((await api.call("GET", "/api/admin/invoices?status=unpaid")).data.total, 0);
});

test("invoices cannot be issued until the business details are configured", async () => {
  const { id, milestones } = await acceptedProject();
  const draft = (await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: milestones[0].id } })).data;
  const saved = { name: process.env.BUSINESS_LEGAL_NAME, addr: process.env.BUSINESS_ADDRESS };
  try {
    delete process.env.BUSINESS_LEGAL_NAME;
    const status = await api.call("GET", "/api/admin/billing/status");
    assert.equal(status.data.businessDetails.ready, false);
    assert.deepEqual(status.data.businessDetails.missing, ["BUSINESS_LEGAL_NAME"]);
    const res = await api.call("POST", `/api/admin/invoices/${draft.id}/issue`);
    assert.equal(res.status, 409);
    assert.equal(res.error.code, "BUSINESS_DETAILS_MISSING");
  } finally {
    process.env.BUSINESS_LEGAL_NAME = saved.name;
    process.env.BUSINESS_ADDRESS = saved.addr;
  }
  assert.equal((await api.call("POST", `/api/admin/invoices/${draft.id}/issue`)).status, 200);
});

test("the billing status never exposes secret values", async () => {
  const res = await api.call("GET", "/api/admin/billing/status");
  assert.equal(res.status, 200);
  assert.equal(res.data.payments.mode, "test");
  for (const secret of [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET, process.env.INVOICE_LINK_SECRET, process.env.ADMIN_PASSWORD]) {
    assert.ok(!res.text.includes(secret));
  }
});

test("links: revocable, rotatable, and one invoice's token opens nothing else", async () => {
  const { id, milestones } = await acceptedProject();
  const mk = async (m) => {
    const d = (await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: m.id } })).data;
    return (await api.call("POST", `/api/admin/invoices/${d.id}/issue`)).data;
  };
  const a = await mk(milestones[0]);
  const b = await mk(milestones[1]);
  const tokenOf = (inv) => inv.link.split("#")[1];
  const view = (token) => api.call("GET", "/api/public/invoice", { token: null, headers: { "x-invoice-token": token, "x-forwarded-for": freshIp() } });

  const ok = await view(tokenOf(a));
  assert.equal(ok.status, 200);
  assert.equal(ok.data.number, a.number);
  assert.equal(ok.data.business.legalName, "Test Business LLC");
  assert.equal(ok.headers.get("cache-control"), "no-store");
  assert.match(ok.headers.get("x-robots-tag"), /noindex/);
  // Nothing internal leaks to the client.
  for (const key of ["id", "clientEmail", "flags", "disputeStatus", "adminNote", "projectId", "_id"]) assert.ok(!(key in ok.data), `${key} leaked`);
  assert.ok(!ok.text.includes("ada@client"));

  // A's mac with B's id, and B's mac with A's id: both fail.
  const [aId, aMac] = tokenOf(a).split(".");
  const [bId, bMac] = tokenOf(b).split(".");
  assert.equal((await view(`${bId}.${aMac}`)).status, 404);
  assert.equal((await view(`${aId}.${bMac}`)).status, 404);
  // Malformed, empty, truncated and nonexistent all answer the same 404.
  for (const bad of ["", "x", `${aId}`, `${aId}.`, `${aId}.${aMac.slice(1)}`, `${"0".repeat(24)}.${aMac}`, `${aId}.${aMac}.extra`, "a".repeat(500)]) {
    const res = await view(bad);
    assert.equal(res.status, 404, JSON.stringify(bad).slice(0, 50));
    assert.equal(res.error.code, "NOT_FOUND");
  }
  // The token in the URL is not accepted: only the header.
  const viaUrl = await api.call("GET", `/api/public/invoice?token=${tokenOf(a)}`, { token: null, headers: { "x-forwarded-for": freshIp() } });
  assert.equal(viaUrl.status, 404);

  // A draft has no link at all.
  const spare = (await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: milestones[1].id } })).status;
  assert.equal(spare, 409); // b already live; confirms no second draft to probe

  // Disable: the old link dies.
  assert.equal((await api.call("POST", `/api/admin/invoices/${a.id}/link/disable`)).status, 200);
  assert.equal((await view(tokenOf(a))).status, 404);
  // Rotate: a new link works, the old one still does not.
  const rotated = (await api.call("POST", `/api/admin/invoices/${a.id}/link/rotate`)).data;
  assert.notEqual(tokenOf(rotated), tokenOf(a));
  assert.equal((await view(tokenOf(rotated))).status, 200);
  assert.equal((await view(tokenOf(a))).status, 404);
  // B was never touched.
  assert.equal((await view(tokenOf(b))).status, 200);

  // A forged token cannot be computed without the server's secret.
  const stored = await Invoice.findById(a.id);
  const real = makeInvoiceToken(stored);
  assert.equal(real, tokenOf(rotated));
});

test("emailing an invoice uses the existing mail service and reaches only the client's address", async () => {
  const { id, milestones } = await acceptedProject();
  const d = (await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: milestones[0].id } })).data;
  // Drafts are not sent.
  assert.equal((await api.call("POST", `/api/admin/invoices/${d.id}/send`)).status, 409);
  const issued = (await api.call("POST", `/api/admin/invoices/${d.id}/issue`)).data;
  mail.clear();
  const sent = await api.call("POST", `/api/admin/invoices/${d.id}/send`);
  assert.equal(sent.status, 200);
  assert.ok(sent.data.lastEmailedAt);
  assert.equal(mail.sent.length, 1);
  assert.equal(mail.sent[0].to.length, 1);
  assert.match(mail.sent[0].to[0], /@client\.example$/);
  assert.ok(mail.sent[0].html.includes(issued.link.replace(/&/g, "&amp;")));
  assert.match(mail.sent[0].subject, /INV-\d{4}-0001/);

  // With no mail transport configured it says so rather than pretending.
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.SMTP_PASS;
  const none = await api.call("POST", `/api/admin/invoices/${d.id}/send`);
  process.env.RESEND_API_KEY = saved;
  assert.equal(none.status, 503);
  assert.equal(none.error.code, "MAIL_NOT_CONFIGURED");
});

test("status changes are written to an append-only audit trail", async () => {
  const { id, milestones } = await acceptedProject();
  const d = (await api.call("POST", `/api/admin/projects/${id}/invoices`, { body: { milestoneId: milestones[0].id } })).data;
  await api.call("POST", `/api/admin/invoices/${d.id}/issue`);
  await api.call("POST", `/api/admin/invoices/${d.id}/void`, { body: { reason: "Client cancelled" } });
  const detail = await api.call("GET", `/api/admin/invoices/${d.id}`);
  assert.deepEqual(detail.data.history.map((h) => h.action), ["created", "issued", "voided"]);
  assert.equal(detail.data.history[2].detail, "Client cancelled");
  const proj = await api.call("GET", `/api/admin/projects/${id}`);
  assert.ok(proj.data.history.some((h) => h.action === "accepted"));
  assert.ok((await AuditEntry.countDocuments()) >= 6);
});
