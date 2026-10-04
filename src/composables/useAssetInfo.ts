import { ref } from "vue";

export interface AssetInfoSource<T> {
  getAssetInfo(assetId: bigint | number): T | null;
  requestAsset(assetId: bigint | number, callback: () => void): Promise<void>;
}

/**
 * Reactive wrapper over assetService. The service caches in localStorage,
 * which Vue cannot observe, so a computed that reads asset info once never
 * recomputes when the asset arrives. `assetInfo()` subscribes the caller to a
 * version counter that is bumped whenever a requested asset finishes loading,
 * and triggers the load for assets that are missing (once per asset).
 */
export function useAssetInfo<T>(source: AssetInfoSource<T>) {
  const version = ref(0);
  const requested = new Set<string>();

  const assetInfo = (assetId: bigint | number): T | null => {
    void version.value; // dependency: recompute when any requested asset loads
    const info = source.getAssetInfo(assetId);
    if (info) return info;

    const key = assetId.toString();
    if (!requested.has(key)) {
      requested.add(key);
      void source.requestAsset(assetId, () => {
        version.value++;
      });
    }
    return null;
  };

  return { assetInfo, version };
}
