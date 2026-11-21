# Quotes, invoices and online payments

Custom-project billing for apsoluts.com: visitors request a quote, an administrator
turns it into a project with agreed scope and payment milestones, issues invoices,
and clients pay them on Stripe's hosted checkout.

**Status: built and tested in Stripe test mode only.** Nothing here takes real money
until you complete [Going live](#going-live).

Established with the owner: business in the **United States**, billing currency
**USD**, provider **Stripe**.

## How it works

1. **Quote request** — a visitor fills in `/quote` (name, email, requirements, optional
   budget). It is saved, and the administrator is emailed through the existing mail
   service.
2. **Project** — at `/admin/billing` the administrator opens the request, chooses
   *Create project*, and records scope, deliverables, total price, timeline and
   payment milestones (deposit / milestone / final).
3. **Acceptance** — the administrator records that the client accepted the scope
   (who, how, when, reference). The accepted terms are fingerprinted (SHA-256) and
   locked. Invoices cannot be created before this.
4. **Invoice** — one invoice per milestone. A draft can be edited; *Issue* assigns the
   number (`INV-2026-0001`) and freezes the amount, currency, description and your
   business details. The amount always comes from the milestone, never from a request.
5. **Send** — copy the private link, or *Email to client* (uses the existing mailer;
   nothing is emailed to a client unless you press that button).
6. **Pay** — the client opens the link, reviews the invoice and presses *Pay invoice*,
   which opens Stripe Checkout. Card details go to Stripe only.
7. **Confirm** — Stripe calls our webhook. After the signature is verified and the
   amount, currency and invoice are checked, the invoice becomes **paid**, the client
   page shows the confirmation and the administrator is emailed.

### Invoice states

| State | Meaning |
| --- | --- |
| `draft` | Being prepared. No number, no client link. Can be edited or deleted. |
| `unpaid` | Issued and payable. |
| `overdue` | `unpaid` with a due date before today (UTC). **Derived**, not stored, so no scheduled job is needed. Filterable in the admin list. |
| `paid` | Confirmed by a verified Stripe event. |
| `void` | Cancelled. Cannot be paid. |

**Corrections:** an issued invoice cannot be edited (only its due date can move). Use
*Void & reissue*: the old invoice is voided (its open checkout is closed at Stripe) and a
replacement draft is created from the same milestone, linked both ways. A **paid**
invoice cannot be voided; refund it in Stripe.

**Refunds and disputes** never change `paid` to anything else and never mark anything
paid. A refund is shown beside the paid invoice (and a full refund frees the milestone
to be invoiced again). A dispute raises a flag and an alert; respond in the Stripe
dashboard. Money that arrives for a voided invoice, or twice for one invoice, is
flagged **Action needed** on the invoice and emailed to you: refund it in Stripe.

### Client access (no accounts)

The site has no client login, so each invoice has a private link:
`https://www.apsoluts.com/invoice#<invoiceId>.<mac>` where `mac` is an HMAC-SHA256
(256 bits) of the invoice id and a link version, keyed by `INVOICE_LINK_SECRET`.

* The token is in the URL **fragment**, so browsers never send it to any server and it
  does not appear in Vercel or Render logs. The page sends it to the API in an
  `X-Invoice-Token` header.
* A link opens exactly one invoice. Wrong, truncated, forged, revoked and unknown
  tokens, and drafts, all get the same `404`.
* *New link* invalidates every earlier link; *Disable link* turns the link off.
* Nothing secret is stored, so you can always copy the current link again.

## Security notes

* Admin endpoints are under `/api/admin/*`; every one sits behind the existing admin
  token check on the **server**. Tests assert a `401` for each route without a valid token.
* Checkout sessions are created server-side from database values. The browser sends no
  amount, currency or invoice id.
* The Stripe secret key lives only in the server environment. It is never in a response,
  log line or error message.
* The webhook reads the raw body, verifies `Stripe-Signature` (5-minute tolerance) and
  returns `400` otherwise. Test-mode events are refused when a live key is configured
  and the reverse.
* Every Stripe event id is stored once (unique index); a redelivery is a no-op, and a
  failure to apply returns `500` so Stripe retries. State changes use conditional
  updates, so concurrent deliveries cannot double-apply.
* A paid invoice requires `session.payment_status == "paid"`, matching session id,
  `client_reference_id`, invoice id metadata, amount **and** currency. A mismatch marks
  nothing paid and alerts you.
* Delayed payment methods stay `unpaid` ("processing") until Stripe confirms.
* Money is integer minor units end to end (`amountMinor`); decimal text from forms is parsed digit by digit.
  API amounts must be JSON **strings** (`"1500.00"`), never numbers. Limits: 50 cents to $999,999.99.
* The public quote form uses a honeypot field, a minimum fill time, limits per address
  (5/h), per email (3/day) and overall (100/h), strict length limits and duplicate
  suppression. A trapped bot receives the normal success reply and nothing is stored.
  Limits are held in memory (one Render instance); add a shared store if you scale out.
* Logs contain event ids, outcomes and status codes only: no keys, invoice links, card
  data, client emails or webhook payloads. Stripe events are stored without their payloads.

## Setup

### 1. Run the migration

```bash
cd server && npm run migrate
```

Locally this reads `MONGO_DB_URL` from `server/.env`. On Render, open the service's **Shell** tab and run
the same command from the `server` directory: there is no `.env` file there, so it uses the service's
environment variables. Success prints `Applied 1 migration(s).`; repeating it prints `Nothing to apply.`

It creates the billing collections and their unique indexes and is safe to repeat.

### 2. Set environment variables (Render → apex-root-api → Environment)

`server/.env.example` documents every variable. **You must supply:**

| Variable | What to put | Why it is required |
| --- | --- | --- |
| `BUSINESS_LEGAL_NAME` | Exact legal name of the invoicing entity | Printed on invoices; issuing is blocked without it |
| `BUSINESS_ADDRESS` | Postal address, `\|` between lines | Same |
| `BUSINESS_EMAIL` | Billing contact address | Same |
| `INVOICE_LINK_SECRET` | 32+ random characters (`openssl rand -base64 48`); the blueprint generates one | Signs client links |
| `STRIPE_SECRET_KEY` | **Test** secret key `sk_test_…` | Creates checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` of the webhook endpoint (step 3) | Verifies webhooks |

Optional: `BUSINESS_PHONE`, `BUSINESS_TAX_ID`, `INVOICE_TAX_NOTE`, `ADMIN_NOTIFY_EMAIL`,
`INVOICE_PREFIX`, `INVOICE_DEFAULT_DUE_DAYS`, `SITE_URL` (defaults to `https://www.apsoluts.com` in production).
Enter secrets in the Render dashboard, never in chat or in git.

> **Tax and legal text:** this software calculates no tax and prints no legal wording of
> its own. Decide with your accountant whether prices include tax; if invoices must show
> a tax line, number or terms, put them in `BUSINESS_TAX_ID` / `INVOICE_TAX_NOTE`, which
> print exactly as written. Payment terms and acceptance wording are yours to supply.

### 3. Create the Stripe test webhook

In the Stripe dashboard switch to **Test mode**, then Developers → Webhooks → Add endpoint:

* **URL:** `https://apex-root-api.onrender.com/api/webhooks/stripe` — point it at Render
  directly, not through the Vercel `/api` rewrite, so the signed body arrives untouched.
* **Events:**
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`,
  `payment_intent.payment_failed`, `charge.refunded`,
  `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`.
* Copy the endpoint's **signing secret** into `STRIPE_WEBHOOK_SECRET`.

### 4. Try it (test mode)

1. Submit `/quote`, then open `/admin/billing` (same login as `/admin/subscribers`).
   The setup panel at the top lists anything still missing.
2. Create the project, add milestones adding up to the price, record acceptance.
3. Create an invoice for a milestone, *Issue*, open the client link.
4. Press *Pay invoice* and pay with test card `4242 4242 4242 4242` (any future expiry, any CVC).
   Other cards: `4000 0000 0000 9995` declines for insufficient funds;
   `4000 0000 0000 0341` attaches but fails on charge. The invoice turns **paid** once the webhook arrives.
5. In Stripe, refund the payment: the invoice shows the refund and stays paid.

Local development: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` prints a
`whsec_…` to use as `STRIPE_WEBHOOK_SECRET` in `server/.env`.

## Going live

Not done, and not enabled. When you decide to:

1. Finish Stripe account activation (business details, bank account) in the dashboard.
2. Supply the business details above; have an accountant confirm tax/terms wording.
3. Create a **live-mode** webhook endpoint (same URL and events) and copy its secret.
4. In Render set `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET` (live) **and** `STRIPE_ENABLE_LIVE=true`.
   Without that last flag a live key is refused.
5. Make one small real payment to yourself, confirm it shows **paid**, then refund it.

## Tests

```bash
cd server && npm test
```

51 tests against a throwaway MongoDB (downloaded by `mongodb-memory-server` on first run) and a fake Stripe
HTTP server that the real Stripe SDK talks to. They cover money arithmetic, authorization on every admin route,
token isolation between invoices, spam protection, project/invoice rules and immutability, checkout creation
(amount from the database, minor units, reuse, failure), webhook signature verification, the complete
test-payment flow, duplicate and concurrent events, mismatched payments, delayed/failed/expired payments,
refunds, disputes, payments after void, and that logs contain no secrets.
They do **not** talk to Stripe itself: step 4 above is the real end-to-end check.

## Known limits

* Dates are calendar dates in UTC; an invoice is overdue from the day after its due date (UTC).
* Single currency per deployment (`BILLING_CURRENCY`); project prices cannot be edited after acceptance
  (withdraw acceptance first, possible only while no invoices exist).
* No client-facing receipts are sent by us; turn on Stripe's receipt emails in the dashboard if you want them.
* A full refund leaves the invoice marked `paid` with the refund shown; the milestone can then be invoiced again.
* Rate limits are per process (see above).
