import test, { after, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { captureMail, configureEnv, makeCaller, startDb } from "./helpers.js";

configureEnv({ CAMPAIGN_EMAILS_ENABLED: "true" });
const { app } = await import("../src/app.js");
const { holidaysOf, holidayInWindow, upcomingHolidays, addDays } = await import("../src/campaigns/holidays.js");
const offers = await import("../src/campaigns/offers.js");
const { planFor } = await import("../src/campaigns/schedule.js");
const { TOPICS, topicFor } = await import("../src/campaigns/content.js");
const { composeCampaign } = await import("../src/campaigns/compose.js");
const { runDue } = await import("../src/campaigns/runner.js");
const { makeUnsubscribeToken, verifyUnsubscribeToken } = await import("../src/campaigns/unsubscribe.js");
const { Subscriber } = await import("../src/models/Subscriber.js");
const { Campaign } = await import("../src/models/Campaign.js");
const { CampaignSend } = await import("../src/models/CampaignSend.js");
const { QuoteRequest } = await import("../src/models/QuoteRequest.js");
const { limits: quoteLimits } = await import("../src/controllers/quotes/submit.js");
const { limiter: unsubLimiter } = await import("../src/controllers/newsletter/unsubscribe.js");

let db;
let mail;
const api = makeCaller(app);
let ip = 0;
const freshIp = () => `198.18.0.${++ip}`;

before(async () => {
  db = await startDb("campaigns");
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
  unsubLimiter.reset();
  for (const l of Object.values(quoteLimits)) l.reset();
  delete process.env.HOLIDAY_DISCOUNT_PERCENT;
  delete process.env.HOLIDAY_WINDOW_DAYS;
  delete process.env.HOLIDAY_DAILY_DAYS;
  process.env.CAMPAIGN_EMAILS_ENABLED = "true";
});

const at = (iso, hour = 15) => new Date(`${iso}T${String(hour).padStart(2, "0")}:00:00Z`);
const sub = (email, extra = {}) => Subscriber.create({ email, ...extra });

// ---------------------------------------------------------------------------
// Calendar

test("the eleven federal holidays fall on the right days, with weekend observance", () => {
  const dates = (y) => Object.fromEntries(holidaysOf(y).map((h) => [h.slug, h.date]));
  assert.deepEqual(dates(2026), {
    NEWYEAR: "2026-01-01", MLK: "2026-01-19", PRESIDENTS: "2026-02-16", MEMORIAL: "2026-05-25", JUNETEENTH: "2026-06-19",
    INDEPENDENCE: "2026-07-04", LABOR: "2026-09-07", COLUMBUS: "2026-10-12", VETERANS: "2026-11-11", THANKSGIVING: "2026-11-26", CHRISTMAS: "2026-12-25",
  });
  assert.deepEqual(dates(2027), {
    NEWYEAR: "2027-01-01", MLK: "2027-01-18", PRESIDENTS: "2027-02-15", MEMORIAL: "2027-05-31", JUNETEENTH: "2027-06-19",
    INDEPENDENCE: "2027-07-04", LABOR: "2027-09-06", COLUMBUS: "2027-10-11", VETERANS: "2027-11-11", THANKSGIVING: "2027-11-25", CHRISTMAS: "2027-12-25",
  });
  const observed = (y, slug) => holidaysOf(y).find((h) => h.slug === slug).observed;
  assert.equal(observed(2026, "INDEPENDENCE"), "2026-07-03"); // Saturday -> Friday
  assert.equal(observed(2027, "INDEPENDENCE"), "2027-07-05"); // Sunday -> Monday
  assert.equal(observed(2027, "CHRISTMAS"), "2027-12-24");
  assert.equal(observed(2027, "JUNETEENTH"), "2027-06-18");
  assert.equal(observed(2028, "NEWYEAR"), "2027-12-31"); // belongs to the year before
  assert.equal(holidaysOf(2026).length, 11);
});

test("the next holiday is found across a year boundary", () => {
  assert.equal(upcomingHolidays("2027-12-20")[0].slug, "CHRISTMAS");
  assert.equal(upcomingHolidays("2027-12-26")[0].observed, "2027-12-31"); // New Year's 2028 observed
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

// ---------------------------------------------------------------------------
// Offers

test("an offer runs for the window before a holiday, one at a time", () => {
  const code = (d) => offers.activeOffer(d)?.code ?? null;
  assert.equal(code("2026-11-18"), null);
  assert.equal(code("2026-11-19"), "THANKSGIVING10"); // 7 days before Nov 26
  assert.equal(code("2026-11-26"), "THANKSGIVING10"); // through the day itself
  assert.equal(code("2026-11-27"), null);
  assert.equal(code("2026-12-18"), "CHRISTMAS10");
  // Windows touch on Dec 25-26: Christmas wins on its own day, New Year's after.
  assert.equal(code("2026-12-25"), "CHRISTMAS10");
  assert.equal(code("2026-12-26"), "NEWYEAR10");
  assert.equal(offers.activeOffer("2026-11-24").validThrough, "2026-11-26");
  // Across a whole year there is never more than one active offer.
  for (let d = "2026-01-01"; d < "2027-01-01"; d = addDays(d, 1)) assert.ok(holidayInWindow(d, 14) === null || typeof holidayInWindow(d, 14).slug === "string");
});

test("the discount can never exceed 20 percent, whatever is configured", () => {
  assert.equal(offers.MAX_TOTAL_DISCOUNT_PERCENT, 20);
  assert.equal(offers.discountPercent(), 10);
  for (const [value, expected] of [["15", 15], ["20", 20], ["21", 20], ["99", 20], ["1000", 20], ["0", 10], ["-5", 10], ["abc", 10], ["12.9", 12]]) {
    process.env.HOLIDAY_DISCOUNT_PERCENT = value;
    assert.equal(offers.discountPercent(), expected, `HOLIDAY_DISCOUNT_PERCENT=${value}`);
    assert.ok(offers.discountPercent() <= 20);
  }
  process.env.HOLIDAY_DISCOUNT_PERCENT = "50";
  assert.equal(offers.activeOffer("2026-11-24").percent, 20);
  // Composing refuses an out-of-range offer outright.
  const bad = { kind: "holiday", offer: { ...offers.activeOffer("2026-11-24"), percent: 25 } };
  assert.throws(() => composeCampaign({ plan: bad, sequence: 1, subscriber: null }), /limit is 20%/);
});

test("daily emails are limited to the last few days before a holiday", () => {
  assert.equal(offers.dailyDays(), 3);
  for (const [value, expected] of [["2", 2], ["7", 7], ["99", 7], ["0", 3], ["-1", 3], ["abc", 3], ["1.5", 3]]) {
    process.env.HOLIDAY_DAILY_DAYS = value;
    assert.equal(offers.dailyDays(), expected, `HOLIDAY_DAILY_DAYS=${value}`);
  }
  // Never longer than the offer window.
  process.env.HOLIDAY_DAILY_DAYS = "5";
  process.env.HOLIDAY_WINDOW_DAYS = "3";
  assert.equal(offers.dailyDays(), 3);
});

test("window length is configurable within 1 to 14 days", () => {
  process.env.HOLIDAY_WINDOW_DAYS = "14";
  assert.equal(offers.activeOffer("2026-11-12").code, "THANKSGIVING10");
  process.env.HOLIDAY_WINDOW_DAYS = "99";
  assert.equal(offers.windowDays(), 7);
});

test("only today's running code is accepted, in any letter case", () => {
  assert.equal(offers.resolveOffer("thanksgiving10", "2026-11-24").percent, 10);
  assert.equal(offers.resolveOffer(" THANKSGIVING10 ", "2026-11-24").code, "THANKSGIVING10");
  assert.equal(offers.resolveOffer("THANKSGIVING10", "2026-12-01"), null);
  assert.equal(offers.resolveOffer("CHRISTMAS10", "2026-11-24"), null);
  assert.equal(offers.resolveOffer("THANKSGIVING50", "2026-11-24"), null);
  assert.equal(offers.resolveOffer("", "2026-11-24"), null);
});

// ---------------------------------------------------------------------------
// Cadence

test("an email is due every third day, and daily only in the last days before a holiday", () => {
  // Outside any window (early February).
  assert.equal(planFor("2027-02-01", null).due, true);
  assert.equal(planFor("2027-02-01", "2027-01-30").due, false); // 2 days ago
  assert.equal(planFor("2027-02-01", "2027-01-29").due, true); // 3 days ago
  assert.equal(planFor("2027-02-01", "2027-02-01").due, false);
  // Thanksgiving 2026 (Nov 26): the offer is open from Nov 19, but daily mail only
  // for the last 3 days (Nov 24, 25, 26).
  assert.equal(planFor("2026-11-24", "2026-11-23").due, true);
  assert.equal(planFor("2026-11-24", "2026-11-24").due, false);
  assert.equal(planFor("2026-11-24", "2026-11-23").daily, true);
  assert.equal(planFor("2026-11-23", "2026-11-22").due, false); // earlier in the window: every third day
  assert.equal(planFor("2026-11-23", "2026-11-22").daily, false);
  assert.equal(planFor("2026-11-23", "2026-11-20").due, true);
  assert.equal(planFor("2026-11-21", "2026-11-20").due, false);
  // The offer is mentioned throughout the window, daily or not.
  assert.equal(planFor("2026-11-21", "2026-11-18").kind, "holiday");
  assert.equal(planFor("2026-11-24", "2026-11-23").kind, "holiday");
  assert.equal(planFor("2027-02-01", null).kind, "regular");
});

// ---------------------------------------------------------------------------
// Content and composition

test("the library has no prices and makes no absolute security promises", () => {
  const all = JSON.stringify(TOPICS);
  assert.ok(!/\$\d/.test(all), "no dollar amounts in campaign copy");
  assert.ok(!/\d\s*%/.test(all), "the only percentage comes from the offer, not the library");
  for (const banned of [/uncompromis/i, /unhackable/i, /cannot be hacked/i, /100% secure/i, /guarantee/i, /bank-grade/i, /military/i, /soc ?2/i, /iso ?27001/i, /pci/i, /hipaa/i]) {
    assert.ok(!banned.test(all), `banned phrase ${banned}`);
  }
  assert.ok(TOPICS.some((t) => t.id === "security"));
  assert.equal(topicFor(1).id, TOPICS[0].id);
  assert.equal(topicFor(TOPICS.length + 1).id, TOPICS[0].id); // wraps round
});

test("security and quality statements are sourced, specific and free of absolutes", () => {
  const checked = TOPICS.filter((x) => ["security", "quality"].includes(x.id));
  assert.equal(checked.length, 2);
  const absolutes = /\b(never|always|every time|everything|guarantee[ds]?|ensures?|ensured|fully|completely|totally|perfect(ly)?|impossible|unbreakable|bulletproof|100)\b/i;
  for (const topic of checked) {
    assert.ok(topic.items.length >= 3, topic.id);
    for (const item of topic.items) {
      assert.ok(item.source && item.source.length > 15, `${topic.id}: "${item.title}" needs a source`);
      assert.ok(!absolutes.test(`${item.title} ${item.body}`), `${topic.id}: "${item.title}" uses an absolute: ${item.body}`);
    }
    assert.ok(!absolutes.test(`${topic.heading} ${topic.paragraphs.join(" ")}`), `${topic.id} headline or intro uses an absolute`);
  }
  // The source notes are for maintainers and never reach a subscriber.
  const sent = composeCampaign({ plan: planFor("2027-02-01", null), sequence: TOPICS.findIndex((x) => x.id === "security") + 1, subscriber: null });
  assert.ok(!sent.html.includes("server/src") && !sent.text.includes("Terms of Service sections"));
});

test("an email carries the offer, the terms, a postal address and a working unsubscribe", async () => {
  const s = await sub("pat@client.example");
  const plan = planFor("2026-11-24", null);
  const mailOut = composeCampaign({ plan, sequence: 4, subscriber: s });
  assert.match(mailOut.subject, /^10% off for Thanksgiving: /);
  assert.equal(mailOut.offerCode, "THANKSGIVING10");
  assert.ok(mailOut.html.includes("10% off your whole project price"));
  assert.ok(mailOut.html.includes("THANKSGIVING10"));
  assert.ok(mailOut.html.includes("by Thursday, November 26"));
  assert.ok(mailOut.html.includes("cannot be combined with other discounts"));
  assert.ok(mailOut.html.includes("1732 Orlando Dr, Cedar Hill, TX 75104"));
  assert.ok(mailOut.html.includes("promotional email"));
  assert.ok(mailOut.text.includes("Unsubscribe: http://localhost:8000/unsubscribe#"));
  assert.match(mailOut.headers["List-Unsubscribe"], /^<http:\/\/localhost:8000\/api\/newsletter\/unsubscribe\?t=[a-f0-9]{24}\.[\w-]{43}>, <mailto:contact@apsoluts\.com/);
  assert.equal(mailOut.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  // The token in the link belongs to this subscriber and nobody else.
  const token = /unsubscribe#([\w.-]+)/.exec(mailOut.text)[1];
  assert.equal(verifyUnsubscribeToken(token), String(s._id));
  // A regular (non-holiday) email has no offer at all.
  const plain = composeCampaign({ plan: planFor("2027-02-01", null), sequence: 1, subscriber: s });
  assert.ok(!plain.html.includes("offer") || !/% off/.test(plain.html));
  assert.equal(plain.offerCode, null);
  assert.ok(!/% off/.test(plain.subject));
});

test("the layout is a complete light-scheme document, with the offer block only on holiday emails", () => {
  const holiday = composeCampaign({ plan: planFor("2026-11-24", null), sequence: 1, subscriber: { _id: "a".repeat(24), email: "x@y.test" } });
  const plain = composeCampaign({ plan: planFor("2027-02-01", null), sequence: 1, subscriber: { _id: "a".repeat(24), email: "x@y.test" } });
  for (const mail of [holiday, plain]) {
    assert.match(mail.html, /^<!doctype html>/i);
    assert.ok(mail.html.includes('<meta name="color-scheme" content="light only">'));
    assert.ok(mail.html.includes("<table"), "table layout for mail apps");
    assert.ok(mail.html.includes("Georgia"), "serif headline");
    assert.ok(mail.html.includes("A NOTE FROM APEX ROOT SOLUTIONS"));
    assert.ok(mail.html.includes("The Apex Root Solutions team"));
    assert.ok(/display:none;max-height:0/.test(mail.html), "hidden preview line");
    assert.equal((mail.html.match(/<h1/g) ?? []).length, 1);
    assert.ok(!/<script|<form|javascript:/i.test(mail.html));
  }
  assert.ok(holiday.html.includes("A Thanksgiving thank-you"));
  assert.ok(holiday.html.includes("Mention <strong"));
  assert.ok(!plain.html.includes("thank-you"));
  assert.ok(!/% off/.test(plain.html) && !/% off/.test(plain.text));
  // The first topic keeps the owner's wording and its four list items.
  assert.ok(plain.html.includes("Something worth building together."));
  assert.ok(plain.html.includes("Connected experiences"));
  assert.equal((plain.html.match(/&#8599;<\/td>/g) ?? []).length, 4);
});

test("every topic has an eyebrow, a headline, copy, list items and a button", () => {
  for (const t of TOPICS) {
    assert.ok(t.eyebrow && t.heading && t.subject, t.id);
    assert.ok(t.paragraphs.length >= 1 && t.items.length >= 3, t.id);
    for (const item of t.items) assert.ok(item.title && item.body, t.id);
    assert.ok(t.cta.label && t.cta.path.startsWith("/"), t.id);
  }
});

test("an address that looks like markup cannot break the email", () => {
  const html = composeCampaign({ plan: planFor("2027-02-01", null), sequence: 1, subscriber: { _id: "a".repeat(24), email: '"><script>alert(1)</script>@x.test' } }).html;
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("unsubscribe tokens cannot be forged or reused across subscribers", () => {
  const a = "a".repeat(24);
  const b = "b".repeat(24);
  const ta = makeUnsubscribeToken(a);
  assert.equal(verifyUnsubscribeToken(ta), a);
  const [, macA] = ta.split(".");
  assert.equal(verifyUnsubscribeToken(`${b}.${macA}`), null);
  for (const bad of ["", "x", `${a}.`, `${a}.${macA.slice(1)}`, `${a}.${macA}.x`, `${"z".repeat(24)}.${macA}`, "a".repeat(200), null, undefined, 5]) {
    assert.equal(verifyUnsubscribeToken(bad), null);
  }
});

// ---------------------------------------------------------------------------
// Sending

const sender = () => {
  const sent = [];
  const fn = async (message) => {
    sent.push(message);
    return { transport: "test", id: `m${sent.length}` };
  };
  return { sent, fn };
};

test("nothing is sent while scheduled campaigns are off, unconfigured, or before the send hour", async () => {
  await sub("a@x.test");
  const s = sender();
  process.env.CAMPAIGN_EMAILS_ENABLED = "false";
  assert.equal((await runDue({ now: at("2026-11-24"), send: s.fn, delayMs: 0 })).skipped, "disabled");
  delete process.env.CAMPAIGN_EMAILS_ENABLED;
  assert.equal((await runDue({ now: at("2026-11-24"), send: s.fn, delayMs: 0 })).skipped, "disabled");
  process.env.CAMPAIGN_EMAILS_ENABLED = "true";
  assert.equal((await runDue({ now: at("2026-11-24", 14), send: s.fn, delayMs: 0 })).skipped, "before_send_time");
  const saved = process.env.INVOICE_LINK_SECRET;
  delete process.env.INVOICE_LINK_SECRET;
  assert.equal((await runDue({ now: at("2026-11-24"), send: s.fn, delayMs: 0 })).skipped, "no_link_secret");
  process.env.INVOICE_LINK_SECRET = saved;
  assert.equal(s.sent.length, 0);
  assert.equal(await Campaign.countDocuments(), 0);
});

test("a day's email goes to active subscribers once, never to those who unsubscribed", async () => {
  await sub("one@x.test");
  await sub("two@x.test");
  await sub("gone@x.test", { unsubscribedAt: new Date() });
  const s = sender();
  const first = await runDue({ now: at("2026-11-24"), send: s.fn, delayMs: 0 });
  assert.equal(first.sent, 2);
  assert.deepEqual(s.sent.map((m) => m.to).sort(), ["one@x.test", "two@x.test"]);
  for (const m of s.sent) {
    assert.ok(m.headers["List-Unsubscribe"]);
    assert.ok(m.text && m.html);
    assert.match(m.subject, /10% off for Thanksgiving/);
  }
  const again = await runDue({ now: at("2026-11-24", 18), send: s.fn, delayMs: 0 });
  assert.equal(again.skipped, "already_sent_today");
  assert.equal(s.sent.length, 2);
  const campaign = await Campaign.findOne({ key: "2026-11-24" });
  assert.equal(campaign.status, "done");
  assert.equal(campaign.counts.sent, 2);
  assert.equal(campaign.offerCode, "THANKSGIVING10");
  assert.equal(await CampaignSend.countDocuments({ campaignKey: "2026-11-24" }), 2);
});

test("outside a holiday window an email goes out every third day, with a new topic each time", async () => {
  await sub("a@x.test");
  const s = sender();
  const days = ["2027-02-01", "2027-02-02", "2027-02-03", "2027-02-04", "2027-02-05", "2027-02-06", "2027-02-07"];
  const results = [];
  for (const d of days) results.push((await runDue({ now: at(d), send: s.fn, delayMs: 0 })).skipped ?? "sent");
  assert.deepEqual(results, ["sent", "not_due", "not_due", "sent", "not_due", "not_due", "sent"]);
  const topics = (await Campaign.find().sort({ key: 1 })).map((c) => c.topic);
  assert.equal(new Set(topics).size, 3);
  assert.deepEqual(topics, [TOPICS[0].id, TOPICS[1].id, TOPICS[2].id]);
  assert.ok(s.sent.every((m) => !/% off/.test(m.subject)));
});

test("around Thanksgiving: every third day, daily for the last three days, then back to every third day", async () => {
  await sub("a@x.test");
  const s = sender();
  const run = async (d) => (await runDue({ now: at(d), send: s.fn, delayMs: 0 })).skipped ?? "sent";
  const days = ["19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29"].map((d) => `2026-11-${d}`);
  const results = [];
  for (const d of days) results.push(await run(d));
  assert.deepEqual(results, ["sent", "not_due", "not_due", "sent", "not_due", "sent", "sent", "sent", "not_due", "not_due", "sent"]);
  // Every email sent while the offer was open carries it (Nov 19 to 26).
  const subjects = s.sent.map((m) => m.subject);
  assert.equal(subjects.filter((x) => /10% off for Thanksgiving/.test(x)).length, 5);
  assert.ok(!/% off/.test(subjects.at(-1)), "the Nov 29 email is after the offer");
});

test("over a whole year a subscriber gets about one email every 2.6 days, with few daily stretches", () => {
  let last = null;
  let sent = 0;
  let dailyDays = 0;
  for (let d = "2027-01-01"; d < "2028-01-01"; d = addDays(d, 1)) {
    const plan = planFor(d, last);
    if (plan.daily) dailyDays += 1;
    if (plan.due) {
      sent += 1;
      last = d;
    }
  }
  assert.ok(sent <= 145, `${sent} emails in a year is more than intended`);
  assert.ok(sent >= 120);
  assert.ok(dailyDays <= 36, `${dailyDays} days of daily email is more than intended`);
});

test("a failed send is recorded without the address, and is not retried that day", async () => {
  await sub("ok@x.test");
  await sub("bad@x.test");
  const calls = [];
  const flaky = async (m) => {
    calls.push(m.to);
    if (m.to === "bad@x.test") throw new Error("Resend 422: invalid address bad@x.test");
    return { id: "1" };
  };
  const res = await runDue({ now: at("2026-11-24"), send: flaky, delayMs: 0 });
  assert.deepEqual([res.sent, res.failed], [1, 1]);
  const failed = await CampaignSend.findOne({ status: "failed" });
  assert.ok(!failed.error.includes("@"), "no email address in the error");
  assert.equal(failed.error.length <= 60, true);
  await runDue({ now: at("2026-11-24", 20), send: flaky, delayMs: 0 });
  assert.equal(calls.length, 2, "no second attempt for the failed address");
});

test("an interrupted send resumes without repeating anyone", async () => {
  const a = await sub("a@x.test");
  await sub("b@x.test");
  await Campaign.create({ key: "2026-11-24", sequence: 1, kind: "holiday", topic: "services", offerCode: "THANKSGIVING10", subject: "x", status: "sending" });
  await CampaignSend.create({ campaignKey: "2026-11-24", subscriberId: a._id, status: "sent" });
  const s = sender();
  const res = await runDue({ now: at("2026-11-24"), send: s.fn, delayMs: 0 });
  assert.deepEqual(s.sent.map((m) => m.to), ["b@x.test"]);
  assert.equal(res.sent, 1);
});

test("simultaneous runs send each subscriber exactly once", async () => {
  for (let i = 0; i < 6; i++) await sub(`s${i}@x.test`);
  const s = sender();
  await Promise.all(Array.from({ length: 4 }, () => runDue({ now: at("2026-11-24"), send: s.fn, delayMs: 0 })));
  assert.equal(s.sent.length, 6);
  assert.equal(new Set(s.sent.map((m) => m.to)).size, 6);
  assert.equal(await Campaign.countDocuments(), 1);
});

test("the real mailer passes the text body and the one-click unsubscribe headers to Resend", async () => {
  await sub("real@x.test");
  const res = await runDue({ now: at("2026-11-24"), delayMs: 0 }); // default sender = lib/mailer.js, stubbed at the network edge
  assert.equal(res.sent, 1);
  const body = mail.sent[0];
  assert.deepEqual(body.to, ["real@x.test"]);
  assert.ok(body.text.includes("Unsubscribe:"));
  assert.equal(body.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(body.headers["List-Unsubscribe"], /api\/newsletter\/unsubscribe\?t=/);
});

// ---------------------------------------------------------------------------
// Unsubscribe

const unsubscribeVia = (token, mode) =>
  mode === "header"
    ? api.call("POST", "/api/newsletter/unsubscribe", { token: null, headers: { "x-unsubscribe-token": token, "x-forwarded-for": freshIp() }, body: {} })
    : api.call("POST", `/api/newsletter/unsubscribe?t=${token}`, {
        token: null,
        headers: { "x-forwarded-for": freshIp(), "content-type": "application/x-www-form-urlencoded" },
        raw: "List-Unsubscribe=One-Click",
      });

test("unsubscribing works from the page and from a mail app's one-click button, and is repeatable", async () => {
  const a = await sub("a@x.test");
  const b = await sub("b@x.test");
  assert.equal((await unsubscribeVia(makeUnsubscribeToken(a._id), "header")).status, 200);
  assert.ok((await Subscriber.findById(a._id)).unsubscribedAt);
  assert.equal((await unsubscribeVia(makeUnsubscribeToken(a._id), "header")).status, 200); // again: still fine
  assert.equal((await unsubscribeVia(makeUnsubscribeToken(b._id), "query")).status, 200);
  assert.ok((await Subscriber.findById(b._id)).unsubscribedAt);
  // They no longer receive campaign email.
  const s = sender();
  assert.equal((await runDue({ now: at("2026-11-24"), send: s.fn, delayMs: 0 })).sent, 0);
});

test("a forged, borrowed or unknown unsubscribe token changes nothing", async () => {
  const a = await sub("a@x.test");
  const b = await sub("b@x.test");
  const [, macA] = makeUnsubscribeToken(a._id).split(".");
  for (const bad of ["", "garbage", `${b._id}.${macA}`, `${"0".repeat(24)}.${macA}`, makeUnsubscribeToken("c".repeat(24))]) {
    const res = await unsubscribeVia(bad, "header");
    assert.equal(res.status, 404, JSON.stringify(bad));
  }
  assert.equal((await Subscriber.findById(a._id)).unsubscribedAt, null);
  assert.equal((await Subscriber.findById(b._id)).unsubscribedAt, null);
  // An invoice link token is not an unsubscribe token.
  assert.equal((await unsubscribeVia(`${a._id}.${"A".repeat(43)}`, "header")).status, 404);
});

test("signing up again after unsubscribing opts the person back in", async () => {
  const a = await sub("again@x.test", { unsubscribedAt: new Date() });
  const res = await api.call("POST", "/api/newsletter", { token: null, body: { email: "again@x.test" } });
  assert.equal(res.status, 200);
  assert.equal((await Subscriber.findById(a._id)).unsubscribedAt, null);
});

test("the welcome email states the frequency and carries an unsubscribe link", async () => {
  await api.call("POST", "/api/newsletter", { token: null, body: { email: "new@x.test" } });
  await new Promise((r) => setTimeout(r, 300));
  const welcome = mail.sent.find((m) => m.to[0] === "new@x.test");
  assert.ok(welcome, "welcome email sent");
  assert.ok(welcome.html.includes("about one email every three days"));
  assert.ok(welcome.html.includes("10% off"));
  assert.match(welcome.html, /unsubscribe#[a-f0-9]{24}\./);
});

// ---------------------------------------------------------------------------
// Offer codes on quote requests (the clock is held at Nov 24, 2026)

const quoteBody = (over = {}) => ({
  name: "Ada Client",
  email: `ada${Math.random().toString(36).slice(2, 8)}@client.example`,
  requirements: "We need a mobile app that lets customers book appointments and pay deposits.",
  website: "",
  elapsedMs: 9000,
  ...over,
});
const submitQuote = (body) => api.call("POST", "/api/quotes", { token: null, headers: { "x-forwarded-for": freshIp() }, body });

test("a quote request records the offer that was running, and the project carries it", async () => {
  mock.timers.enable({ apis: ["Date"], now: at("2026-11-24", 12) });
  let res;
  try {
    res = await submitQuote(quoteBody({ offerCode: "thanksgiving10" }));
  } finally {
    mock.timers.reset();
  }
  assert.equal(res.status, 201);
  assert.equal(res.data.offer, "applied");
  assert.match(res.data.message, /10% Thanksgiving offer was recorded/);
  const stored = await QuoteRequest.findOne().lean();
  assert.deepEqual(stored.offer, { code: "THANKSGIVING10", holiday: "Thanksgiving", percent: 10, validThrough: "2026-11-26" });

  const list = await api.call("GET", "/api/admin/quotes");
  assert.equal(list.data.quotes[0].offer.percent, 10);
  const project = await api.call("POST", `/api/admin/quotes/${list.data.quotes[0].id}/convert`, { body: {} });
  assert.equal(project.status, 201);
  assert.equal(project.data.offer.code, "THANKSGIVING10");
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(mail.sent.some((m) => /THANKSGIVING10: 10% off the whole project price/.test(m.html)), "admin alert mentions the offer");
});

test("a wrong, expired or out-of-season code never blocks the request and is never recorded", async () => {
  mock.timers.enable({ apis: ["Date"], now: at("2026-11-24", 12) });
  const results = [];
  try {
    for (const code of ["NOPE", "CHRISTMAS10", "THANKSGIVING50", "THANKSGIVING10 ; drop", "<b>x</b>"]) {
      results.push(await submitQuote(quoteBody({ offerCode: code })));
    }
  } finally {
    mock.timers.reset();
  }
  for (const r of results) {
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(r.data.offer, "not_active");
  }
  assert.equal(await QuoteRequest.countDocuments({ offer: { $ne: null } }), 0);

  // Out of season entirely.
  mock.timers.enable({ apis: ["Date"], now: at("2027-02-01", 12) });
  let late;
  try {
    late = await submitQuote(quoteBody({ offerCode: "THANKSGIVING10" }));
  } finally {
    mock.timers.reset();
  }
  assert.equal(late.data.offer, "not_active");
  // And a request with no code at all is unaffected.
  const plain = await submitQuote(quoteBody());
  assert.equal(plain.data.offer, null);
});

test("the discount percentage can only come from the server, never from the request", async () => {
  mock.timers.enable({ apis: ["Date"], now: at("2026-11-24", 12) });
  try {
    await submitQuote(quoteBody({ offerCode: "THANKSGIVING10", offer: { percent: 90, code: "X" }, percent: 90, discount: 90 }));
  } finally {
    mock.timers.reset();
  }
  const stored = await QuoteRequest.findOne().lean();
  assert.equal(stored.offer.percent, 10);
});

// ---------------------------------------------------------------------------
// Admin endpoints

test("campaign admin endpoints need the admin token", async () => {
  for (const [method, path] of [["GET", "/api/admin/campaigns/status"], ["GET", "/api/admin/campaigns/preview"], ["POST", "/api/admin/campaigns/test-send"], ["GET", "/api/admin/campaigns/history"]]) {
    for (const token of [null, "garbage"]) {
      assert.equal((await api.call(method, path, { token, body: method === "POST" ? {} : undefined })).status, 401, `${method} ${path}`);
    }
  }
});

test("status, preview, test send and history", async () => {
  await sub("a@x.test");
  await sub("b@x.test", { unsubscribedAt: new Date() });
  const status = await api.call("GET", "/api/admin/campaigns/status");
  assert.equal(status.status, 200);
  assert.equal(status.data.enabled, true);
  assert.deepEqual(status.data.subscribers, { active: 1, unsubscribed: 1 });
  assert.equal(status.data.discount.maxPercent, 20);
  assert.equal(status.data.schedule.windowDays, 7);
  assert.equal(status.data.schedule.dailyDays, 3);
  for (const secret of [process.env.INVOICE_LINK_SECRET, process.env.RESEND_API_KEY]) assert.ok(!status.text.includes(secret));

  const preview = await api.call("GET", "/api/admin/campaigns/preview?date=2026-12-20");
  assert.equal(preview.status, 200);
  assert.match(preview.data.subject, /10% off for Christmas Day/);
  assert.equal(preview.data.offerCode, "CHRISTMAS10");
  assert.equal((await api.call("GET", "/api/admin/campaigns/preview?date=2026-13-45")).status, 400);
  assert.equal((await api.call("GET", "/api/admin/campaigns/preview?date=2027-02-01")).data.offerCode, null);

  mail.clear();
  const test = await api.call("POST", "/api/admin/campaigns/test-send");
  assert.equal(test.status, 200);
  assert.equal(mail.sent.length, 1);
  assert.deepEqual(mail.sent[0].to, ["admin@example.test"]);
  assert.match(mail.sent[0].subject, /^\[TEST\] /);
  assert.equal(await Campaign.countDocuments(), 0, "a test send is not recorded as a campaign");

  await runDue({ now: at("2026-11-24"), send: sender().fn, delayMs: 0 });
  const history = await api.call("GET", "/api/admin/campaigns/history");
  assert.equal(history.data.campaigns.length, 1);
  assert.equal(history.data.campaigns[0].kind, "holiday");
});
