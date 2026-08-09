import { ref, computed, watch, type Ref } from "vue";
import { indexerUrl } from "../config/env";
import type { FilterableTransaction } from "../utils/txFilter";

// The Algorand indexer caps `limit` at 1000 per request, so this is a single
// fetch (not a paginated crawl) covering the address's most recent history.
const MAX_TRANSACTIONS = 1000;

/**
 * Loads up to the 1000 most recent transactions for an address, for
 * computing balance-change statistics over a time window. Exposes whether
 * that window is fully covered by the fetched batch, since older history is
 * simply not downloaded once the cap is hit.
 */
export function useAddressBalanceHistory(address: Ref<string>) {
  const transactions = ref<FilterableTransaction[]>([]);
  const loading = ref(false);
  const error = ref("");
  // True when there is more history beyond what was fetched (i.e. the
  // address has more than MAX_TRANSACTIONS transactions).
  const truncated = ref(false);

  // Oldest transaction's round-time in the fetched batch (indexer returns
  // newest-first, so this is the last element).
  const earliestTime = computed<number | null>(() => {
    const last = transactions.value[transactions.value.length - 1];
    return last?.["round-time"] ?? null;
  });

  async function load(): Promise<void> {
    if (!address.value) return;
    loading.value = true;
    error.value = "";
    try {
      const url = `${indexerUrl}/v2/accounts/${address.value}/transactions?limit=${MAX_TRANSACTIONS}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load transaction history");
      const data = await response.json();
      transactions.value = data.transactions || [];
      truncated.value = !!data["next-token"];
    } catch (err) {
      console.error("Error loading address balance history:", err);
      error.value = "Failed to load transaction history";
      transactions.value = [];
      truncated.value = false;
    } finally {
      loading.value = false;
    }
  }

  // Data only covers back to `earliestTime` when the batch was truncated by
  // the fetch cap; otherwise it is the address's entire history.
  function coversTime(sinceSeconds: number): boolean {
    if (!truncated.value) return true;
    return earliestTime.value === null || earliestTime.value <= sinceSeconds;
  }

  watch(address, load, { immediate: true });

  return { transactions, loading, error, truncated, earliestTime, coversTime, load };
}
