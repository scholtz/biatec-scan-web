import { ref, computed, watch, type Ref } from "vue";
import {
  matchesTxFilter,
  type FilterableTransaction,
  type TxFilterState,
} from "../utils/txFilter";

const PAGE_SIZE = 25;

/**
 * Filters and paginates an already-fetched transaction list entirely in
 * memory. Pairs with `useAddressBalanceHistory`, which fetches the address's
 * transactions (up to 1000) in a single request — no further network calls
 * are made when the filter changes or the user pages through results.
 */
export function usePagedFilteredTransactions(
  transactions: Ref<FilterableTransaction[]>,
  filter: Ref<TxFilterState>,
) {
  const page = ref(0);

  const filteredTransactions = computed(() =>
    transactions.value.filter((tx) => matchesTxFilter(tx, filter.value)),
  );

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredTransactions.value.length / PAGE_SIZE)),
  );

  const pagedTransactions = computed(() =>
    filteredTransactions.value.slice(
      page.value * PAGE_SIZE,
      (page.value + 1) * PAGE_SIZE,
    ),
  );

  const canGoNext = computed(() => page.value + 1 < totalPages.value);

  function next(): void {
    if (canGoNext.value) page.value++;
  }

  function prev(): void {
    if (page.value > 0) page.value--;
  }

  watch(filter, () => {
    page.value = 0;
  });

  watch(transactions, () => {
    page.value = 0;
  });

  return {
    filteredTransactions,
    pagedTransactions,
    page,
    totalPages,
    canGoNext,
    next,
    prev,
  };
}
