import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { configureEnv, makeCaller, startDb } from "./helpers.js";

configureEnv();
const { app } = await import("../src/app.js");
const { composeOutreach, maskEmail, outreachAudience, runOutreach, OUTREACH_KEY } = await import("../src/campaigns/outreach.js");
const { makeOptOutToken } = await import("../src/campaigns/unsubscribe.js");
const { Subscriber } = await import("../src/models/Subscriber.js");
const { OptOut } = await import("../src/models/OptOut.js");
const { OneOffSend } = await import("../src/models/OneOffSend.js");
const { QuoteRequest } = await import("../src/models/QuoteRequest.js");
const { limiter: unsubLimiter } = await import("../src/controllers/newsletter/unsubscribe.js");

const run = promisify(execFile);
let db;
const api = makeCaller(app);

before(async () => {
  db = await startDb("outreach");
});
after(async () => {
  await db.stop();
});
beforeEach(async () => {
  await db.clear();
  unsubLimiter.reset();
});

const confirmed = (email, extra = {}) => Subscriber.create({ email, confirmedAt: new Date(), ...extra });
const quote = (email) => QuoteRequest.create({ name: "Q", email, requirements: "x".repeat(30), fingerprint: `${email}-${Math.random()}` });
const sender = (failFor = []) => {
  const sent = [];
  return {
    sent,
    fn: async (m) => {
      if (failFor.includes(m.to)) throw new Error(`Resend 422 for ${m.to}`);
      sent.push(m);
      return { transport: "test", id: "x" };
    },
  };
};
const quiet = () => {};

test("addresses are masked in logs", () => {
  assert.equal(maskEmail("john.doe@gmail.com"), "jo***@gm***.com");
  assert.equal(maskEmail("a@b.co.uk"), "a***@b***.co.uk");
});

test("the audience is confirmed subscribers and quote requesters, minus unsubscribed, opted-out and excluded", async () => {
  await confirmed("sub@x.test");
  await confirmed("both@x.test");
  await quote("both@x.test");
  await Subscriber.create({ email: "pending@x.test" }); // never confirmed
  await confirmed("left@x.test", { unsubscribedAt: new Date() });
  await quote("left@x.test"); // a quote request does not override an unsubscribe
  await quote("quote@x.test");
  await quote("QUOTE@x.test");
  await quote("blocked@x.test");
  await OptOut.create({ email: "blocked@x.test" });
  await quote("reviewed@x.test");

  const audience = await outreachAudience({ exclude: ["Reviewed@X.test"] });
  const by = Object.fromEntries(audience.map((a) => [a.email, a.reason]));
  assert.deepEqual(by, { "sub@x.test": "subscriber", "both@x.test": "subscriber", "quote@x.test": "quote" });
});

test("the message asks what the person needs, links the landing page, and carries its own opt-out", () => {
  const m = composeOutreach({ recipient: { email: "Pat@x.test", reason: "quote" } });
  assert.equal(m.subject, "What does your next project need?");
  assert.equal(m.replyTo, "contact@apsoluts.com");
  for (const part of [m.html, m.text]) {
    assert.ok(part.includes("what do you need, and how can we help"));
    assert.ok(part.includes("/web-app-landing"));
    assert.ok(part.includes("Windows"));
    assert.ok(part.includes("1732 Orlando Dr, Cedar Hill, TX 75104"));
    assert.ok(part.includes("you sent us a quote request"));
  }
  assert.ok(m.html.includes("mailto:contact@apsoluts.com"));
  assert.match(m.headers["List-Unsubscribe"], /api\/newsletter\/unsubscribe\?t=/);
  assert.equal(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(!/\b(always|never|guarantee|100%)\b/i.test(m.text));
  const copy = composeOutreach({ recipient: { email: "o@x.test", reason: "subscriber" }, copy: true });
  assert.equal(copy.subject, "[Copy] What does your next project need?");
});

test("the opt-out link in the message works for someone who is not a subscriber", async () => {
  const m = composeOutreach({ recipient: { email: "quote@x.test", reason: "quote" } });
  const token = decodeURIComponent(m.headers["List-Unsubscribe"].match(/\?t=([^>]+)>/)[1]);
  assert.equal(token, makeOptOutToken("quote@x.test"));
  const res = await api.call("POST", `/api/newsletter/unsubscribe?t=${token}`, { token: null, headers: { "x-forwarded-for": "198.51.100.9" }, body: {} });
  assert.equal(res.status, 200);
  assert.equal(await OptOut.countDocuments({ email: "quote@x.test" }), 1);
  assert.deepEqual(await outreachAudience(), []);
});

test("a dry run sends nothing and lists addresses masked", async () => {
  await confirmed("sub@x.test");
  const s = sender();
  const lines = [];
  const out = await runOutreach({ mode: "dry-run", send: s.fn, delayMs: 0, log: (l) => lines.push(l) });
  assert.equal(out.audience, 1);
  assert.equal(s.sent.length, 0);
  assert.equal(await OneOffSend.countDocuments(), 0);
  assert.ok(lines.some((l) => l.includes("su***@x***.test")));
  assert.ok(!lines.join("\n").includes("sub@x.test"));
});

test("test mode sends only the owner's copy", async () => {
  await confirmed("sub@x.test");
  const s = sender();
  const out = await runOutreach({ mode: "test", send: s.fn, delayMs: 0, log: quiet });
  assert.equal(out.sent, 1);
  assert.deepEqual(s.sent.map((m) => m.to), ["admin@example.test"]);
  assert.match(s.sent[0].subject, /^\[Copy\]/);
});

test("a real run sends the owner's copy first, then each person once, and is safe to repeat", async () => {
  await confirmed("sub@x.test");
  await quote("quote@x.test");
  const s = sender();
  const out = await runOutreach({ mode: "send", send: s.fn, delayMs: 0, log: quiet });
  assert.equal(out.sent, 2);
  assert.deepEqual(s.sent.map((m) => m.to), ["admin@example.test", "sub@x.test", "quote@x.test"]);
  for (const m of s.sent) assert.ok(m.headers["List-Unsubscribe"]);

  const again = await runOutreach({ mode: "send", send: s.fn, delayMs: 0, log: quiet });
  assert.equal(again.sent, 0);
  assert.equal(again.skipped, 2);
  assert.equal(s.sent.length, 3, "nobody is emailed twice");
  const rows = await OneOffSend.find().lean();
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.key === OUTREACH_KEY && r.status === "sent" && !JSON.stringify(r).includes("@")), "only hashes are stored");
});

test("if the owner's copy fails, nobody else is emailed", async () => {
  await confirmed("sub@x.test");
  const s = sender(["admin@example.test"]);
  const out = await runOutreach({ mode: "send", send: s.fn, delayMs: 0, log: quiet });
  assert.equal(out.stopped, true);
  assert.equal(s.sent.length, 0);
});

test("one failed recipient is recorded and does not stop the rest", async () => {
  await confirmed("bad@x.test");
  await confirmed("good@x.test");
  const s = sender(["bad@x.test"]);
  const out = await runOutreach({ mode: "send", send: s.fn, delayMs: 0, log: quiet });
  assert.equal(out.sent, 1);
  assert.equal(out.failed, 1);
  const failed = await OneOffSend.findOne({ status: "failed" }).lean();
  assert.ok(failed.error && !failed.error.includes("@"));
});

test("the clean-up script removes bot signups only when applied, and confirms older subscribers", async () => {
  await Subscriber.create({ email: "bot1@x.test", createdAt: new Date("2026-11-25T08:00:00Z") });
  await Subscriber.create({ email: "bot2@x.test", createdAt: new Date("2026-11-25T08:05:00Z") });
  await Subscriber.create({ email: "old@x.test", createdAt: new Date("2026-06-01T00:00:00Z") });
  const base = ["scripts/clean-subscribers.js", "--bots=bot1@x.test,bot2@x.test", "--grandfather-before=2026-11-25"];
  const env = { ...process.env };

  const dry = await run("node", base, { env });
  assert.match(dry.stdout, /Dry run: nothing changed/);
  assert.ok(!dry.stdout.includes("bot1@x.test"), "addresses are masked");
  assert.equal(await OptOut.countDocuments(), 0);
  assert.equal(await Subscriber.countDocuments({ unsubscribedAt: { $ne: null } }), 0);

  const done = await run("node", [...base, "--apply"], { env });
  assert.match(done.stdout, /2 removed from mailings, 1 confirmed/);
  assert.equal(await OptOut.countDocuments(), 2);
  const bot = await Subscriber.findOne({ email: "bot1@x.test" });
  assert.ok(bot.unsubscribedAt);
  assert.equal(bot.suppressedReason, "bot signup");
  assert.ok((await Subscriber.findOne({ email: "old@x.test" })).confirmedAt);
  assert.equal((await Subscriber.findOne({ email: "bot1@x.test" })).confirmedAt, null);

  const repeat = await run("node", [...base, "--apply"], { env });
  assert.match(repeat.stdout, /0 removed from mailings, 0 confirmed|already removed/);
});
