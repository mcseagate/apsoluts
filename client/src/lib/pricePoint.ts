// The price "point" a visitor picks inside a service's range on /pricing.
//
// A point is a position t from 0 (bottom of the range) to 1 (top). The ladder
// is drawn on a logarithmic axis, so the point moves logarithmically too: the
// marker's value then matches the gridlines it sits over, and "Medium" is the
// geometric middle, not the arithmetic one (which would sit almost at the top
// of a range like ₦500,000 to ₦10,000,000). Hourly rates are a narrow range,
// so they move linearly. This file has no imports so it can be tested alone.

export type PointScale = "log" | "linear";

export const DEFAULT_T = 0.5;

export const PRESETS = [
  { label: "Small", t: 0 },
  { label: "Medium", t: 0.5 },
  { label: "Large", t: 1 },
] as const;

export const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

// 57,234 -> 57,000 and 2,236,068 -> 2,200,000: prices people can read and say.
function roundSignificant(n: number, digits: number): number {
  if (n === 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(n))) - (digits - 1));
  return Math.round(n / magnitude) * magnitude;
}

// The largest "nice" step (1, 2 or 5 times a power of ten) that is not above x.
function niceStepBelow(x: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(x)));
  const mantissa = x / magnitude;
  return (mantissa >= 5 ? 5 : mantissa >= 2 ? 2 : 1) * magnitude;
}

// The price at position t of the range min..max. The two ends are returned exactly.
// Linear ranges (hourly rates) snap to a nice step that scales with the range, so
// ₦10,000 to ₦25,000 moves in ₦500 steps and $24.50 to $52.50 in 50 cent steps.
export function valueAt(min: number, max: number, t: number, scale: PointScale = "log"): number {
  const x = clamp01(t);
  if (x <= 0 || max <= min) return min;
  if (x >= 1) return max;
  let rounded: number;
  if (scale === "log" && min > 0) {
    rounded = roundSignificant(min * Math.pow(max / min, x), 2);
  } else {
    const step = niceStepBelow((max - min) / 30);
    rounded = Number((Math.round((min + (max - min) * x) / step) * step).toFixed(2));
  }
  return Math.min(max, Math.max(min, rounded));
}

// Which scope word a position reads as.
export const scopeLabel = (t: number): "Small" | "Medium" | "Large" => {
  const x = clamp01(t);
  return x < 1 / 3 ? "Small" : x < 2 / 3 ? "Medium" : "Large";
};

// True when a position is (close to) a preset, so its chip can show as active.
export const nearPreset = (t: number, preset: number): boolean => Math.abs(clamp01(t) - preset) < 0.02;
