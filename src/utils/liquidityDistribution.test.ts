import { describe, expect, it } from "vitest";
import type { Pool, PoolLiquidityRange } from "../api/models";
import poolFixture from "../../e2e/fixtures/pact-clamm-3762241535-pool.json";
import {
  barPath,
  buildLiquidityBars,
  isActiveRange,
  isBoundedPrice,
  priceDomain,
  priceToX,
} from "./liquidityDistribution";
import { poolSpotPrice } from "./poolPrice";

// the Pact CLAMM ALGO/USDC pool 3762241535 as the backend serves it (ranges from its tick boxes)
const pool = poolFixture as Pool;
const ranges = pool.liquidityRanges as PoolLiquidityRange[];

describe("liquidity distribution of Pact CLAMM 3762241535", () => {
  it("places one bar per range, left to right, without overlap", () => {
    const bars = buildLiquidityBars(ranges, pool.currentPrice ?? undefined, 1000, 200);
    expect(bars).toHaveLength(50);
    for (let i = 1; i < bars.length; i++) {
      // the 2 unit surface gap keeps neighbours apart
      expect(bars[i].x).toBeGreaterThanOrEqual(bars[i - 1].x + bars[i - 1].width);
    }
    expect(bars[0].x).toBeGreaterThanOrEqual(0);
    const last = bars[bars.length - 1];
    expect(last.x + last.width).toBeLessThanOrEqual(1000);
  });

  it("highlights exactly the range holding the current price (tick 1000401)", () => {
    const bars = buildLiquidityBars(ranges, pool.currentPrice ?? undefined, 1000, 200);
    const active = bars.filter((b) => b.active);
    expect(active).toHaveLength(1);
    expect(active[0].range.tickLow).toBe(1000401);
    expect(active[0].range.a).toBeGreaterThan(0);
    expect(active[0].range.b).toBeGreaterThan(0);
  });

  it("scales heights to the largest liquidity", () => {
    const bars = buildLiquidityBars(ranges, pool.currentPrice ?? undefined, 1000, 200);
    const tallest = Math.max(...bars.map((b) => b.height));
    expect(tallest).toBeCloseTo(200);
    const maxLiquidity = Math.max(...ranges.map((r) => r.liquidity ?? 0));
    for (const bar of bars) {
      expect(bar.height).toBeCloseTo(Math.max(1, ((bar.range.liquidity ?? 0) / maxLiquidity) * 200));
    }
  });

  it("sums the ranges to the pool reserves (Pact TVL 18.93k USD)", () => {
    const a = ranges.reduce((s, r) => s + (r.a ?? 0), 0) / 1e6;
    const b = ranges.reduce((s, r) => s + (r.b ?? 0), 0) / 1e6;
    expect(a).toBeCloseTo(169_922, 0);
    expect(b).toBeCloseTo(3_656.49, 1);
    expect(a * (pool.currentPrice ?? 0) + b).toBeCloseTo(18_937.7, 0);
  });

  it("prices the pool at its contract price, not its reserve ratio", () => {
    const spot = poolSpotPrice(pool);
    expect(spot).toBeCloseTo(0.08993, 5);
    // the old reserve ratio a / b of this pool is ~46.5 - meaningless as a price
    expect((pool.a ?? 0) / (pool.b ?? 1)).toBeGreaterThan(40);
  });
});

describe("liquidity distribution helpers", () => {
  it("treats the backend's clamped bounds as unbounded", () => {
    expect(isBoundedPrice(0)).toBe(false);
    expect(isBoundedPrice(7.9e28)).toBe(false);
    expect(isBoundedPrice(undefined)).toBe(false);
    expect(isBoundedPrice(0.09)).toBe(true);
    // an unbounded range extends to the domain edge instead of breaking the axis
    const wide: PoolLiquidityRange[] = [
      { tickLow: 1, tickHigh: 1, liquidity: 10, pMin: 0, pMax: 2 },
      { tickLow: 2, tickHigh: 2, liquidity: 5, pMin: 2, pMax: 8 },
    ];
    expect(priceDomain(wide)).toEqual({ min: 2, max: 8 });
    const bars = buildLiquidityBars(wide, 3, 100, 50, 0);
    expect(bars[0].x).toBe(0);
    expect(bars[1].x + bars[1].width).toBeCloseTo(100);
  });

  it("maps prices on a log axis", () => {
    const domain = { min: 1, max: 100 };
    expect(priceToX(1, domain, 100)).toBe(0);
    expect(priceToX(10, domain, 100)).toBeCloseTo(50);
    expect(priceToX(100, domain, 100)).toBe(100);
    expect(priceToX(1000, domain, 100)).toBe(100);
  });

  it("knows the active range and draws rounded tops on a square baseline", () => {
    expect(isActiveRange({ pMin: 1, pMax: 2 }, 1.5)).toBe(true);
    expect(isActiveRange({ pMin: 1, pMax: 2 }, 3)).toBe(false);
    expect(isActiveRange({ pMin: 1, pMax: 2 }, undefined)).toBe(false);
    const path = barPath({ key: "k", range: {}, x: 10, width: 20, height: 30, active: false }, 100);
    expect(path.startsWith("M10,100 ")).toBe(true);
    expect(path).toContain("Q10,70 14,70");
    expect(path.endsWith("L30,100 Z")).toBe(true);
    expect(buildLiquidityBars([], 1, 100, 50)).toEqual([]);
  });
});
