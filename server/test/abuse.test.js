import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { captureMail, configureEnv, makeCaller, startDb } from "./helpers.js";

configureEnv({ CAMPAIGN_EMAILS_ENABLED: "true" });
const { app } = await import("../src/app.js");
const { runDue } = await import("../src/campaigns/runner.js");
const { makeConfirmToken, makeOptOutToken, makeUnsubscribeToken, verifyConfirmToken, verifyOptOutToken, verifyUnsubscribeToken } = await import("../src/campaigns/unsubscribe.js");
const { Subscriber } = await import("../src/models/Subscriber.js");
const { OptOut } = await import("../src/models/OptOut.js");
const { limits: newsletterLimits, } = await import("../src/controllers/newsletter/subscribe.js");
const { limits: contactLimits } = await import("../src/controllers/contact/submitContact.js");
const { limiter: confirmLimiter } = await import("../src/controllers/newsletter/confirm.js");
const { limiter: unsubLimiter } = await import("../src/controllers/newsletter/unsubscribe.js");
const { deliverableSubscribers, requestSubscription } = await import("../src/lib/subscribers.js");

let db;
let mail;
const api = makeCaller(app);
let ip = 0;
const freshIp = () => `198.19.0.${++ip}`;

before(async () => {
  db = await startDb("abuse");
  mail = captureMail();
});
after(async () => {
  mail.restore();
  await db.stop();
});
beforeEach(async () => {
  await db.clear();
  mail.clear();
  for (const l of [...Object.values(newsletterLimits), ...Object.values(contactLimits), confirmLimiter, unsubLimiter]) l.reset();
});

const wait = async (cond, ms = 1500) => {
  const end = Date.now() + ms;
  while (Date.now() < end && !cond()) await new Promise((r) => setTimeout(r, 15));
};
const settle = () => new Promise((r) => setTimeout(r, 120));

const signup = (body, ipAddr = freshIp()) =>
  api.call("POST", "/api/newsletter", { token: null, headers: { "x-forwarded-for": ipAddr }, body: { elapsedMs: 5000, website: "", ...body } });
const contact = (body, ipAddr = freshIp()) =>
  api.call("POST", "/api/contact", {
    token: null,
    headers: { "x-forwarded-for": ipAddr },
    body: { elapsedMs: 8000, website: "", fullName: "Dana Reyes", email: "dana@x.test", message: "We need a customer portal for our clinic.", ...body },
  });
const confirmWith = (token, ipAddr = freshIp()) =>
  api.call("POST", "/api/newsletter/confirm", { token: null, headers: { "x-confirm-token": token, "x-forwarded-for": ipAddr }, body: {} });
const unsubscribeWith = (token, ipAddr = freshIp()) =>
  api.call("POST", "/api/newsletter/unsubscribe", { token: null, headers: { "x-unsubscribe-token": token, "x-forwarded-for": ipAddr }, body: {} });

const sender = () => {
  const sent = [];
  return { sent, fn: async (m) => (sent.push(m), { transport: "test", id: "x" }) };
};
const monday = new Date("2026-11-24T15:00:00Z");

// ---------------------------------------------------------------------------
// Newsletter signup

test("a signup stores an unconfirmed address and sends only a confirmation request", async () => {
  const res = await signup({ email: "Real.Person@X.test" });
  assert.equal(res.status, 200);
  await wait(() => mail.sent.length > 0);
  await settle();
  const sub = await Subscriber.findOne({ email: "real.person@x.test" });
  assert.ok(sub, "address stored, lower-cased");
  assert.equal(sub.confirmedAt, null);
  assert.equal(mail.sent.length, 1, "one message: the confirmation request, no welcome and no alert to the owner");
  const [m] = mail.sent;
  assert.deepEqual(m.to, ["real.person@x.test"]);
  assert.match(m.subject, /confirm/i);
  assert.match(m.html, /confirm#[a-f0-9]{24}\./);
  assert.match(m.text, /confirm#[a-f0-9]{24}\./);
  assert.ok(!/unsubscribe/i.test(m.subject));
});

test("the reply is the same whether or not an address is new, so the form reveals nothing", async () => {
  const a = await signup({ email: "new@x.test" });
  await wait(() => mail.sent.length > 0);
  const b = await signup({ email: "new@x.test" });
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, b.json);
  await Subscriber.updateOne({ email: "new@x.test" }, { $set: { confirmedAt: new Date() } });
  const c = await signup({ email: "new@x.test" });
  assert.deepEqual(a.json, c.json);
});

test("repeating a signup does not send a second confirmation within a day", async () => {
  await signup({ email: "twice@x.test" });
  await wait(() => mail.sent.length > 0);
  await signup({ email: "twice@x.test" });
  await settle();
  assert.equal(mail.sent.length, 1);
  // A day later it may be sent again.
  const sub = await Subscriber.findOne({ email: "twice@x.test" });
  const out = await requestSubscription("twice@x.test", new Date(sub.confirmationSentAt.getTime() + 25 * 3600 * 1000));
  assert.equal(out.sendConfirmation, true);
});

test("a bot that fills the hidden field or sends too fast gets success and nothing happens", async () => {
  const trapped = await signup({ email: "victim1@x.test", website: "http://spam.test" });
  const fast = await signup({ email: "victim2@x.test", elapsedMs: 300 });
  assert.equal(trapped.status, 200);
  assert.equal(fast.status, 200);
  await settle();
  assert.equal(await Subscriber.countDocuments(), 0);
  assert.equal(mail.sent.length, 0);
});

test("a request that does not come from the form (no timer) is refused", async () => {
  const res = await api.call("POST", "/api/newsletter", { token: null, headers: { "x-forwarded-for": freshIp() }, body: { email: "a@x.test" } });
  assert.equal(res.status, 400);
  assert.equal(await Subscriber.countDocuments(), 0);
});

test("bad addresses are refused", async () => {
  for (const email of ["", "nope", "a@b", "x@@y.test", "<script>@x.test", 42]) {
    assert.equal((await signup({ email })).status, 400, JSON.stringify(email));
  }
  assert.equal(await Subscriber.countDocuments(), 0);
});

test("one network address, one email address and the whole site are each limited", async () => {
  const same = freshIp();
  for (let i = 0; i < 5; i += 1) assert.equal((await signup({ email: `a${i}@x.test` }, same)).status, 200);
  assert.equal((await signup({ email: "a9@x.test" }, same)).status, 429);

  newsletterLimits.perIp.reset();
  for (let i = 0; i < 3; i += 1) await signup({ email: "same@x.test" });
  await wait(() => mail.sent.some((m) => m.to[0] === "same@x.test"));
  mail.clear();
  await signup({ email: "same@x.test" }); // fourth in a day: still 200, nothing sent
  await settle();
  assert.equal(mail.sent.length, 0);
});

// ---------------------------------------------------------------------------
// Confirmation

test("the confirmation link subscribes the address, once, and only then are the welcome and the owner's alert sent", async () => {
  await signup({ email: "yes@x.test" });
  await wait(() => mail.sent.length > 0);
  const sub = await Subscriber.findOne({ email: "yes@x.test" });
  mail.clear();

  const res = await confirmWith(makeConfirmToken(sub._id));
  assert.equal(res.status, 200);
  assert.ok((await Subscriber.findById(sub._id)).confirmedAt);
  await wait(() => mail.sent.length >= 2);
  const welcome = mail.sent.find((m) => m.to[0] === "yes@x.test");
  assert.ok(welcome, "welcome sent");
  assert.ok(welcome.html.includes("about one email every three days"));
  assert.match(welcome.html, /unsubscribe#[a-f0-9]{24}\./);
  const alert = mail.sent.find((m) => m.to[0] === "admin@example.test" || /Subscriber/.test(m.subject));
  assert.ok(alert, "owner alerted");

  mail.clear();
  assert.equal((await confirmWith(makeConfirmToken(sub._id))).status, 200); // repeat is harmless
  await settle();
  assert.equal(mail.sent.length, 0, "no second welcome");
});

test("confirming again after unsubscribing subscribes them again; a forged or borrowed token does nothing", async () => {
  const gone = await Subscriber.create({ email: "back@x.test", confirmedAt: new Date(), unsubscribedAt: new Date() });
  await OptOut.create({ email: "back@x.test" });
  const other = await Subscriber.create({ email: "other@x.test" });

  const [, mac] = makeConfirmToken(gone._id).split(".");
  for (const bad of ["", "junk", `${other._id}.${mac}`, makeUnsubscribeToken(other._id), makeOptOutToken("other@x.test"), `${"0".repeat(24)}.${mac}`]) {
    assert.equal((await confirmWith(bad)).status, 404, JSON.stringify(bad));
  }
  assert.equal((await Subscriber.findById(other._id)).confirmedAt, null);

  assert.equal((await confirmWith(makeConfirmToken(gone._id))).status, 200);
  const after = await Subscriber.findById(gone._id);
  assert.equal(after.unsubscribedAt, null);
  assert.equal(await OptOut.countDocuments({ email: "back@x.test" }), 0, "choosing to subscribe again lifts the opt-out");
});

test("the three kinds of link are not interchangeable", () => {
  const id = "a".repeat(24);
  assert.equal(verifyConfirmToken(makeUnsubscribeToken(id)), null);
  assert.equal(verifyUnsubscribeToken(makeConfirmToken(id)), null);
  assert.equal(verifyOptOutToken(makeUnsubscribeToken(id)), null);
  assert.equal(verifyOptOutToken(makeOptOutToken("A@X.test")), "a@x.test");
  const [enc, mac] = makeOptOutToken("a@x.test").split(".");
  assert.equal(verifyOptOutToken(`${Buffer.from("b@x.test").toString("base64url")}.${mac}`), null);
  assert.equal(verifyOptOutToken(`${enc}.${"A".repeat(43)}`), null);
});

// ---------------------------------------------------------------------------
// Who receives campaign email

test("campaign email goes only to confirmed, active, not-opted-out subscribers", async () => {
  await Subscriber.create({ email: "confirmed@x.test", confirmedAt: new Date() });
  await Subscriber.create({ email: "pending@x.test" });
  await Subscriber.create({ email: "left@x.test", confirmedAt: new Date(), unsubscribedAt: new Date() });
  await Subscriber.create({ email: "blocked@x.test", confirmedAt: new Date() });
  await OptOut.create({ email: "blocked@x.test" });
  const s = sender();
  const out = await runDue({ now: monday, send: s.fn, delayMs: 0 });
  assert.equal(out.sent, 1);
  assert.deepEqual(s.sent.map((m) => m.to), ["confirmed@x.test"]);
  assert.deepEqual((await deliverableSubscribers()).map((x) => x.email), ["confirmed@x.test"]);
});

// ---------------------------------------------------------------------------
// Opt-out for people who are not subscribers

test("an opt-out link puts the address on the do-not-email list and also removes a subscriber", async () => {
  await Subscriber.create({ email: "both@x.test", confirmedAt: new Date() });
  assert.equal((await unsubscribeWith(makeOptOutToken("Quote@X.test"))).status, 200);
  assert.equal((await unsubscribeWith(makeOptOutToken("Quote@X.test"))).status, 200); // repeatable
  assert.equal(await OptOut.countDocuments({ email: "quote@x.test" }), 1);
  assert.equal((await unsubscribeWith(makeOptOutToken("both@x.test"))).status, 200);
  assert.ok((await Subscriber.findOne({ email: "both@x.test" })).unsubscribedAt);
  assert.equal((await deliverableSubscribers()).length, 0);
});

test("a forged opt-out token changes nothing", async () => {
  const [enc] = makeOptOutToken("victim@x.test").split(".");
  assert.equal((await unsubscribeWith(`${enc}.${"B".repeat(43)}`)).status, 404);
  assert.equal(await OptOut.countDocuments(), 0);
});

// ---------------------------------------------------------------------------
// Contact form

test("a genuine message reaches the inbox, with the sender's details escaped", async () => {
  const res = await contact({ fullName: "Dana <b>Reyes</b>", message: "Hello <script>alert(1)</script> we need a portal." });
  assert.equal(res.status, 200);
  assert.equal(mail.sent.length, 1);
  const [m] = mail.sent;
  assert.deepEqual(m.to, ["contact@apsoluts.com"]);
  assert.equal(m.reply_to, "dana@x.test");
  assert.ok(!m.html.includes("<script>"));
  assert.ok(!m.html.includes("<b>Reyes"));
  assert.ok(m.html.includes("&lt;script&gt;"));
});

test("contact-form bots are dropped quietly", async () => {
  assert.equal((await contact({ website: "http://spam.test" })).status, 200);
  assert.equal((await contact({ elapsedMs: 100 })).status, 200);
  assert.equal(mail.sent.length, 0);
  const noTimer = await api.call("POST", "/api/contact", {
    token: null,
    headers: { "x-forwarded-for": freshIp() },
    body: { fullName: "Dana Reyes", email: "dana@x.test", message: "We need a customer portal." },
  });
  assert.equal(noTimer.status, 400);
  assert.equal(mail.sent.length, 0);
});

test("digit-only and nonsense submissions are refused", async () => {
  for (const over of [{ message: "1234567890123" }, { message: "!!!!!!!!!!!!!!!" }, { fullName: "12345" }, { email: "nope" }, { fullName: "" }, { message: "short" }, { message: "x".repeat(5001) }]) {
    assert.equal((await contact(over)).status, 400, JSON.stringify(over).slice(0, 60));
  }
  assert.equal(mail.sent.length, 0);
});

test("the contact form is limited per network address and per email address", async () => {
  const same = freshIp();
  for (let i = 0; i < 5; i += 1) assert.equal((await contact({ email: `p${i}@x.test` }, same)).status, 200);
  assert.equal((await contact({ email: "p9@x.test" }, same)).status, 429);
  contactLimits.perIp.reset();
  for (let i = 0; i < 3; i += 1) assert.equal((await contact({ email: "one@x.test" })).status, 200);
  assert.equal((await contact({ email: "one@x.test" })).status, 429);
});
