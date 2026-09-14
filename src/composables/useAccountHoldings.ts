// src/composables/useAccountHoldings.ts - Reactive view of the connected
// account's balances (native + ASA), opted-in applications and minimum
// balance, read from algod. Refreshed automatically when the address changes
// and on demand after a swap / opt-in lands.
import { computed, ref, shallowRef, watch, type Ref } from "vue";
import {
  algorandService,
  type AccountHoldings,
} from "../services/algorandService";
import { isNativeAsset } from "../swap/assetInfo";

const EMPTY: AccountHoldings = {
  balances: new Map(),
  optedInApps: new Set(),
  minBalance: 0n,
};

/** Fee headroom kept back from the native balance when spending "max". */
const NATIVE_FEE_RESERVE = 100_000n;

export function useAccountHoldings(address: Ref<string | null | undefined>) {
  const holdings = shallowRef<AccountHoldings>(EMPTY);
  const loading = ref(false);
  const error = ref<string | null>(null);
  /** True once holdings for the current address were fetched successfully. */
  const loaded = ref(false);
  let requestId = 0;

  async function refresh(): Promise<void> {
    const addr = address.value;
    const current = ++requestId;
    loading.value = false;
    error.value = null;
    if (!addr) {
      holdings.value = EMPTY;
      loaded.value = false;
      return;
    }
    loading.value = true;
    try {
      const result = await algorandService.getAccountHoldings(addr);
      if (current !== requestId) return;
      holdings.value = result;
      loaded.value = true;
    } catch (e: unknown) {
      if (current !== requestId) return;
      error.value = e instanceof Error ? e.message : String(e);
      holdings.value = EMPTY;
      loaded.value = false;
    } finally {
      if (current === requestId) loading.value = false;
    }
  }

  watch(address, () => void refresh(), { immediate: true });

  /** Undefined until holdings are known; never guesses from an empty map. */
  const isOptedIn = (assetId: bigint): boolean | undefined => {
    if (isNativeAsset(assetId)) return true;
    if (!loaded.value) return undefined;
    return holdings.value.balances.has(assetId);
  };

  const balanceOf = (assetId: bigint): bigint | undefined =>
    loaded.value ? holdings.value.balances.get(assetId) : undefined;

  /**
   * Amount of an asset the account can actually spend: the full ASA balance,
   * or the native balance minus the minimum-balance requirement and a small
   * fee reserve. Undefined until holdings are known.
   */
  const spendableOf = (assetId: bigint): bigint | undefined => {
    if (!loaded.value) return undefined;
    if (!isNativeAsset(assetId)) return holdings.value.balances.get(assetId);
    const total = holdings.value.balances.get(0n) ?? 0n;
    const reserve = holdings.value.minBalance + NATIVE_FEE_RESERVE;
    return total > reserve ? total - reserve : 0n;
  };

  const optedInApps = computed(() => holdings.value.optedInApps);

  return {
    holdings,
    loading,
    loaded,
    error,
    refresh,
    isOptedIn,
    balanceOf,
    spendableOf,
    optedInApps,
  };
}
