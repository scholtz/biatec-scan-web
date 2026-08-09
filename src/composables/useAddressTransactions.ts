import { ref, computed, watch, type Ref } from "vue";
import { indexerUrl } from "../config/env";
import {
  matchesTxFilter,
  type FilterableTransaction,
  type TxFilterState,
} from "../utils/txFilter";

const PAGE_SIZE = 25;
// Safety cap on how many extra indexer pages we'll fetch in a row while
// hunting for enough filter matches to fill the next page.
const MAX_FILTER_FETCH_ROUNDS = 20;

/**
 * Fetches an address's recent transactions from the indexer and exposes a
 * filtered, paginated view. Shared between the address detail page's
 * "Recent Transactions" panel and the transaction detail page's address
 * context panel so both apply the same filter semantics.
 */
export function useAddressTransactions(
  address: Ref<string>,
  filter: Ref<TxFilterState>,
) {
  const transactions = ref<FilterableTransaction[]>([]);
  const loading = ref(false);
  const hasMoreRaw = ref(true);
  const nextToken = ref("");
  const page = ref(0);

  const filteredTransactions = computed(() =>
    transactions.value.filter((tx) => matchesTxFilter(tx, filter.value)),
  );

  const pagedTransactions = computed(() =>
    filteredTransactions.value.slice(
      page.value * PAGE_SIZE,
      (page.value + 1) * PAGE_SIZE,
    ),
  );

  const canGoNext = computed(() => {
    const nextStart = (page.value + 1) * PAGE_SIZE;
    return nextStart < filteredTransactions.value.length || hasMoreRaw.value;
  });

  async function loadRawPage(): Promise<void> {
    if (!address.value) return;
    loading.value = true;
    try {
      const url = `${indexerUrl}/v2/accounts/${address.value}/transactions?limit=${PAGE_SIZE}${
        nextToken.value ? `&next=${nextToken.value}` : ""
      }`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load transactions");
      const data = await response.json();
      transactions.value.push(...(data.transactions || []));
      nextToken.value = data["next-token"] || "";
      hasMoreRaw.value = !!data["next-token"];
    } catch (err) {
      console.error("Error loading address transactions:", err);
      hasMoreRaw.value = false;
    } finally {
      loading.value = false;
    }
  }

  async function reset(): Promise<void> {
    transactions.value = [];
    nextToken.value = "";
    hasMoreRaw.value = true;
    page.value = 0;
    if (address.value) await loadRawPage();
  }

  async function next(): Promise<void> {
    let rounds = 0;
    const nextStart = (page.value + 1) * PAGE_SIZE;
    while (
      filteredTransactions.value.length <= nextStart &&
      hasMoreRaw.value &&
      rounds < MAX_FILTER_FETCH_ROUNDS
    ) {
      await loadRawPage();
      rounds += 1;
    }
    if (nextStart < filteredTransactions.value.length || hasMoreRaw.value) {
      page.value++;
    }
  }

  function prev(): void {
    if (page.value > 0) page.value--;
  }

  watch(filter, () => {
    page.value = 0;
  });

  return {
    transactions,
    loading,
    filteredTransactions,
    pagedTransactions,
    page,
    canGoNext,
    reset,
    next,
    prev,
  };
}
