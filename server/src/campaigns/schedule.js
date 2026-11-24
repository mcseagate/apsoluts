import { daysBetween } from "./holidays.js";
import { activeOffer, dailyDays } from "./offers.js";

// Decides whether a campaign email is due today.
//   - in the final few days before a holiday (HOLIDAY_DAILY_DAYS, default 3,
//     counting the holiday): one a day;
//   - otherwise, including earlier days of the offer window: one every third day.
// Emails sent while an offer is open carry the offer either way.
// "Today" and the last send are calendar dates, so the rule is the same however
// late in the day the job happens to run.

export const REGULAR_INTERVAL_DAYS = 3;

export function planFor(today, lastSentDate) {
  const offer = activeOffer(today);
  const since = lastSentDate ? daysBetween(lastSentDate, today) : Infinity;
  const daily = Boolean(offer) && daysBetween(today, offer.validThrough) < dailyDays();
  const due = since >= (daily ? 1 : REGULAR_INTERVAL_DAYS);
  return { today, due, daily, kind: offer ? "holiday" : "regular", offer, daysSinceLast: Number.isFinite(since) ? since : null };
}
