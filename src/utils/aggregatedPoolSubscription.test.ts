import { describe, expect, it } from "vitest";
import { buildPageSubscription, pairKey, poolKey } from "./aggregatedPoolSubscription";
import { pageSlice } from "./pagination";

describe("pairKey / poolKey", () => {
  it("is direction independent", () => {
    expect(pairKey({ assetIdA: 0, assetIdB: 31566704 })).toBe(pairKey({ assetIdA: 31566704, assetIdB: 0 }));
  });

  it("prefers the backend id and falls back to the pair key", () => {
    expect(poolKey({ id: "abc", assetIdA: 1, assetIdB: 2 })).toBe("abc");
    expect(poolKey({ assetIdA: 2, assetIdB: 1 })).toBe("1-2");
  });
});

describe("buildPageSubscription", () => {
  const pools = Array.from({ length: 60 }, (_, i) => ({ id: `pool-${i}`, assetIdA: 0, assetIdB: i + 1 }));

  it("subscribes only to the pools of the given page, not the whole list", () => {
    const { filter } = buildPageSubscription("0", pageSlice(pools, 2, 25));
    expect(filter.AggregatedPoolsIds).toHaveLength(25);
    expect(filter.AggregatedPoolsIds).toContain("pool-25");
    expect(filter.AggregatedPoolsIds).toContain("pool-49");
    expect(filter.AggregatedPoolsIds).not.toContain("pool-0");
    expect(filter.AggregatedPoolsIds).not.toContain("pool-50");
  });

  it("does not subscribe to unrelated feeds", () => {
    const { filter } = buildPageSubscription("0", pools.slice(0, 3));
    expect(filter).toMatchObject({
      AssetIds: ["0"],
      PoolsAddresses: [],
      MainAggregatedPools: false,
      RecentAggregatedPool: false,
      RecentBlocks: false,
      RecentLiquidity: false,
      RecentAssets: false,
      RecentPool: false,
      RecentTrades: false,
    });
  });

  it("yields the same signature for the same page regardless of row order", () => {
    const a = buildPageSubscription("0", pools.slice(0, 5));
    const b = buildPageSubscription("0", [...pools.slice(0, 5)].reverse());
    expect(a.signature).toBe(b.signature);
  });

  it("yields different signatures for different pages and different assets", () => {
    const p1 = buildPageSubscription("0", pageSlice(pools, 1, 25)).signature;
    const p2 = buildPageSubscription("0", pageSlice(pools, 2, 25)).signature;
    expect(p1).not.toBe(p2);
    expect(buildPageSubscription("5", pools.slice(0, 5)).signature).not.toBe(
      buildPageSubscription("0", pools.slice(0, 5)).signature,
    );
  });

  it("de-duplicates ids and handles an empty page", () => {
    const dup = buildPageSubscription("0", [pools[0], pools[0]]);
    expect(dup.filter.AggregatedPoolsIds).toEqual(["pool-0"]);
    expect(buildPageSubscription("0", []).filter.AggregatedPoolsIds).toEqual([]);
  });
});
