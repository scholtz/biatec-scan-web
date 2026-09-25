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
    // requestAsset's callback fires once per call, on both success and a
    // failed load (there's no way to tell them apart from the callback
    // alone). Calling onLoaded unconditionally means a permanently-missing
    // asset keeps re-requesting on every recompute, but assetService's own
    // MIN_LOAD_INTERVAL throttles that to at most once per ~2s, and it's
    // self-limiting - it stops the moment the component stops re-rendering
    // (e.g. on unmount), so this is a bounded, low-impact retry rather than
    // a runaway loop, and it lets a transient failure self-heal for free.
    assetService.requestAsset(id, () => onLoaded?.());
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
