/**
 * One asset entry inside the TopAssetsResponse highlight lists.
 * Hand-added ahead of API regeneration: matches the shape orval will generate
 * from AVMTradeReporter's TopAssetItem once the deployed swagger includes
 * GET /api/asset/top.
 */
export interface TopAssetItem {
  assetId: number;
  /** @nullable */
  name?: string | null;
  /** @nullable */
  unitName?: string | null;
  /** @nullable */
  decimals?: number | null;
  priceUSD?: number;
  /** @nullable */
  priceUSD24H?: number | null;
  /** @nullable */
  priceChange24HPercent?: number | null;
  volume1HUSD?: number;
  volume24HUSD?: number;
  realTVLUSD?: number;
  /** @nullable */
  realTVLUSD24H?: number | null;
  /** @nullable */
  tvlChange24HUSD?: number | null;
  /** @nullable */
  tvlChange24HPercent?: number | null;
}
