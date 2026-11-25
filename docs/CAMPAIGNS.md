# Scheduled campaign emails and holiday offers

The server emails subscribers about what Apex Root Solutions builds and how it builds it
(technology, quality, security). One email goes out about every **3 days**. A holiday offer of
**10% off the whole project price** opens **7 days before each US federal holiday** and is
mentioned in every email sent while it is open, but emails go **daily only for the last 3 days**
(the holiday included). No offer can ever exceed **20%** in total. Over a year that is roughly
140 emails, one every 2.6 days, with about 34 days of daily email.

**Status: built and tested; sending is OFF by default.** Nothing is emailed to subscribers
until you set `CAMPAIGN_EMAILS_ENABLED=true` on the server (see [Turning it on](#turning-it-on)).

## What it does

* **Schedule.** The server checks every 10 minutes. From `CAMPAIGN_SEND_HOUR_UTC` (default 15:00 UTC, 9 AM
  US Central) an email is sent if one is due: daily for the last `HOLIDAY_DAILY_DAYS` days (default 3) before a holiday, otherwise when 3 days
  have passed since the last one. Dates are calendar dates in UTC, so a "3-day" gap does not break at month ends.
* **Holidays.** The eleven federal holidays: New Year's Day, Martin Luther King Jr. Day, Presidents' Day, Memorial Day,
  Juneteenth, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas Day. Dates are computed by
  code, with the federal weekend rule (Saturday observed Friday, Sunday observed Monday). The window runs from
  `HOLIDAY_WINDOW_DAYS` (default 7, allowed 1 to 14) days before the observed day through that day. Emails are daily only in the last
  `HOLIDAY_DAILY_DAYS` days of it (default 3, never longer than the window); earlier in the window they stay on the every-third-day
  rhythm. Where two windows
  touch, the earlier holiday wins, so only one offer runs at a time.
* **The offer.** `10% off the whole project price`, code `<HOLIDAY><PERCENT>` such as `THANKSGIVING10`, for quote
  requests received by the observed day. The email prints the terms: it applies to the total price in the written quote,
  one offer per project, not combined with other discounts.
* **The 20% cap.** The percentage is set in code (`campaigns/offers.js`) from `HOLIDAY_DISCOUNT_PERCENT` and clamped to
  20. Offers do not stack: one holiday is active at a time and a quote records at most one. Composing an email with a
  percentage above 20 throws. The percentage can never come from a form or a request.
* **Content.** Ten topics rotate in order (services, web, mobile, security, Windows, quality, backend, process,
  e-commerce, support), one per email, written in `campaigns/content.js`. They contain **no prices** (the pricing page is
  the one source) and no guarantees.
* **Redeeming.** The email links to `/quote?offer=CODE`; the quote form fills the code in. The server checks it against the
  offer running that day and records it on the request. A wrong or expired code never blocks the request. In
  `/admin/billing` the request and the project show the offer, and the project panel has a calculator that turns a list price
  into the discounted price. **It changes no amount by itself**: you set the price, and the offer must be honoured and written into
  the Project Agreement.

## Unsubscribing and compliance

* Every email has a postal address, says it is promotional, and has an **Unsubscribe** link to `/unsubscribe#<token>` (a page
  with a button) plus the `List-Unsubscribe` and `List-Unsubscribe-Post` headers, which give mail apps a one-click button.
* The token is `<subscriberId>.<HMAC>` signed with `INVOICE_LINK_SECRET` under its own label. It cannot be forged or used for
  anyone else, and unsubscribing is safe to repeat. Unsubscribed people are never emailed again; signing up again opts them back in.
* The signup form and the welcome email state the frequency ("about every three days, daily before US federal holidays")
  and mention the holiday offer. **Subscribers who signed up under the old wording** have no confirmation: see below.
* Not built yet: handling of bounces and spam complaints from Resend (suppressing those addresses automatically). At a handful
  of subscribers this does not matter; add it before the list grows. A failed send is recorded and not retried that day.
* This is not legal advice. CAN-SPAM requires, among other things, honest subject lines, a valid postal address and honoring
  unsubscribes within 10 business days; have your accountant or lawyer review the offer terms and wording.

## Who can be emailed: double opt-in, opt-outs and bot defences

The public forms are targets for "subscription bombing": bots type real people's addresses into signup and contact forms
(on 2026-11-25 a burst of nonsense entries using third-party addresses arrived). Emailing such addresses would harm those people
and damage the sender's reputation, so:

* **Double opt-in.** The newsletter form stores an address as *pending* and sends one message with a **Confirm subscription** link
  (`/confirm#<token>`, a page with a button, so mail scanners that open links cannot confirm for anyone). Only after the click does
  the address get the welcome email, campaign emails, and an alert to you. The reply to the form is identical whether or not the
  address was new, one confirmation goes to an address per 24 hours, and an unanswered request never leads to further mail.
* **Eligibility.** `deliverableSubscribers()` (`lib/subscribers.js`) is the one place that decides who receives marketing email:
  confirmed, not unsubscribed, not on the do-not-email list (`optouts`). The scheduler and the one-off message both use it.
* **Opt-outs for non-subscribers.** One-off messages carry an opt-out token (`<base64url(email)>.<HMAC>`) that works for people who
  are not on the list, such as quote requesters. It adds the address to `optouts`, and every send path checks that list.
  Subscribing again and confirming lifts it. Subscriber, confirm and opt-out tokens use different labels and cannot be swapped.
* **Bot defences on both forms** (the contact form, the newsletter form, and the quote form which already had them): a hidden
  `website` field, a minimum 2.5 s between the form appearing and being sent (bots get the normal success reply and nothing happens),
  limits per network address (5/hour), per email address (3/day) and overall, strict lengths, and on the contact form a message and
  name that must contain real words. Contact-form content is HTML-escaped in the email to you.
* The admin **Subscribers** page shows each address as Pending, Confirmed or Unsubscribed, and **Campaigns** shows the pending count.
* Not done: a CAPTCHA (Cloudflare Turnstile is free and would need a site key from you) if bots adapt to the checks above.

### Cleaning up after an attack, and the one-off message

Run in the Render shell (`cd server`). Both scripts do a **dry run unless told otherwise**, mask addresses in their output, and never
store an address in the repository.

```
node scripts/clean-subscribers.js --bots=a@x.com,b@y.com --grandfather-before=2026-11-25          # look first
node scripts/clean-subscribers.js --bots=a@x.com,b@y.com --grandfather-before=2026-11-25 --apply  # then do it
node scripts/send-outreach.js                 # who would get "What does your next project need?" (nothing sent)
node scripts/send-outreach.js --test          # sends only your copy
node scripts/send-outreach.js --send          # your copy first, then everyone listed (add --exclude=a@x.com to leave people out)
```

`clean-subscribers` marks bot signups unsubscribed (reason "bot signup") and adds them to the do-not-email list; it deletes nothing. Subscribers
who signed up before `--grandfather-before` and are not listed as bots are treated as confirmed. The outreach message goes to confirmed
subscribers and quote requesters only (contact-form senders are not stored, so there is no list to send to), carries its own opt-out
link and `List-Unsubscribe` header, replies to `contact@apsoluts.com`, and is recorded per recipient (by hash) so a repeat run emails
nobody twice. If your copy fails to send, nobody else is emailed.

## Safety against duplicates

Each day has one `campaigns` row (unique by date) and each subscriber one `campaignsends` row per campaign (unique pair). A
restart in the middle of a send, a repeat run, or two server instances cannot email anyone the same day's message twice. No email
address is stored in the send log.

## Turning it on

1. Run the migrations (campaign collections, then the opt-out list and the one-off send log): in the Render shell, `cd server && npm run migrate`.
2. In Render → `apex-root-api` → Environment, check these (all have safe defaults):

   | Variable | Meaning |
   | --- | --- |
   | `CAMPAIGN_EMAILS_ENABLED` | `true` to send; anything else is off |
   | `CAMPAIGN_SEND_HOUR_UTC` | Hour (0-23, UTC) to send; default 15 |
   | `HOLIDAY_DISCOUNT_PERCENT` | Offer percent; default 10; capped at 20 |
   | `HOLIDAY_WINDOW_DAYS` | Days the offer is open before a holiday; default 7; 1 to 14 |
   | `HOLIDAY_DAILY_DAYS` | Final days (holiday included) with a daily email; default 3; never more than the window |
   | `CAMPAIGN_FROM` | Optional separate sender, e.g. `Apex Root <news@mail2.apexrsol.com>` (must be verified in Resend) |

   It also needs `INVOICE_LINK_SECRET` and a working email service, which are already set for invoicing.
3. Open `/admin/campaigns`: check the status, **preview** the email for any date, and press **Send test to me**.
4. Set `CAMPAIGN_EMAILS_ENABLED=true` and redeploy. The first email goes out the next time the schedule is due.

To pause, remove the variable (or set it to anything but `true`) and redeploy.

## Choices to review

* **Frequency.** The defaults give about 140 emails a year (one every 2.6 days) and daily email on about 34 days. If complaints or
  unsubscribes rise, lower `HOLIDAY_DAILY_DAYS` (2 gives about 134 emails and 23 daily days; 1 sends daily only on the holiday itself)
  before touching the offer window.
* **Sender reputation.** Promotions share the Resend domain with invoice and contact-form mail. A separate verified sender
  (`CAMPAIGN_FROM`) is recommended before the list grows, and check your Resend plan's daily and monthly limits.
* **Claims in the copy.** The security and quality statements in `campaigns/content.js` are specific practices, not guarantees. Each one
  carries a `source` (a section of the Terms of Service, wording already published on the site, or code and tests in this repository), and a
  test fails if an item has no source or uses an absolute word such as "never", "always" or "guarantee". Where a practice is shown by Apex Root's
  own systems the email says so ("on our own invoicing system..."). If you add a statement you cannot back up, leave it out.

## Tests

`cd server && npm test` includes `test/campaigns.test.js`: holiday dates for 2026 and 2027 and the weekend rule, window boundaries,
the 20% cap, cadence over a run of days, offer-code checks, unsubscribe token security, send-once behaviour under repeats,
interruptions and simultaneous runs, failures, the headers sent to Resend, and the admin endpoints.

`test/abuse.test.js` covers the signup and contact-form defences, double opt-in, token separation, who receives campaign email and the
opt-out list; `test/outreach.test.js` covers the one-off message, its audience rules, idempotency and the clean-up script.
