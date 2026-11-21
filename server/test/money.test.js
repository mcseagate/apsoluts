import test from "node:test";
import assert from "node:assert/strict";
import {
  assertChargeable, exponent, formatMoney, isValidMinor, MoneyError, minorToDecimalString, normalizeCurrency, parseMoney, sumMinor,
} from "../src/lib/money.js";

test("parseMoney reads decimal strings into integer minor units without floats", () => {
  assert.equal(parseMoney("1500", "USD"), 150000);
  assert.equal(parseMoney("1,250.50", "USD"), 125050);
  assert.equal(parseMoney("$99.9", "USD"), 9990);
  assert.equal(parseMoney("0.07", "USD"), 7);
  // Values that go wrong when multiplied by 100 in floating point.
  assert.equal(parseMoney("1.15", "USD"), 115);
  assert.equal(parseMoney("8.20", "USD"), 820);
  assert.equal(parseMoney("19.99", "USD"), 1999);
  assert.equal(parseMoney("999999.99", "USD"), 99999999);
});

test("parseMoney follows the currency's unit conventions", () => {
  assert.equal(exponent("USD"), 2);
  assert.equal(exponent("JPY"), 0);
  assert.equal(exponent("BHD"), 3);
  assert.equal(parseMoney("1500", "JPY"), 1500);
  assert.throws(() => parseMoney("1500.5", "JPY"), MoneyError);
  assert.equal(parseMoney("1.234", "BHD"), 1234);
});

test("parseMoney rejects anything that is not plainly an amount", () => {
  for (const bad of ["", "abc", "-5", "+5", "1e3", "1.234", "1,23", "1,2345.00", "12 34", "NaN", "Infinity", "0x10", ".5", "5.", "1000000.00", "99999999999999999999"]) {
    assert.throws(() => parseMoney(bad, "USD"), MoneyError, `should reject ${JSON.stringify(bad)}`);
  }
});

test("formatting and decimal strings are built from digits", () => {
  assert.equal(minorToDecimalString(5, "USD"), "0.05");
  assert.equal(minorToDecimalString(123450, "USD"), "1234.50");
  assert.equal(minorToDecimalString(1500, "JPY"), "1500");
  assert.equal(minorToDecimalString(1234, "BHD"), "1.234");
  assert.equal(formatMoney(123450, "USD"), "$1,234.50");
  assert.equal(formatMoney(99999999, "USD"), "$999,999.99");
  assert.equal(formatMoney(5, "USD"), "$0.05");
});

test("sums are exact and amounts must be non-negative safe integers", () => {
  assert.equal(sumMinor([10, 20, 30]), 60);
  assert.equal(sumMinor([1999, 1, 1, 1999]), 4000);
  assert.throws(() => sumMinor([1.5]), MoneyError);
  assert.throws(() => sumMinor([-1]), MoneyError);
  assert.throws(() => sumMinor([Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]), MoneyError);
  assert.equal(isValidMinor(100), true);
  assert.equal(isValidMinor(1.5), false);
  assert.equal(isValidMinor(100_000_000), false);
});

test("a chargeable amount respects the provider's minimum", () => {
  assert.doesNotThrow(() => assertChargeable(50, "USD"));
  assert.throws(() => assertChargeable(49, "USD"), /smallest invoice/);
  assert.throws(() => assertChargeable(0, "USD"), MoneyError);
});

test("only supported currencies are accepted", () => {
  assert.equal(normalizeCurrency("usd"), "USD");
  assert.throws(() => normalizeCurrency("XXX"), MoneyError);
});
