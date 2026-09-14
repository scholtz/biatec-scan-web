// src/swap/assetInfo.ts - Minimal asset metadata the swap UI needs, resolved
// from the app's existing localStorage cache first and algod second (the
// project prefers algod over the indexer for chain lookups).
import type algosdk from "algosdk";
import { nativeTokenName, nativeTokenUnit } from "../config/env";
import { getTokenFromAlgod } from "../scripts/algo/getTokenFromAlgod";
import { getTokenFromLocalStorage } from "../scripts/algo/getTokenFromLocalStorage";

export interface SwapAssetInfo {
  id: bigint;
  name: string;
  unitName: string;
  decimals: number;
}

export const NATIVE_ASSET: SwapAssetInfo = {
  id: 0n,
  name: nativeTokenName,
  unitName: nativeTokenUnit,
  decimals: 6,
};

export function assetLabel(asset: SwapAssetInfo): string {
  return asset.unitName || asset.name || `#${asset.id}`;
}

const inflight = new Map<string, Promise<SwapAssetInfo>>();

/** Resolve asset metadata by id (cached; concurrent calls are de-duplicated). */
export function loadSwapAssetInfo(
  assetId: bigint,
  algod: algosdk.Algodv2
): Promise<SwapAssetInfo> {
  if (assetId === 0n) return Promise.resolve(NATIVE_ASSET);
  const cached = getTokenFromLocalStorage(assetId);
  if (cached) {
    return Promise.resolve({
      id: assetId,
      name: cached.name,
      unitName: cached.unitName,
      decimals: cached.decimals,
    });
  }
  const key = assetId.toString();
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = getTokenFromAlgod(assetId, algod)
    .then((params) => {
      if (!params) throw new Error(`Asset ${assetId} not found`);
      return {
        id: assetId,
        name: params.name,
        unitName: params.unitName,
        decimals: params.decimals,
      };
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/** Synchronous best-effort lookup for display; undefined until loaded. */
export function peekSwapAssetInfo(assetId: bigint): SwapAssetInfo | undefined {
  if (assetId === 0n) return NATIVE_ASSET;
  const cached = getTokenFromLocalStorage(assetId);
  return cached
    ? {
        id: assetId,
        name: cached.name,
        unitName: cached.unitName,
        decimals: cached.decimals,
      }
    : undefined;
}
