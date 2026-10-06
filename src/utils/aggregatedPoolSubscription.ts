import type { AggregatedPool } from "../api/models";
import type { SubscriptionFilter } from "../types/SubscriptionFilter";

type PoolRef = Pick<AggregatedPool, "id" | "assetIdA" | "assetIdB">;

/** Direction-independent key of an asset pair (A/B and B/A are the same pair). */
export function pairKey(p: PoolRef): string {
  return `${Math.min(p.assetIdA ?? 0, p.assetIdB ?? 0)}-${Math.max(p.assetIdA ?? 0, p.assetIdB ?? 0)}`;
}

/** Identity used for subscriptions: the backend id, or the pair key when the id is absent. */
export function poolKey(p: PoolRef): string {
  return p.id || pairKey(p);
}

/**
 * The live-update subscription for one page of the aggregated pools table:
 * only the pools on that page (sorted and de-duplicated so that an unchanged
 * page yields an identical `signature` and no needless re-subscribe), plus
 * the selected asset itself.
 */
export function buildPageSubscription(
  assetId: string,
  pagePools: readonly PoolRef[],
): { filter: SubscriptionFilter; signature: string } {
  const ids = Array.from(new Set(pagePools.map(poolKey))).sort();
  return {
    filter: {
      PoolsAddresses: [],
      AggregatedPoolsIds: ids,
      AssetIds: [assetId],
      MainAggregatedPools: false,
      RecentAggregatedPool: false,
      RecentBlocks: false,
      RecentLiquidity: false,
      RecentAssets: false,
      RecentPool: false,
      RecentTrades: false,
    },
    signature: JSON.stringify({ ids, asset: assetId }),
  };
}
