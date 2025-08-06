<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="block">
      <!-- Block Header -->
      <div class="card mb-8">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold text-white">
            Block #{{ block.round.toLocaleString() }}
          </h1>
          <span class="status-badge status-success">Confirmed</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p class="text-sm text-gray-400 mb-1">Timestamp</p>
            <p class="text-white font-medium">
              {{ new Date(Number(block.timestamp) * 1000).toLocaleString() }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-1">Transactions</p>
            <p class="text-white font-medium">
              {{ block.txnCounter.toLocaleString() }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-1">Transaction Counter</p>
            <p class="text-white font-medium">
              {{ block.txnCounter.toLocaleString() }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-1">Genesis ID</p>
            <p class="text-white font-medium font-mono text-sm">
              {{ block.genesisID }}
            </p>
          </div>
        </div>

        <div class="mt-6 pt-6 border-t border-dark-700">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p class="text-sm text-gray-400 mb-2">Previous Block Hash</p>
              <p
                class="text-white font-mono text-sm bg-dark-900 p-3 rounded border break-all"
              >
                {{ block.branch || "Genesis Block" }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-400 mb-2">Genesis Hash</p>
              <p
                class="text-white font-mono text-sm bg-dark-900 p-3 rounded border break-all"
              >
                {{ block.genesisHash }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between items-center mb-8">
        <router-link
          v-if="block.round > 1"
          :to="{
            name: 'BlockDetails',
            params: { round: Number(block?.round) - 1 },
          }"
          class="btn-secondary flex items-center space-x-2"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Previous Block</span>
        </router-link>
        <div v-else></div>

        <router-link
          :to="{
            name: 'BlockDetails',
            params: { round: Number(block?.round) + 1 },
          }"
          class="btn-secondary flex items-center space-x-2"
        >
          <span>Next Block</span>
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </router-link>
      </div>

      <!-- Transactions -->
      <div>
        <h2 class="text-2xl font-bold text-white mb-6">
          Transactions ({{ transactions.length.toLocaleString() }})
        </h2>

        <div v-if="isLoadingTransactions" class="flex justify-center py-12">
          <div class="loading-spinner"></div>
        </div>

        <div
          v-else-if="transactions.length"
          class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          <TransactionCard
            v-for="tx in paginatedTransactions"
            :key="tx.id"
            :transaction="tx"
          />
        </div>

        <div v-else class="card text-center py-12">
          <p class="text-gray-400">No transactions in this block</p>
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

    <div v-else class="card text-center py-12">
      <h2 class="text-xl font-semibold text-white mb-2">Block Not Found</h2>
      <p class="text-gray-400 mb-4">The requested block could not be found.</p>
      <router-link to="/" class="btn-primary">Back to Dashboard</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { algorandService } from "../services/algorandService";
import type { AlgorandTransaction } from "../types/algorand";
import TransactionCard from "../components/TransactionCard.vue";
import { BlockHeader } from "algosdk";

const route = useRoute();
const block = ref<BlockHeader | null>(null);
const transactions = ref<AlgorandTransaction[]>([]);
const isLoading = ref(true);
const isLoadingTransactions = ref(true);
const currentPage = ref(1);
const transactionsPerPage = 12;

const totalPages = computed(() =>
  Math.ceil(transactions.value.length / transactionsPerPage)
);
const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * transactionsPerPage;
  const end = start + transactionsPerPage;
  return transactions.value.slice(start, end);
});

const loadBlock = async (round: bigint) => {
  isLoading.value = true;
  isLoadingTransactions.value = true;
  currentPage.value = 1;

  try {
    const blockData = await algorandService.getBlock(round);
    block.value = blockData;

    if (blockData) {
      const txData = await algorandService.getBlockTransactions(round);
      transactions.value = txData;
    }
  } catch (error) {
    console.error("Error loading block:", error);
    block.value = null;
  }

  isLoading.value = false;
  isLoadingTransactions.value = false;
};

watch(
  () => route.params.round,
  (newRound) => {
    if (newRound) {
      var round = BigInt(newRound.toString());
      loadBlock(round);
    }
  }
);

onMounted(() => {
  const round = BigInt(route.params.round.toString());
  if (round) {
    loadBlock(round);
  }
});
</script>
