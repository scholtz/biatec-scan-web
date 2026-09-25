import { assetService } from "../services/assetService";
import type { Pool } from "../api/models";

// Structural stand-in for vue-i18n's `t` signature (its own type is a complex
// overloaded generic not worth importing here) - params are whatever
// interpolation values a given translation key expects, which this helper
// never inspects itself.
type Translate = (key: string, params?: Record<string, unknown>) => string;

/**
 * Human-readable label for an asset id, requesting its metadata if not yet
 * cached. assetService's cache is a plain localStorage-backed lookup, not a
 * reactive store, so a caller that isn't otherwise re-rendered periodically
 * (no ambient live-data subscriptions) should pass `onLoaded` to know when
 * to recompute this label - otherwise it can get stuck on the "Asset <id>"
 * placeholder even after the real metadata has loaded.
 */
export function getAssetLabel(
  assetId: number | null | undefined,
  t: Translate,
  onLoaded?: () => void,
): string {
  if (assetId === undefined || assetId === null) return t("common.unknown");
  const id = BigInt(assetId);
  const info = assetService.getAssetInfo(id);
  if (!info) {
    // requestAsset's callback fires on both success and failure (so the UI
    // never hangs waiting forever) - only call onLoaded when the asset is
    // actually now cached, otherwise a permanently-failing load (deleted
    // asset, node error) would have onLoaded trigger a recompute that finds
    // the asset still missing, request it again, and loop indefinitely.
    assetService.requestAsset(id, () => {
      if (assetService.getAssetInfo(id)) onLoaded?.();
    });
    return `${t("common.asset")} ${assetId}`;
  }
  return info.unitName || info.name || `${t("common.asset")} ${assetId}`;
}

/** "<assetA> / <assetB>" label for a pool, used wherever a pool is identified from an address or application. */
export function formatPoolPair(
  pool: Pool,
  t: Translate,
  onLoaded?: () => void,
): string {
  return `${getAssetLabel(pool.assetIdA, t, onLoaded)} / ${getAssetLabel(pool.assetIdB, t, onLoaded)}`;
}
