import { connectDb } from "../config/db.js";
import { Campaign } from "../models/Campaign.js";
import { CampaignSend } from "../models/CampaignSend.js";
import { deliverableSubscribers } from "../lib/subscribers.js";
import { mailTransport, sendMail } from "../lib/mailer.js";
import { todayUtc } from "../lib/validate.js";
import { composeCampaign } from "./compose.js";
import { planFor } from "./schedule.js";
import { unsubscribeConfigured } from "./unsubscribe.js";

// Sends the day's campaign email to every subscriber who confirmed their address
// and has not unsubscribed or been put on the do-not-email list.
//
// Safe to call as often as you like. Each day has one Campaign row (unique by
// date) and each subscriber one CampaignSend row per campaign (unique pair), so a
// retry, a restart in the middle of a send, or two server instances cannot send
// anyone the same day's email twice. A send that failed is recorded and not
// retried that day: a repeat could double-send if the first attempt did reach the
// provider.

export const campaignsEnabled = () => process.env.CAMPAIGN_EMAILS_ENABLED === "true";

export const sendHourUtc = () => {
  const n = Number(process.env.CAMPAIGN_SEND_HOUR_UTC);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : 15;
};

// Optional separate sender (for example a marketing subdomain) so complaints about
// promotions cannot affect the address that sends invoices and contact-form mail.
const campaignFrom = () => process.env.CAMPAIGN_FROM?.trim() || undefined;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let running = false;

export async function lastCampaignDate(before) {
  const last = await Campaign.findOne({ key: { $lt: before } }).sort({ key: -1 }).lean();
  return last?.key ?? null;
}

export async function nextSequence() {
  return (await Campaign.countDocuments()) + 1;
}

export async function runDue({ now = new Date(), send = sendMail, delayMs = 600 } = {}) {
  if (!campaignsEnabled()) return { skipped: "disabled" };
  if (!unsubscribeConfigured()) return { skipped: "no_link_secret" };
  if (!mailTransport()) return { skipped: "mail_not_configured" };
  if (now.getUTCHours() < sendHourUtc()) return { skipped: "before_send_time" };
  if (running) return { skipped: "already_running" };
  running = true;
  try {
    await connectDb();
    const today = todayUtc(now);

    let campaign = await Campaign.findOne({ key: today });
    if (campaign?.status === "done") return { skipped: "already_sent_today" };

    let plan;
    if (!campaign) {
      plan = planFor(today, await lastCampaignDate(today));
      if (!plan.due) return { skipped: "not_due", plan };
      const sequence = await nextSequence();
      const composed = composeCampaign({ plan, sequence, subscriber: null });
      try {
        campaign = await Campaign.create({
          key: today,
          sequence,
          kind: plan.kind,
          topic: composed.topic,
          offerCode: composed.offerCode,
          subject: composed.subject,
        });
      } catch (err) {
        if (err?.code === 11000) return { skipped: "claimed_elsewhere" };
        throw err;
      }
    } else {
      // Resuming a send that was interrupted earlier today.
      plan = planFor(today, null);
      plan.kind = campaign.kind;
    }

    const subscribers = await deliverableSubscribers();
    let sent = 0;
    let failed = 0;
    for (const subscriber of subscribers) {
      try {
        await CampaignSend.create({ campaignKey: today, subscriberId: subscriber._id });
      } catch (err) {
        if (err?.code === 11000) continue; // already handled for this campaign
        throw err;
      }
      try {
        const message = composeCampaign({ plan, sequence: campaign.sequence, subscriber });
        const result = await send({
          to: subscriber.email,
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: message.headers,
          from: campaignFrom(),
        });
        if (!result) throw new Error("mail_not_configured");
        await CampaignSend.updateOne({ campaignKey: today, subscriberId: subscriber._id }, { $set: { status: "sent" } });
        sent += 1;
      } catch (err) {
        // Only a short code is kept: provider errors can quote the address.
        await CampaignSend.updateOne(
          { campaignKey: today, subscriberId: subscriber._id },
          { $set: { status: "failed", error: String(err?.message ?? "error").replace(/[^\w .:-]/g, "").slice(0, 60) } },
        );
        failed += 1;
      }
      if (delayMs) await sleep(delayMs); // stay under the provider's request rate
    }

    await Campaign.updateOne(
      { key: today },
      { $inc: { "counts.sent": sent, "counts.failed": failed }, $set: { status: "done", finishedAt: new Date() } },
    );
    console.log(`[Campaign] ${today} #${campaign.sequence} (${campaign.kind}): ${sent} sent, ${failed} failed`);
    return { ran: true, key: today, sent, failed };
  } finally {
    running = false;
  }
}

// Checks every few minutes whether today's email is due. Cheap when it is not.
export function startCampaignScheduler() {
  if (!campaignsEnabled()) {
    console.log("[Campaign] Scheduled campaign emails are off (CAMPAIGN_EMAILS_ENABLED is not 'true').");
    return null;
  }
  const tick = () =>
    runDue().catch((err) => console.error("[Campaign] Run failed:", err?.message ?? err));
  console.log(`[Campaign] Scheduled campaign emails are on; sends from ${sendHourUtc()}:00 UTC.`);
  const timer = setInterval(tick, 10 * 60 * 1000);
  timer.unref?.();
  setTimeout(tick, 30_000).unref?.();
  return timer;
}
