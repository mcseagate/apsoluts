import { addDays, holidayInWindow } from "./holidays.js";

// Holiday offers. The percentage is decided here, in code, and never by the text
// of an email or by anything a visitor sends.

// The most any customer may be offered in total. Offers never stack (only one
// holiday is active at a time and a quote records at most one), so this is also
// the most a single offer may be.
export const MAX_TOTAL_DISCOUNT_PERCENT = 20;
const DEFAULT_PERCENT = 10;
const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_DAILY_DAYS = 3;

export function discountPercent() {
  const n = Number(process.env.HOLIDAY_DISCOUNT_PERCENT);
  const wanted = Number.isFinite(n) && n > 0 ? n : DEFAULT_PERCENT;
  return Math.min(Math.floor(wanted), MAX_TOTAL_DISCOUNT_PERCENT);
}

export function windowDays() {
  const n = Number(process.env.HOLIDAY_WINDOW_DAYS);
  return Number.isInteger(n) && n >= 1 && n <= 14 ? n : DEFAULT_WINDOW_DAYS;
}

// How many of the final days before a holiday (counting the holiday itself) get a
// daily email. Before that, the offer is still open and still mentioned, but emails
// stay on the normal every-third-day rhythm, so a subscriber is not mailed daily for
// a week. Never longer than the offer window.
export function dailyDays() {
  const n = Number(process.env.HOLIDAY_DAILY_DAYS);
  const wanted = Number.isInteger(n) && n >= 1 ? n : DEFAULT_DAILY_DAYS;
  return Math.min(wanted, windowDays());
}

export const offerCode = (holiday) => `${holiday.slug}${discountPercent()}`;

// The offer running on `today`, or null between holidays.
export function activeOffer(today = new Date().toISOString().slice(0, 10)) {
  const holiday = holidayInWindow(today, windowDays());
  if (!holiday) return null;
  return {
    code: offerCode(holiday),
    holiday: holiday.name,
    slug: holiday.slug,
    percent: discountPercent(),
    opens: addDays(holiday.observed, -windowDays()),
    validThrough: holiday.observed,
  };
}

// An offer code a visitor typed, matched against what is running today.
export function resolveOffer(code, today) {
  const typed = String(code ?? "").trim().toUpperCase();
  if (!typed) return null;
  const offer = activeOffer(today);
  return offer && offer.code === typed ? offer : null;
}
