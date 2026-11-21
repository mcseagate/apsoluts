// Starts the API on port 3000 against a throwaway MongoDB and a FAKE Stripe, with
// outgoing email captured instead of sent, so the whole flow can be driven from a
// browser with no credentials and no real charges:
//
//   node test/harness.js
//
// GET http://localhost:3000/__harness/pay?session=cs_test_1[&status=unpaid]
//   plays what Stripe would do after the customer pays: completes the session and
//   delivers a correctly signed webhook.
// GET /__harness/mail   shows the emails that would have been sent.
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { captureMail, completedSession, configureEnv, deliver, makeEvent, startDb, startFakeStripe } from "./helpers.js";

configureEnv({ SITE_URL: "http://localhost:8000", BUSINESS_LEGAL_NAME: "Harness Business LLC" });
await startDb("harness");
const mail = captureMail();
const fake = await startFakeStripe();
const { __setStripeForTests } = await import("../src/services/stripe.js");
__setStripeForTests(fake.client);
const { app: api } = await import("../src/app.js");

const outer = new Hono();
outer.get("/__harness/pay", async (c) => {
  const id = c.req.query("session");
  if (!fake.sessions.has(id)) return c.json({ error: "no such session" }, 404);
  const paymentStatus = c.req.query("status") === "unpaid" ? "unpaid" : "paid";
  fake.complete(id, { paymentStatus });
  const result = await deliver(api, makeEvent("checkout.session.completed", completedSession(fake, id, { payment_status: paymentStatus })));
  return c.json(result);
});
outer.get("/__harness/mail", (c) => c.json(mail.sent.map((m) => ({ to: m.to, subject: m.subject }))));
outer.get("/__harness/sessions", (c) => c.json([...fake.sessions.values()].map(({ _params, ...s }) => s)));
outer.route("/", api);

serve({ fetch: outer.fetch, port: 3000 });
console.log("Harness API on http://localhost:3000  admin:", process.env.ADMIN_EMAIL, "/", process.env.ADMIN_PASSWORD);
