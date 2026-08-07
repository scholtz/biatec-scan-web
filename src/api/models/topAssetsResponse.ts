/**
 * Backend-computed "top assets" highlight lists (Popular, Trending, Top
 * gainers/losers, Top value gainers/losers) served by GET /api/asset/top.
 * Hand-added ahead of API regeneration: matches the shape orval will generate
 * from AVMTradeReporter's TopAssetsResponse.
 */
import type { TopAssetItem } from './topAssetItem';

export interface TopAssetsResponse {
  popular?: TopAssetItem[];
  trending?: TopAssetItem[];
  topGainers?: TopAssetItem[];
  topLosers?: TopAssetItem[];
  topValueGainers?: TopAssetItem[];
  topValueLosers?: TopAssetItem[];
  generatedAt?: string;
}
