// src/composables/useAccountHoldings.ts - Reactive view of the connected
// account's balances (native + ASA), opted-in applications and minimum
// balance, read from algod. Refreshed automatically when the address changes
// and on demand after a swap / opt-in lands.
import { computed, ref, shallowRef, watch, type Ref } from "vue";
import { algorandService } from "../services/algorandService";

export interface AccountHoldings {
  /** asset id -> amount in base units; key 0n is the native token. */
  balances: Map<bigint, bigint>;
  optedInApps: Set<bigint>;
  minBalance: bigint;
}

const EMPTY: AccountHoldings = {
  balances: new Map(),
  optedInApps: new Set(),
  minBalance: 0n,
};

export function useAccountHoldings(address: Ref<string | null | undefined>) {
  const holdings = shallowRef<AccountHoldings>(EMPTY);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let requestId = 0;

  async function refresh(): Promise<void> {
    const addr = address.value;
    const current = ++requestId;
    if (!addr) {
      holdings.value = EMPTY;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const info = await algorandService
        .getAlgodClient()
        .accountInformation(addr)
        .do();
      if (current !== requestId) return;
      const balances = new Map<bigint, bigint>();
      balances.set(0n, info.amount);
      for (const holding of info.assets ?? []) {
        balances.set(holding.assetId, holding.amount);
      }
      holdings.value = {
        balances,
        optedInApps: new Set((info.appsLocalState ?? []).map((app) => app.id)),
        minBalance: info.minBalance,
      };
    } catch (e: unknown) {
      if (current !== requestId) return;
      error.value = e instanceof Error ? e.message : String(e);
      holdings.value = EMPTY;
    } finally {
      if (current === requestId) loading.value = false;
    }
  }

  watch(address, () => void refresh(), { immediate: true });

  const isOptedIn = (assetId: bigint): boolean =>
    assetId === 0n || holdings.value.balances.has(assetId);

  const balanceOf = (assetId: bigint): bigint | undefined =>
    holdings.value.balances.get(assetId);

  /**
   * Native balance the account can actually spend: total minus the minimum
   * balance requirement and a small reserve for the swap's own fees.
   */
  const spendableNative = computed<bigint>(() => {
    const total = holdings.value.balances.get(0n) ?? 0n;
    const reserve = holdings.value.minBalance + 100_000n;
    return total > reserve ? total - reserve : 0n;
  });

  return {
    holdings,
    loading,
    error,
    refresh,
    isOptedIn,
    balanceOf,
    spendableNative,
  };
}
