<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="card mb-8">
      <h1 class="text-2xl font-bold text-white mb-4">
        Search Algorand Network
      </h1>
      <p class="text-gray-400 mb-6">Search by block number or transaction ID</p>

      <div class="flex space-x-4">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            @keyup.enter="performSearch"
            type="text"
            placeholder="Enter block number or transaction ID..."
            class="input-field w-full"
          />
        </div>
        <button
          @click="performSearch"
          :disabled="!searchQuery.trim() || isSearching"
          class="btn-primary flex items-center space-x-2"
        >
          <svg
            v-if="isSearching"
            class="animate-spin w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <svg
            v-else
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span>{{ isSearching ? "Searching..." : "Search" }}</span>
        </button>
      </div>
    </div>

    <!-- Search Results -->
    <div v-if="searchResult">
      <h2 class="text-xl font-bold text-white mb-6">Search Results</h2>

      <!-- Block Result -->
      <div v-if="searchResult.type === 'block'" class="mb-8">
        <BlockCard :block="searchResult.data" :previousBlock="null" />

        <!-- Block Transactions -->
        <div v-if="blockTransactions.length" class="mt-8">
          <h3 class="text-lg font-semibold text-white mb-4">
            Transactions in Block #{{ searchResult.data.round }} ({{
              blockTransactions.length
            }})
          </h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <TransactionCard
              v-for="tx in paginatedTransactions"
              :key="tx.id"
              :transaction="tx"
            />
          </div>

          <!-- Pagination -->
          <div
            v-if="totalPages > 1"
            class="flex justify-center items-center space-x-4 mt-8"
          >
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span class="text-gray-400">
              Page {{ currentPage }} of {{ totalPages }}
            </span>
            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Transaction Result -->
      <div v-else-if="searchResult.type === 'transaction'">
        <TransactionCard :transaction="searchResult.data" />
      </div>
    </div>

    <!-- No Results -->
    <div
      v-else-if="hasSearched && !searchResult"
      class="card text-center py-12"
    >
      <h2 class="text-xl font-semibold text-white mb-2">No Results Found</h2>
      <p class="text-gray-400 mb-4">
        Could not find a block or transaction with ID: "{{ lastSearchQuery }}"
      </p>
      <p class="text-sm text-gray-500">
        Make sure you entered a valid block number or transaction ID.
      </p>
    </div>

    <!-- Search Tips -->
    <div v-if="!hasSearched" class="card">
      <h2 class="text-lg font-semibold text-white mb-4">Search Tips</h2>
      <div class="space-y-3 text-gray-300">
        <div class="flex items-start space-x-3">
          <span class="text-primary-400 mt-1">•</span>
          <div>
            <p class="font-medium">Block Search</p>
            <p class="text-sm text-gray-400">
              Enter a block number (e.g., 12345678)
            </p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <span class="text-primary-400 mt-1">•</span>
          <div>
            <p class="font-medium">Transaction Search</p>
            <p class="text-sm text-gray-400">
              Enter a complete transaction ID (64-character string)
            </p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <span class="text-primary-400 mt-1">•</span>
          <div>
            <p class="font-medium">Case Sensitive</p>
            <p class="text-sm text-gray-400">
              Transaction IDs are case-sensitive
            </p>
          </div>
        </div>
      </div>
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
