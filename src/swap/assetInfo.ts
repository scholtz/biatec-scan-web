// src/swap/assetInfo.ts - Minimal asset metadata the swap UI needs, resolved
// from the app's existing localStorage cache first and algod second (the
// project prefers algod over the indexer for chain lookups).
//
// Not routed through assetService.requestAsset on purpose: that queue is
// throttled to one algod lookup per 2 s for list pages, which is far too
// slow for a picker that must resolve every held asset on open.
import type algosdk from "algosdk";
import type { AssetParams } from "../types/algorand";
import { getTokenFromAlgod } from "../scripts/algo/getTokenFromAlgod";
import { getTokenFromLocalStorage } from "../scripts/algo/getTokenFromLocalStorage";

export interface SwapAssetInfo {
  id: bigint;
  name: string;
  unitName: string;
  decimals: number;
}

function fromParams(id: bigint, params: AssetParams): SwapAssetInfo {
  return { id, name: params.name, unitName: params.unitName, decimals: params.decimals };
}

/** The network's native token, as the shared asset cache describes it. */
export const NATIVE_ASSET: SwapAssetInfo = fromParams(
  0n,
  // getTokenFromLocalStorage(0n) is synchronous and never null: the native
  // token is synthesised from env config rather than looked up.
  getTokenFromLocalStorage(0n) ?? { name: "", unitName: "", total: 0, decimals: 6 }
);

export function isNativeAsset(assetId: bigint): boolean {
  return assetId === 0n;
}

export function assetLabel(asset: SwapAssetInfo): string {
  return asset.unitName || asset.name || `#${asset.id}`;
}

const inflight = new Map<string, Promise<SwapAssetInfo>>();

/** Resolve asset metadata by id (cached; concurrent calls are de-duplicated). */
export function loadSwapAssetInfo(
  assetId: bigint,
  algod: algosdk.Algodv2
): Promise<SwapAssetInfo> {
  const cached = getTokenFromLocalStorage(assetId);
  if (cached) return Promise.resolve(fromParams(assetId, cached));
  const key = assetId.toString();
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = getTokenFromAlgod(assetId, algod)
    .then((params) => {
      if (!params) throw new Error(`Asset ${assetId} not found`);
      return fromParams(assetId, params);
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}
