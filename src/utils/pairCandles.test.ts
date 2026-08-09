import { describe, expect, it } from "vitest";
import type { TimeseriesCandles } from "../api/models";
import { derivePairPriceCandles } from "./pairCandles";

// Hourly candle fixtures use whole-number ratios so expectations stay exact.
function candles(
  rows: Array<[t: number, o: number, h: number, l: number, c: number]>,
): TimeseriesCandles {
  return {
    t: rows.map((r) => r[0]),
    o: rows.map((r) => r[1]),
    h: rows.map((r) => r[2]),
    l: rows.map((r) => r[3]),
    c: rows.map((r) => r[4]),
  };
}

describe("derivePairPriceCandles", () => {
  it("returns null when the base series is missing or empty", () => {
    expect(derivePairPriceCandles(null, candles([[3600, 1, 1, 1, 1]]))).toBeNull();
    expect(derivePairPriceCandles(undefined, candles([[3600, 1, 1, 1, 1]]))).toBeNull();
    expect(derivePairPriceCandles(candles([]), candles([[3600, 1, 1, 1, 1]]))).toBeNull();
  });

  it("treats a missing/empty quote series as the USD unit and returns the base series", () => {
    // The backend intentionally leaves the USD reference asset's own price
    // series empty (it is $1 by definition), so base/USDC must fall back to
    // the base asset's USD series instead of rendering nothing.
    const base = candles([
      [3600, 10, 12, 9, 11],
      [7200, 11, 13, 10, 12],
    ]);
    expect(derivePairPriceCandles(base, null)).toEqual(base);
    expect(derivePairPriceCandles(base, candles([]))).toEqual(base);
  });

  it("divides base by quote per aligned hour", () => {
    const base = candles([[3600, 10, 12, 9, 11]]);
    const quote = candles([[3600, 2, 2.5, 2, 2.2]]);

    const result = derivePairPriceCandles(base, quote);

    expect(result?.t).toEqual([3600]);
    expect(result?.o).toEqual([5]); // 10 / 2
    expect(result?.c).toEqual([5]); // 11 / 2.2
    // h/l are clamped to at least span [min(o,c), max(o,c)] and use the
    // same-direction ratio estimate hA/hB, lA/lB for the wicks.
    expect(result?.h).toEqual([5]); // max(5, 5, 12/2.5=4.8)
    expect(result?.l).toEqual([4.5]); // min(5, 5, 9/2=4.5)
  });

  it("only keeps hours present in both series", () => {
    const base = candles([
      [3600, 1, 1, 1, 1],
      [7200, 2, 2, 2, 2],
      [10800, 3, 3, 3, 3],
    ]);
    const quote = candles([
      [7200, 1, 1, 1, 1],
      [10800, 2, 2, 2, 2],
      [14400, 4, 4, 4, 4],
    ]);

    const result = derivePairPriceCandles(base, quote);

    expect(result?.t).toEqual([7200, 10800]);
    expect(result?.c).toEqual([2, 1.5]);
  });

  it("skips hours where the quote has non-positive values", () => {
    const base = candles([
      [3600, 1, 1, 1, 1],
      [7200, 2, 2, 2, 2],
    ]);
    const quote = candles([
      [3600, 0, 0, 0, 0],
      [7200, 4, 4, 4, 4],
    ]);

    const result = derivePairPriceCandles(base, quote);

    expect(result?.t).toEqual([7200]);
    expect(result?.c).toEqual([0.5]);
  });

  it("returns null when the two series never overlap", () => {
    const base = candles([[3600, 1, 1, 1, 1]]);
    const quote = candles([[7200, 1, 1, 1, 1]]);

    expect(derivePairPriceCandles(base, quote)).toBeNull();
  });

  it("keeps the high/low envelope consistent (h >= max(o,c), l <= min(o,c))", () => {
    // Quote spikes harder than base: naive hA/hB would fall below the
    // open/close ratios and draw an impossible candle.
    const base = candles([[3600, 10, 10.5, 9.5, 10]]);
    const quote = candles([[3600, 1, 2, 0.5, 1]]);

    const result = derivePairPriceCandles(base, quote);

    const o = result!.o![0];
    const c = result!.c![0];
    const h = result!.h![0];
    const l = result!.l![0];
    expect(h).toBeGreaterThanOrEqual(Math.max(o, c));
    expect(l).toBeLessThanOrEqual(Math.min(o, c));
  });
});
