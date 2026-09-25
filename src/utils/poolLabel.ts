import { assetService } from "../services/assetService";
import type { Pool } from "../api/models";

// Structural stand-in for vue-i18n's `t` signature (its own type is a complex
// overloaded generic not worth importing here) - params are whatever
// interpolation values a given translation key expects, which this helper
// never inspects itself.
type Translate = (key: string, params?: Record<string, unknown>) => string;

// requestAsset's callback fires once per call, on both success and a failed
// load (transient node error/timeout, or a permanently missing/deleted
// asset) - there's no way to tell those apart from the callback alone. Retry
// a bounded number of times (throttled by assetService's own
// MIN_LOAD_INTERVAL) so a transient failure gets a chance to self-heal, then
// give up so a permanently-missing asset doesn't loop forever.
const MAX_LOAD_RETRIES = 3;
const loadRetryCounts = new Map<string, number>();

function requestAssetWithBoundedRetry(id: bigint, onLoaded?: () => void) {
  const key = id.toString();
  assetService.requestAsset(id, () => {
    if (assetService.getAssetInfo(id)) {
      loadRetryCounts.delete(key);
      onLoaded?.();
      return;
    }
    const attempts = (loadRetryCounts.get(key) ?? 0) + 1;
    if (attempts >= MAX_LOAD_RETRIES) {
      loadRetryCounts.delete(key);
      return;
    }
    loadRetryCounts.set(key, attempts);
    // Bumps the caller's reactive state so it recomputes and re-requests,
    // even though the asset itself didn't load this time.
    onLoaded?.();
  });
}

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
    requestAssetWithBoundedRetry(id, onLoaded);
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
