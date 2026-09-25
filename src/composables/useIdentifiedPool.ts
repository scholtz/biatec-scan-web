import { ref } from "vue";
import { getAVMTradeReporterAPI } from "../api";
import type { Pool } from "../api/models";

/**
 * Looks up whether a given on-chain address is itself a known DEX pool's
 * escrow account - used both for a viewed address (AddressDetails.vue) and
 * for a viewed application's own escrow address (ApplicationDetails.vue,
 * since every pool is itself an application).
 */
export function useIdentifiedPool() {
  const api = getAVMTradeReporterAPI();
  const identifiedPool = ref<Pool | null>(null);
  // True while a lookup is in flight - callers whose "not found" state for
  // some other, independently-fetched resource would otherwise render before
  // this pool check has had a chance to settle should also wait on this, so
  // a slow pool lookup can't be raced by a faster negative result elsewhere.
  const isLoading = ref(false);

  // Tracks the address the most recent call was made for, so a slow fetch
  // superseded by a newer call (the viewed address/application changed
  // again before the previous lookup resolved) can detect it's stale and
  // discard its result instead of overwriting the current target's state.
  let latestAddress = "";

  async function fetchIdentifiedPool(address: string): Promise<void> {
    latestAddress = address;
    identifiedPool.value = null;
    if (!address) return;

    isLoading.value = true;
    try {
      const response = await api.getApiPool({ address, size: 1 });
      if (address !== latestAddress) return;
      identifiedPool.value = response.data?.[0] ?? null;
    } catch (error) {
      if (address !== latestAddress) return;
      console.error("Error identifying pool:", error);
    } finally {
      if (address === latestAddress) isLoading.value = false;
    }
  }

  return { identifiedPool, isLoading, fetchIdentifiedPool };
}
