// Money is always an integer count of the currency's smallest unit ("minor
// units"): cents for USD, whole yen for JPY. Floating point is never used for an
// amount. These are Stripe's unit conventions, which is what the checkout
// session is sent in, so a stored amount goes to the provider unchanged.

// Digits after the decimal point, by ISO 4217 code. Anything not listed has two.
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
// Stripe takes these in thousandths but requires the last digit to be 0.
const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "OMR", "TND"]);

// Currencies this application will bill in. USD is what the business chose; the
// others are listed so a later change is configuration, not new arithmetic.
export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

// Stripe's smallest chargeable amount is 50 cents (or the equivalent); its largest
// is 99,999,999 in minor units.
const MIN_CHARGE_MINOR = { USD: 50, EUR: 50, GBP: 30, CAD: 50, AUD: 50, JPY: 50 };
export const MAX_AMOUNT_MINOR = 99_999_999;

export class MoneyError extends Error {
  constructor(message) {
    super(message);
    this.name = "MoneyError";
  }
}

export function normalizeCurrency(code) {
  const upper = String(code || "").trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(upper)) {
    throw new MoneyError(`Unsupported currency "${String(code).slice(0, 8)}".`);
  }
  return upper;
}

export function exponent(currency) {
  const code = String(currency).toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

export function minChargeMinor(currency) {
  return MIN_CHARGE_MINOR[String(currency).toUpperCase()] ?? 50;
}

// True for a safe integer inside the range a provider will accept.
export function isValidMinor(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_AMOUNT_MINOR;
}

// "1,234.50" -> 123450 for USD. Works on the digits of the string, so no float
// ever holds the value. Rejects more decimals than the currency has, signs,
// exponents and anything else that is not plainly a decimal amount.
export function parseMoney(input, currency) {
  const exp = exponent(currency);
  const text = String(input ?? "").trim().replace(/^[$€£¥]\s?/, "");
  const grouped = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text);
  const plain = /^\d+(\.\d+)?$/.test(text);
  if (!grouped && !plain) throw new MoneyError("Enter an amount such as 1250 or 1,250.50.");
  const [whole, fraction = ""] = text.replace(/,/g, "").split(".");
  if (fraction.length > exp) {
    throw new MoneyError(
      exp === 0 ? "This currency has no decimal places." : `At most ${exp} decimal places are allowed.`,
    );
  }
  const minor = Number(whole + fraction.padEnd(exp, "0"));
  if (!isValidMinor(minor)) throw new MoneyError("That amount is too large.");
  return minor;
}

// 123450 -> "1234.50" (a decimal string built from the integer's digits).
export function minorToDecimalString(minor, currency) {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new MoneyError("Amount must be a non-negative integer.");
  const exp = exponent(currency);
  if (exp === 0) return String(minor);
  const digits = String(minor).padStart(exp + 1, "0");
  return `${digits.slice(0, -exp)}.${digits.slice(-exp)}`;
}

// 123450 -> "$1,234.50". Intl formats the decimal string exactly; no division.
export function formatMoney(minor, currency) {
  const code = String(currency).toUpperCase();
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(
    minorToDecimalString(minor, code),
  );
}

// Exact integer sum. Throws instead of silently passing a safe-integer bound.
export function sumMinor(values) {
  let total = 0;
  for (const v of values) {
    if (!Number.isSafeInteger(v) || v < 0) throw new MoneyError("Amounts must be non-negative integers.");
    total += v;
    if (!Number.isSafeInteger(total)) throw new MoneyError("Total is too large.");
  }
  return total;
}

// A chargeable invoice amount: an integer in range and not below the provider's
// minimum.
export function assertChargeable(minor, currency) {
  if (!isValidMinor(minor)) throw new MoneyError("Amount is not a valid number of minor units.");
  const min = minChargeMinor(currency);
  if (minor < min) {
    throw new MoneyError(`The smallest invoice is ${formatMoney(min, currency)}.`);
  }
}
