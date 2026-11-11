import { describe, expect, it } from "vitest";
import { AMMType, type Pool, type PoolLiquidityRange } from "../api/models";
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
    const bars = buildLiquidityBars(ranges, pool.currentPrice ?? undefined, 1000, 200, 2, pool.currentTick);
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
    // a half-unbounded range extends to the domain edge instead of breaking the axis
    const halfOpen: PoolLiquidityRange[] = [
      { tickLow: 1, tickHigh: 1, liquidity: 10, pMin: 1, pMax: 2 },
      { tickLow: 2, tickHigh: 2, liquidity: 5, pMin: 2, pMax: 7.9e28 },
    ];
    expect(priceDomain(halfOpen)).toEqual({ min: 1, max: 2 });
    const bars = buildLiquidityBars(halfOpen, 1.5, 100, 50, 0);
    expect(bars).toHaveLength(1); // the range above 2 starts at the domain end: nothing of it is visible
    expect(bars[0].x).toBe(0);
    expect(bars[0].x + bars[0].width).toBeCloseTo(100);
  });

  it("does not draw ranges clamped entirely off the axis", () => {
    // both bounds clamped (extreme ticks): not a bar across the whole chart
    const ranges: PoolLiquidityRange[] = [
      { tickLow: 1, tickHigh: 1, liquidity: 1000, pMin: 0, pMax: 0 },
      { tickLow: 2, tickHigh: 2, liquidity: 1000, pMin: 7.9e28, pMax: 7.9e28 },
      { tickLow: 3, tickHigh: 3, liquidity: 5, pMin: 2, pMax: 4 },
    ];
    const bars = buildLiquidityBars(ranges, 3, 100, 50, 0);
    expect(bars.map((b) => b.range.tickLow)).toEqual([3]);
    // and the off-axis liquidity does not flatten the visible bar
    expect(bars[0].height).toBeCloseTo(50);
  });

  it("keeps the axis to a window around the current price", () => {
    // a near full-range position must not squash the concentrated ranges into slivers
    const ranges: PoolLiquidityRange[] = [
      { tickLow: 1, tickHigh: 1, liquidity: 1, pMin: 1e-20, pMax: 1e20 },
      { tickLow: 2, tickHigh: 2, liquidity: 50, pMin: 0.09, pMax: 0.0906 },
      { tickLow: 3, tickHigh: 3, liquidity: 40, pMin: 0.0906, pMax: 0.0912 },
    ];
    expect(priceDomain(ranges, 0.09)).toEqual({ min: 0.09, max: 0.0912 });
    const bars = buildLiquidityBars(ranges, 0.09, 1000, 50);
    const concentrated = bars.filter((b) => b.range.tickLow !== 1);
    for (const bar of concentrated) expect(bar.width).toBeGreaterThan(100);
    // the wide position is drawn across the whole axis, behind nothing it could hide
    expect(bars.find((b) => b.range.tickLow === 1)?.width).toBeCloseTo(998);
    // the window around the price still applies to a spread of concentrated ranges
    const spread: PoolLiquidityRange[] = [
      { tickLow: 1, tickHigh: 1, liquidity: 1, pMin: 1e-9, pMax: 2e-9 },
      { tickLow: 2, tickHigh: 2, liquidity: 1, pMin: 0.09, pMax: 0.1 },
    ];
    expect(priceDomain(spread, 0.09)).toEqual({ min: 0.0009, max: 0.1 });
  });

  it("tiles the hover targets without overlap", () => {
    const bars = buildLiquidityBars(ranges, pool.currentPrice ?? undefined, 1000, 200);
    expect(bars[0].hitX).toBe(0);
    const last = bars[bars.length - 1];
    expect(last.hitX + last.hitWidth).toBeCloseTo(1000);
    for (let i = 0; i < bars.length; i++) {
      expect(bars[i].hitX).toBeLessThanOrEqual(bars[i].x);
      expect(bars[i].hitX + bars[i].hitWidth).toBeGreaterThanOrEqual(bars[i].x + bars[i].width);
      if (i > 0) expect(bars[i].hitX).toBeCloseTo(bars[i - 1].hitX + bars[i - 1].hitWidth);
    }
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
    // the contract's tick decides when known: on a shared boundary price only one range is active
    const below: PoolLiquidityRange = { tickLow: 10, tickHigh: 12, pMin: 1, pMax: 2 };
    const above: PoolLiquidityRange = { tickLow: 13, tickHigh: 15, pMin: 2, pMax: 3 };
    expect(isActiveRange(below, 2, 13)).toBe(false);
    expect(isActiveRange(above, 2, 13)).toBe(true);
    expect(isActiveRange(below, 1.5)).toBe(true); // price fallback without a tick
    const path = barPath({ key: "k", range: {}, x: 10, width: 20, height: 30, active: false, hitX: 10, hitWidth: 20 }, 100);
    expect(path.startsWith("M10,100 ")).toBe(true);
    expect(path).toContain("Q10,70 14,70");
    expect(path.endsWith("L30,100 Z")).toBe(true);
    expect(buildLiquidityBars([], 1, 100, 50)).toEqual([]);
  });
  it("keeps the current price on the axis, also far from every range", () => {
    const ranges: PoolLiquidityRange[] = [
      { tickLow: 1, tickHigh: 1, liquidity: 5, pMin: 0.13, pMax: 0.2 },
      { tickLow: 2, tickHigh: 2, liquidity: 3, pMin: 0.2, pMax: 0.25 },
    ];
    // a depleted pool priced far below its ranges: no window holds a range, the chart still shows them and the price
    const far = priceDomain(ranges, 0.0009)!;
    expect(far.min).toBe(0.0009);
    expect(far.max).toBe(0.25);
    expect(buildLiquidityBars(ranges, 0.0009, 100, 50)).toHaveLength(2);
    // a price just below the ranges widens the axis rather than sitting on its edge
    const near = priceDomain(ranges, 0.05)!;
    expect(near.min).toBe(0.05);
    expect(priceToX(0.05, near, 100)).toBe(0);
    expect(priceToX(0.13, near, 100)).toBeGreaterThan(0);
  });

  it("assigns a boundary price to one range without a tick", () => {
    const below: PoolLiquidityRange = { tickLow: 10, tickHigh: 12, pMin: 1, pMax: 2 };
    const above: PoolLiquidityRange = { tickLow: 13, tickHigh: 15, pMin: 2, pMax: 3 };
    expect(isActiveRange(below, 2)).toBe(false);
    expect(isActiveRange(above, 2)).toBe(true);
  });
  it("centres a range thinner than the gap on its own span", () => {
    // two adjacent single-tick ranges, each ~0.5 units wide on a wide axis, must not run into each other's prices
    const ranges: PoolLiquidityRange[] = [
      { tickLow: 1, tickHigh: 1, liquidity: 5, pMin: 1, pMax: 1.0005 },
      { tickLow: 2, tickHigh: 2, liquidity: 5, pMin: 1.0005, pMax: 1.001 },
      { tickLow: 3, tickHigh: 3, liquidity: 5, pMin: 1.001, pMax: 2 },
    ];
    const domain = { min: 1, max: 2 };
    const bars = buildLiquidityBars(ranges, 1.5, 1000, 50, 2, null, domain);
    for (const bar of bars.slice(0, 2)) {
      const left = priceToX(bar.range.pMin!, domain, 1000);
      const right = priceToX(bar.range.pMax!, domain, 1000);
      expect(bar.width).toBe(1);
      expect(bar.x + bar.width / 2).toBeCloseTo((left + right) / 2);
    }
  });

  it("prices a tick based pool at its contract price", () => {
    const tick = { ammType: AMMType.TickBasedCLAMM, currentPrice: 0.0899, virtualAmountA: 1, virtualAmountB: 5 } as Pool;
    expect(poolSpotPrice(tick)).toBe(0.0899);
    // any pool without virtual amounts falls back to its contract price
    const zeroed = { ammType: AMMType.ConcentratedLiquidityAMM, currentPrice: 2.5, virtualAmountA: 0, virtualAmountB: 0 } as Pool;
    expect(poolSpotPrice(zeroed)).toBe(2.5);
    const plain = { ammType: AMMType.OldAMM, virtualAmountA: 2, virtualAmountB: 1 } as Pool;
    expect(poolSpotPrice(plain)).toBe(0.5);
  });
});
