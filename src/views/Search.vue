<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
    <!-- Search Panel -->
    <div class="card mb-6 md:mb-8">
      <div class="flex flex-col md:flex-row md:items-end gap-4">
        <div class="flex-1 w-full">
          <h1
            class="text-2xl font-bold text-white mb-2 flex items-center gap-2"
          >
            <svg
              class="w-6 h-6 text-primary-400"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Network Search
            <span
              v-if="searchResult"
              class="ml-2 text-sm text-gray-400 font-normal"
              >(Found {{ searchResult.type }})</span
            >
          </h1>
          <p class="text-gray-400 text-sm mb-3 md:mb-4">
            Block round or 64-char transaction ID
          </p>
          <div class="relative group">
            <input
              v-model="searchQuery"
              @keyup.enter="performSearch"
              type="text"
              :placeholder="inputPlaceholder"
              class="w-full pl-11 pr-14 py-3 rounded-lg bg-dark-800/60 border border-dark-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm text-white placeholder-gray-500 transition"
            />
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <svg
                class="w-5 h-5 text-gray-500 group-focus-within:text-primary-400"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 1 0-14 0 7 7 0 0 0 14 0Z" />
              </svg>
            </div>
            <button
              @click="performSearch"
              :disabled="!searchQuery.trim() || isSearching"
              class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              <span v-if="isSearching" class="flex items-center gap-1">
                <svg
                  class="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Searching
              </span>
              <span v-else class="flex items-center gap-1">
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 1 0-14 0 7 7 0 0 0 14 0Z" />
                </svg>
                Search
              </span>
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-3 text-[10px] md:text-xs">
            <button
              @click="prefillExample('50000000')"
              class="px-2 py-1 rounded bg-dark-700/60 hover:bg-dark-600 text-gray-300"
            >
              Example Block
            </button>
            <button
              @click="prefillExample(sampleTxId)"
              class="px-2 py-1 rounded bg-dark-700/60 hover:bg-dark-600 text-gray-300"
            >
              Example Tx
            </button>
            <span
              v-if="isBlockQuery"
              class="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300"
              >Block Detected</span
            >
            <span
              v-else-if="isTxQuery"
              class="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300"
              >Transaction Detected</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Skeleton while searching (and no result yet) -->
    <div v-if="isSearching && !searchResult" class="space-y-4 mb-8">
      <div class="animate-pulse h-24 rounded-lg bg-dark-800/40"></div>
      <div class="animate-pulse h-24 rounded-lg bg-dark-800/30"></div>
      <div class="animate-pulse h-24 rounded-lg bg-dark-800/20"></div>
    </div>

    <!-- Results -->
    <div v-if="searchResult" class="space-y-8">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold text-white">
          {{
            searchResult.type === "block"
              ? "Block Result"
              : "Transaction Result"
          }}
        </h2>
        <button
          class="text-xs px-2 py-1 rounded bg-dark-700/60 hover:bg-dark-600 text-gray-300"
          @click="resetSearch"
        >
          New Search
        </button>
      </div>

      <!-- Block -->
      <div v-if="searchResult.type === 'block'" class="space-y-6">
        <div class="relative">
          <BlockCard :block="searchResult.data" :previousBlock="null" />
          <div class="absolute top-2 right-2 flex gap-2">
            <button
              @click="copyToClipboard(searchResult.data.round.toString())"
              class="px-2 py-1 rounded bg-dark-700/70 hover:bg-dark-600 text-[10px] text-gray-300"
            >
              Copy Round
            </button>
          </div>
        </div>

        <div v-if="blockTransactions.length" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-lg font-medium text-white">
              Transactions ({{ blockTransactions.length }})
            </h3>
            <div class="flex items-center gap-2 text-[11px] text-gray-400">
              <span>Page {{ currentPage }} / {{ totalPages }}</span>
              <div class="flex gap-1">
                <button
                  @click="currentPage--"
                  :disabled="currentPage === 1"
                  class="px-2 py-1 rounded bg-dark-700/60 hover:bg-dark-600 disabled:opacity-30"
                >
                  Prev
                </button>
                <button
                  @click="currentPage++"
                  :disabled="currentPage === totalPages"
                  class="px-2 py-1 rounded bg-dark-700/60 hover:bg-dark-600 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <TransactionCard
              v-for="tx in paginatedTransactions"
              :key="tx.id"
              :transaction="tx"
            />
          </div>
        </div>
        <div v-else class="text-xs text-gray-500 italic">
          No transactions in this block.
        </div>
      </div>

      <!-- Transaction -->
      <div v-else class="space-y-4">
        <div class="relative">
          <TransactionCard :transaction="searchResult.data" />
          <div class="absolute top-2 right-2 flex gap-2">
            <button
              @click="copyToClipboard(searchResult.data.id)"
              class="px-2 py-1 rounded bg-dark-700/70 hover:bg-dark-600 text-[10px] text-gray-300"
            >
              Copy TxID
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- No Result After Search -->
    <div
      v-else-if="hasSearched && !searchResult && !isSearching"
      class="card text-center py-10"
    >
      <h2 class="text-lg md:text-xl font-semibold text-white mb-2">
        No Results Found
      </h2>
      <p class="text-gray-400 mb-4 text-sm md:text-base">
        Nothing matches "{{ lastSearchQuery }}"
      </p>
      <button
        @click="resetSearch"
        class="px-3 py-1.5 rounded bg-dark-700/70 hover:bg-dark-600 text-xs text-gray-200"
      >
        Try Again
      </button>
    </div>

    <!-- Tips (initial) -->
    <div v-if="!hasSearched && !searchResult" class="card">
      <h2 class="text-lg font-semibold text-white mb-4">How to Search</h2>
      <ul class="space-y-3 text-gray-300 text-sm">
        <li class="flex gap-3">
          <span class="text-primary-400">•</span>
          <div>
            <span class="font-medium">Block:</span> enter a round number (e.g.
            50,000,000)
          </div>
        </li>
        <li class="flex gap-3">
          <span class="text-primary-400">•</span>
          <div>
            <span class="font-medium">Transaction:</span> paste a full 64-char
            ID
          </div>
        </li>
        <li class="flex gap-3">
          <span class="text-primary-400">•</span>
          <div>
            <span class="font-medium">Auto detect:</span> we infer whether it's
            a block or transaction
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { algorandService } from "../services/algorandService";
import type { AlgorandTransaction } from "../types/algorand";
import BlockCard from "../components/BlockCard.vue";
import TransactionCard from "../components/TransactionCard.vue";

const route = useRoute();
const searchQuery = ref("");
const searchResult = ref<{ type: "block" | "transaction"; data: any } | null>(
  null
);
const blockTransactions = ref<AlgorandTransaction[]>([]);
const isSearching = ref(false);
const hasSearched = ref(false);
const lastSearchQuery = ref("");
const currentPage = ref(1);
const transactionsPerPage = 9;

const totalPages = computed(() =>
  Math.ceil(blockTransactions.value.length / transactionsPerPage)
);
const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * transactionsPerPage;
  const end = start + transactionsPerPage;
  return blockTransactions.value.slice(start, end);
});

// Heuristics for input type
const isBlockQuery = computed(() =>
  /^(\d{1,12})$/.test(searchQuery.value.trim())
);
const isTxQuery = computed(() =>
  /^[A-Z0-9]{40,}$/.test(searchQuery.value.trim())
);
const inputPlaceholder = computed(() =>
  isBlockQuery.value
    ? "Press Enter to open block"
    : isTxQuery.value
      ? "Press Enter to open transaction"
      : "Enter block round or transaction ID"
);
const sampleTxId = "SAMPLETRANSACTIONIDPLACEHOLDER1234567890ABCDEF123456"; // truncated sample

const performSearch = async () => {
  if (!searchQuery.value.trim()) return;

  isSearching.value = true;
  hasSearched.value = true;
  lastSearchQuery.value = searchQuery.value.trim();
  searchResult.value = null;
  blockTransactions.value = [];
  currentPage.value = 1;

  try {
    const result = await algorandService.searchById(lastSearchQuery.value);
    searchResult.value = result;

    // If it's a block, load its transactions
    if (result?.type === "block") {
      const transactions = await algorandService.getBlockTransactions(
        result.data.round
      );
      blockTransactions.value = transactions;
    }
  } catch (error) {
    console.error("Search error:", error);
    searchResult.value = null;
  }

  isSearching.value = false;
};

function copyToClipboard(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch (e) {
    // ignore
  }
}

function prefillExample(val: string) {
  searchQuery.value = val;
  performSearch();
}

function resetSearch() {
  searchQuery.value = "";
  searchResult.value = null;
  hasSearched.value = false;
  blockTransactions.value = [];
  currentPage.value = 1;
}

// Handle URL query parameter
watch(
  () => route.query.q,
  (newQuery) => {
    if (newQuery && typeof newQuery === "string") {
      searchQuery.value = newQuery;
      performSearch();
    }
  }
);

onMounted(() => {
  const queryParam = route.query.q;
  if (queryParam && typeof queryParam === "string") {
    searchQuery.value = queryParam;
    performSearch();
  }
});
</script>
