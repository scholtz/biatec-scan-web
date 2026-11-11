import { describe, expect, it, vi } from "vitest";
import { AMMType, type Pool, type PoolLiquidityRange } from "../api/models";
import poolFixture from "../../e2e/fixtures/pact-clamm-3762241535-pool.json";
import { buildLiquidityBars } from "./liquidityDistribution";
import { poolSpotPrice } from "./poolPrice";

// the Pact CLAMM ALGO/USDC pool 3762241535 as the backend serves it
const pool = poolFixture as Pool;
const ranges = pool.liquidityRanges as PoolLiquidityRange[];

describe("poolSpotPrice", () => {
  it("prices a tick based pool at its contract price", () => {
    const tick = { ammType: AMMType.TickBasedCLAMM, currentPrice: 0.0899, a: 10, b: 1, virtualAmountA: 1, virtualAmountB: 5 } as Pool;
    expect(poolSpotPrice(tick)).toBe(0.0899);
    // a fully withdrawn tick pool keeps its last contract price, which must not price anything
    expect(poolSpotPrice({ ...tick, a: 0, b: 0 })).toBeUndefined();
    // other pools without virtual amounts have no price (no contract price fallback)
    const zeroed = { ammType: AMMType.ConcentratedLiquidityAMM, currentPrice: 2.5, virtualAmountA: 0, virtualAmountB: 0 } as Pool;
    expect(poolSpotPrice(zeroed)).toBeUndefined();
    const plain = { ammType: AMMType.OldAMM, virtualAmountA: 2, virtualAmountB: 1 } as Pool;
    expect(poolSpotPrice(plain)).toBe(0.5);
  });

  it("gives a scam-zeroed pool no price", () => {
    const scam = { ammType: AMMType.TickBasedCLAMM, currentPrice: 0.09, a: 10, b: 1, scamRating: 100 } as Pool;
    expect(poolSpotPrice(scam)).toBeUndefined();
    expect(poolSpotPrice({ ...scam, scamRating: 80 })).toBe(0.09);
  });

  it("gives a tick based pool without its contract price no price", () => {
    // its virtual amounts would degrade to the reserve ratio (~0.022 for ALGO/USDC 3762241535 instead of ~0.09)
    const tick = { ammType: AMMType.TickBasedCLAMM, a: 170e9, b: 3.7e9, virtualAmountA: 170000, virtualAmountB: 3700 } as Pool;
    expect(poolSpotPrice(tick)).toBeUndefined();
    expect(poolSpotPrice({ ...tick, currentPrice: 0 })).toBeUndefined();
  });

  it("prices a reversed tick based pool in the reversed orientation (pools list)", async () => {
    // assetService reads localStorage when loaded - a stand-in for the browser storage
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    });
    const { assetService } = await import("../services/assetService");
    // PoolsByAssets flips pools with assetService.reversePool: ALGO/USDC 3762241535 shown as USDC/ALGO
    const reversed = assetService.reversePool(pool);
    expect(poolSpotPrice(reversed)).toBeCloseTo(1 / 0.0899307842, 4);
    const bars = buildLiquidityBars(reversed.liquidityRanges ?? [], poolSpotPrice(reversed), 1000, 200, 2, reversed.currentTick);
    expect(bars.filter((b) => b.active).map((b) => b.range.tickLow)).toEqual([1000401]);
    const active = bars.find((b) => b.active)!;
    expect(active.range.a).toBe(ranges.find((r) => r.tickLow === 1000401)!.b);
    vi.unstubAllGlobals();
  });
});
