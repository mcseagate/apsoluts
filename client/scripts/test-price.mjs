// Tests for the price-point maths on /pricing. Run: npm run test:api
import { test } from "node:test";
import assert from "node:assert/strict";
import { valueAt, scopeLabel, nearPreset, clamp01, PRESETS, DEFAULT_T } from "../src/lib/pricePoint.ts";

test("the two ends of a range are returned exactly", () => {
  assert.equal(valueAt(30_000, 80_000, 0), 30_000);
  assert.equal(valueAt(30_000, 80_000, 1), 80_000);
  assert.equal(valueAt(500_000, 10_000_000, 0), 500_000);
  assert.equal(valueAt(500_000, 10_000_000, 1), 10_000_000);
});

test("medium is the geometric middle on the log scale, rounded to two figures", () => {
  assert.equal(valueAt(30_000, 80_000, 0.5), 49_000); // 48,990
  assert.equal(valueAt(500_000, 10_000_000, 0.5), 2_200_000); // 2,236,068
  assert.equal(valueAt(150_000, 1_000_000, 0.5), 390_000); // 387,298
});

test("log points match the ladder's axis: a point's position equals its value's position", () => {
  const axis = (v) => (Math.log(v) - Math.log(10_000)) / (Math.log(10_000_000) - Math.log(10_000));
  const min = 80_000, max = 500_000;
  for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    const v = valueAt(min, max, t);
    const expected = axis(min) + t * (axis(max) - axis(min));
    assert.ok(Math.abs(axis(v) - expected) < 0.004, `t=${t} v=${v}`);
  }
});

test("values never leave their range and rise with t", () => {
  for (const [min, max] of [[30_000, 80_000], [80_000, 500_000], [500_000, 3_500_000], [750_000, 4_000_000]]) {
    let last = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const v = valueAt(min, max, i / 100);
      assert.ok(v >= min && v <= max, `${min}-${max} at ${i}: ${v}`);
      assert.ok(v >= last, `not monotonic at ${i}`);
      last = v;
    }
  }
});

test("hourly rates move linearly, in steps of 500", () => {
  assert.equal(valueAt(10_000, 25_000, 0, "linear"), 10_000);
  assert.equal(valueAt(10_000, 25_000, 0.5, "linear"), 17_500);
  assert.equal(valueAt(10_000, 25_000, 1, "linear"), 25_000);
  assert.equal(valueAt(10_000, 25_000, 0.3, "linear") % 500, 0);
});

test("linear steps scale with the range, so dollar rates work as well as naira", () => {
  assert.equal(valueAt(24.5, 52.5, 0, "linear"), 24.5);
  assert.equal(valueAt(24.5, 52.5, 1, "linear"), 52.5);
  assert.equal(valueAt(24.5, 52.5, 0.5, "linear"), 38.5);
  const v = valueAt(24.5, 52.5, 0.33, "linear");
  assert.ok(v >= 24.5 && v <= 52.5 && (v * 2) % 1 === 0, `v=${v}`); // multiples of $0.50
  assert.equal(valueAt(10_000, 25_000, 0.3, "linear") % 500, 0);
});

test("bad input is clamped, not propagated", () => {
  assert.equal(valueAt(30_000, 80_000, -5), 30_000);
  assert.equal(valueAt(30_000, 80_000, 9), 80_000);
  assert.equal(valueAt(30_000, 80_000, NaN), 30_000);
  assert.equal(valueAt(50_000, 50_000, 0.5), 50_000);
  assert.equal(clamp01(Infinity), 0);
});

test("scope words and presets", () => {
  assert.equal(scopeLabel(0), "Small");
  assert.equal(scopeLabel(0.32), "Small");
  assert.equal(scopeLabel(0.5), "Medium");
  assert.equal(scopeLabel(0.67), "Large");
  assert.equal(scopeLabel(1), "Large");
  assert.deepEqual(PRESETS.map((p) => p.label), ["Small", "Medium", "Large"]);
  assert.equal(DEFAULT_T, 0.5);
  assert.ok(nearPreset(0.51, 0.5) && !nearPreset(0.6, 0.5));
  for (const p of PRESETS) assert.equal(scopeLabel(p.t), p.label);
});
