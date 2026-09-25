import { assetService } from "../services/assetService";
import type { Pool } from "../api/models";

type Translate = (key: string, params?: Record<string, unknown>) => string;

/** Human-readable label for an asset id, requesting its metadata if not yet cached. */
export function getAssetLabel(
  assetId: number | null | undefined,
  t: Translate,
): string {
  if (assetId === undefined || assetId === null) return t("common.unknown");
  const info = assetService.getAssetInfo(BigInt(assetId));
  if (!info) {
    assetService.requestAsset(BigInt(assetId), () => {});
    return `${t("common.asset")} ${assetId}`;
  }
  return info.unitName || info.name || `${t("common.asset")} ${assetId}`;
}

/** "<assetA> / <assetB>" label for a pool, used wherever a pool is identified from an address or application. */
export function formatPoolPair(pool: Pool, t: Translate): string {
  return `${getAssetLabel(pool.assetIdA, t)} / ${getAssetLabel(pool.assetIdB, t)}`;
}
