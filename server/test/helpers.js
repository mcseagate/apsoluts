import http from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import Stripe from "stripe";

// Shared test scaffolding: a throwaway MongoDB, a fake Stripe API server that the
// real Stripe SDK talks to, signed webhook delivery, and a capture of outgoing mail.

export const ADMIN = { email: "owner@example.test", password: "correct horse battery staple" };
export const WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests_only";

export function configureEnv(overrides = {}) {
  Object.assign(process.env, {
    NODE_ENV: "test",
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
    ADMIN_TOKEN_SECRET: "x".repeat(48),
    INVOICE_LINK_SECRET: "y".repeat(48),
    BUSINESS_LEGAL_NAME: "Test Business LLC",
    BUSINESS_ADDRESS: "1 Test Street|Testville, TS 00000",
    BUSINESS_EMAIL: "billing@example.test",
    BILLING_CURRENCY: "USD",
    SITE_URL: "http://localhost:8000",
    STRIPE_SECRET_KEY: "sk_test_" + "a".repeat(24),
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    RESEND_API_KEY: "re_test_key",
    ADMIN_NOTIFY_EMAIL: "admin@example.test",
    ...overrides,
  });
}

export async function startDb(name) {
  const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 120000 } });
  process.env.MONGO_DB_URL = `${mongod.getUri()}${name}`;
  const { connectDb } = await import("../src/config/db.js");
  await connectDb();
  // Build every index (the unique ones are part of what is under test).
  const { migrate } = await import("../scripts/migrate.js");
  await migrate(() => {});
  return {
    mongod,
    async clear() {
      for (const c of Object.values(mongoose.connection.collections)) {
        if (c.collectionName !== "schema_migrations") await c.deleteMany({});
      }
    },
    async stop() {
      await mongoose.disconnect();
      await mongod.stop();
    },
  };
}

// Mail: the mailer calls Resend over fetch. Intercept just that URL.
export function captureMail() {
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("https://api.resend.com/")) {
      sent.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: `mail_${sent.length}` }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return realFetch(url, init);
  };
  return {
    sent,
    clear: () => (sent.length = 0),
    restore: () => (globalThis.fetch = realFetch),
  };
}

// --- Fake Stripe API -----------------------------------------------------

function parseForm(body) {
  const out = {};
  for (const [rawKey, value] of new URLSearchParams(body)) {
    const path = rawKey.replace(/\]/g, "").split("[");
    let node = out;
    path.forEach((part, i) => {
      if (i === path.length - 1) node[part] = value;
      else node = node[part] ??= {};
    });
  }
  return out;
}

export async function startFakeStripe() {
  const sessions = new Map();
  const requests = [];
  let counter = 0;
  const failNext = { create: false, expire: false };

  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      const params = req.method === "POST" ? parseForm(raw) : {};
      requests.push({ method: req.method, url: req.url, params, idempotencyKey: req.headers["idempotency-key"], auth: req.headers.authorization });
      const send = (status, obj) => {
        res.writeHead(status, { "content-type": "application/json", "request-id": "req_fake" });
        res.end(JSON.stringify(obj));
      };
      const create = req.method === "POST" && req.url === "/v1/checkout/sessions";
      const one = /^\/v1\/checkout\/sessions\/([^/]+)(\/expire)?$/.exec(req.url);
      if (create) {
        if (failNext.create) {
          failNext.create = false;
          return send(500, { error: { type: "api_error", message: "boom with secret details" } });
        }
        counter += 1;
        const id = `cs_test_${counter}`;
        const item = params.line_items?.[0]?.price_data;
        const session = {
          id,
          object: "checkout.session",
          mode: params.mode,
          status: "open",
          payment_status: "unpaid",
          url: `https://checkout.stripe.test/c/pay/${id}`,
          amount_total: Number(item?.unit_amount),
          currency: item?.currency,
          client_reference_id: params.client_reference_id,
          metadata: params.metadata ?? {},
          payment_intent: null,
          expires_at: Number(params.expires_at),
          success_url: params.success_url,
          cancel_url: params.cancel_url,
          _params: params,
        };
        sessions.set(id, session);
        return send(200, session);
      }
      if (one && req.method === "GET") {
        const s = sessions.get(one[1]);
        return s ? send(200, s) : send(404, { error: { type: "invalid_request_error", code: "resource_missing", message: "No such session" } });
      }
      if (one && one[2] && req.method === "POST") {
        const s = sessions.get(one[1]);
        if (!s) return send(404, { error: { type: "invalid_request_error", code: "resource_missing", message: "No such session" } });
        if (failNext.expire || s.status !== "open") {
          failNext.expire = false;
          return send(400, { error: { type: "invalid_request_error", message: "Only open sessions can be expired." } });
        }
        s.status = "expired";
        return send(200, s);
      }
      send(404, { error: { type: "invalid_request_error", message: "unknown route" } });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const client = new Stripe(process.env.STRIPE_SECRET_KEY, { host: "127.0.0.1", port, protocol: "http", maxNetworkRetries: 0 });
  return {
    client,
    sessions,
    requests,
    failNext,
    reset() {
      sessions.clear();
      requests.length = 0;
      counter = 0;
    },
    // What the customer's payment would do to the session at Stripe.
    complete(id, { paymentStatus = "paid", intent = `pi_test_${id}` } = {}) {
      const s = sessions.get(id);
      s.status = "complete";
      s.payment_status = paymentStatus;
      s.payment_intent = intent;
      return s;
    },
    stop: () => new Promise((r) => server.close(r)),
  };
}

// --- HTTP helpers ----------------------------------------------------------

export function makeCaller(app) {
  let adminToken = null;
  return {
    async login() {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ADMIN),
      });
      adminToken = (await res.json()).data.token;
      return adminToken;
    },
    async call(method, path, { body, token = adminToken, headers = {}, raw } = {}) {
      const h = { ...headers };
      if (token) h.authorization = `Bearer ${token}`;
      if (body !== undefined && raw === undefined) h["content-type"] = "application/json";
      const res = await app.request(path, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* not json */
      }
      return { status: res.status, json, data: json?.data, error: json?.error, headers: res.headers, text };
    },
  };
}

// --- Webhook delivery --------------------------------------------------------

let eventCounter = 0;

export function makeEvent(type, object, { id, livemode = false } = {}) {
  eventCounter += 1;
  return { id: id ?? `evt_test_${eventCounter}`, object: "event", type, livemode, api_version: "2025-01-01", created: Math.floor(Date.now() / 1000), data: { object } };
}

export function signedWebhookRequest(event, { secret = WEBHOOK_SECRET, timestamp } = {}) {
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp });
  return { payload, header };
}

export async function deliver(app, event, opts = {}) {
  const { payload, header } = signedWebhookRequest(event, opts);
  const res = await app.request("/api/webhooks/stripe", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": header },
    body: payload,
  });
  return { status: res.status, json: await res.json() };
}

// The session object Stripe would put in checkout.session.completed.
export function completedSession(fake, id, overrides = {}) {
  const s = fake.sessions.get(id);
  const { _params, ...rest } = s;
  return { ...rest, status: "complete", payment_status: "paid", payment_intent: s.payment_intent ?? `pi_test_${id}`, ...overrides };
}
