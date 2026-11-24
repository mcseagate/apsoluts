// The US federal holidays: the days the government observes a break from work.
// All dates are calendar dates as "YYYY-MM-DD" in UTC, with no times attached, so
// there is no time-zone or daylight-saving arithmetic anywhere in this file.
//
// A holiday that falls on a Saturday is observed the Friday before; one that falls
// on a Sunday is observed the Monday after (the federal rule). Offers run up to and
// including the observed day.

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const toDate = (s) => new Date(`${s}T00:00:00Z`);
const fromDate = (d) => d.toISOString().slice(0, 10);

export const addDays = (s, n) => {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fromDate(d);
};

export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86_400_000);
export const weekday = (s) => toDate(s).getUTCDay(); // 0 = Sunday

// The nth (1-4) given weekday of a month, or the last one when n is -1.
function nthWeekday(year, month, wd, n) {
  if (n > 0) {
    const first = weekday(iso(year, month, 1));
    return iso(year, month, 1 + ((wd - first + 7) % 7) + (n - 1) * 7);
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = weekday(iso(year, month, lastDay));
  return iso(year, month, lastDay - ((last - wd + 7) % 7));
}

function observed(date) {
  const wd = weekday(date);
  if (wd === 6) return addDays(date, -1);
  if (wd === 0) return addDays(date, 1);
  return date;
}

// slug: stable identifier used in offer codes. name: how the email says it.
export function holidaysOf(year) {
  const fixed = (slug, name, m, d) => {
    const date = iso(year, m, d);
    return { slug, name, date, observed: observed(date) };
  };
  const floating = (slug, name, m, wd, n) => {
    const date = nthWeekday(year, m, wd, n);
    return { slug, name, date, observed: date };
  };
  return [
    fixed("NEWYEAR", "New Year's Day", 1, 1),
    floating("MLK", "Martin Luther King Jr. Day", 1, 1, 3),
    floating("PRESIDENTS", "Presidents' Day", 2, 1, 3),
    floating("MEMORIAL", "Memorial Day", 5, 1, -1),
    fixed("JUNETEENTH", "Juneteenth", 6, 19),
    fixed("INDEPENDENCE", "Independence Day", 7, 4),
    floating("LABOR", "Labor Day", 9, 1, 1),
    floating("COLUMBUS", "Columbus Day", 10, 1, 2),
    fixed("VETERANS", "Veterans Day", 11, 11),
    floating("THANKSGIVING", "Thanksgiving", 11, 4, 4),
    fixed("CHRISTMAS", "Christmas Day", 12, 25),
  ];
}

// Every holiday whose observed day can still matter around `today`, soonest first.
// Looks a year either side because a January 1 on a Saturday is observed on
// December 31 of the year before.
export function upcomingHolidays(today) {
  const year = Number(today.slice(0, 4));
  return [year - 1, year, year + 1]
    .flatMap(holidaysOf)
    .filter((h) => h.observed >= today)
    .sort((a, b) => (a.observed < b.observed ? -1 : 1));
}

// The holiday whose lead-up window contains `today`, or null. The window opens
// `windowDays` before the observed day and closes at the end of that day. Where two
// windows overlap, the holiday that comes first wins, so only one offer is ever
// active.
export function holidayInWindow(today, windowDays) {
  const next = upcomingHolidays(today).find((h) => today >= addDays(h.observed, -windowDays));
  return next ?? null;
}
