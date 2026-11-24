import { connectDb } from "../../config/db.js";
import { Campaign } from "../../models/Campaign.js";
import { Subscriber } from "../../models/Subscriber.js";
import { adminNotifyAddress } from "../../lib/billingConfig.js";
import { handle, HttpError, badRequest } from "../../lib/http.js";
import { mailTransport, sendMail } from "../../lib/mailer.js";
import { dateString, todayUtc } from "../../lib/validate.js";
import { composeCampaign } from "../../campaigns/compose.js";
import { upcomingHolidays } from "../../campaigns/holidays.js";
import { MAX_TOTAL_DISCOUNT_PERCENT, dailyDays, discountPercent, windowDays } from "../../campaigns/offers.js";
import { campaignsEnabled, lastCampaignDate, nextSequence, sendHourUtc } from "../../campaigns/runner.js";
import { planFor } from "../../campaigns/schedule.js";
import { unsubscribeConfigured } from "../../campaigns/unsubscribe.js";

// Administrator view of the campaign emails. Nothing here sends to subscribers:
// the schedule does that. "Test send" goes only to the owner's own address.

const ok = (c, data, status = 200) => c.json({ data }, status);

export const campaignStatus = handle(async (c) => {
  await connectDb();
  const today = todayUtc();
  const [active, unsubscribed, last] = await Promise.all([
    Subscriber.countDocuments({ unsubscribedAt: null }),
    Subscriber.countDocuments({ unsubscribedAt: { $ne: null } }),
    Campaign.findOne().sort({ key: -1 }).lean(),
  ]);
  const plan = planFor(today, await lastCampaignDate(today));
  const next = upcomingHolidays(today)[0];
  return ok(c, {
    enabled: campaignsEnabled(),
    ready: { linkSecret: unsubscribeConfigured(), mail: Boolean(mailTransport()) },
    schedule: { sendHourUtc: sendHourUtc(), windowDays: windowDays(), dailyDays: dailyDays(), regularEveryDays: 3 },
    discount: { percent: discountPercent(), maxPercent: MAX_TOTAL_DISCOUNT_PERCENT },
    today: { date: today, kind: plan.kind, daily: plan.daily, due: plan.due, offer: plan.offer, alreadySentToday: last?.key === today },
    nextHoliday: next ? { name: next.name, observed: next.observed } : null,
    subscribers: { active, unsubscribed },
    lastCampaign: last ? { key: last.key, kind: last.kind, topic: last.topic, subject: last.subject, status: last.status, counts: last.counts } : null,
  });
});

async function composeFor(date) {
  const day = date ? dateString(date, "Date") : todayUtc();
  const plan = planFor(day, null);
  const sequence = await nextSequence();
  return { day, ...composeCampaign({ plan, sequence, subscriber: null }) };
}

// What an email would look like on a given date (today by default). Uses a
// placeholder unsubscribe link and records nothing.
export const previewCampaign = handle(async (c) => {
  await connectDb();
  const { day, subject, html, text, topic, offerCode } = await composeFor(c.req.query("date"));
  return ok(c, { date: day, subject, html, text, topic, offerCode });
});

export const testSendCampaign = handle(async (c) => {
  await connectDb();
  if (!mailTransport()) throw new HttpError(503, "MAIL_NOT_CONFIGURED", "Email is not configured on the server.");
  const { subject, html, text } = await composeFor();
  const to = adminNotifyAddress();
  try {
    await sendMail({ to, subject: `[TEST] ${subject}`, html, text });
  } catch (err) {
    console.error("[Campaign] Test send failed:", err.message);
    throw new HttpError(502, "EMAIL_ERROR", "The email service refused the test message.");
  }
  return ok(c, { sent: true, to });
});

export const campaignHistory = handle(async (c) => {
  await connectDb();
  const limit = Math.min(60, Math.max(1, Number(c.req.query("limit") || 30) || 30));
  if (!Number.isFinite(limit)) throw badRequest("limit must be a number.");
  const rows = await Campaign.find().sort({ key: -1 }).limit(limit).lean();
  return ok(c, {
    campaigns: rows.map((r) => ({
      key: r.key,
      sequence: r.sequence,
      kind: r.kind,
      topic: r.topic,
      offerCode: r.offerCode,
      subject: r.subject,
      status: r.status,
      counts: r.counts,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt ?? null,
    })),
  });
});
