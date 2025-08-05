<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card text-center">
        <h3 class="text-2xl font-bold text-white mb-2">{{ latestBlocks[0]?.round.toLocaleString() || '...' }}</h3>
        <p class="text-gray-400">Latest Block</p>
      </div>
      <div class="card text-center">
        <h3 class="text-2xl font-bold text-white mb-2">{{ totalTransactions.toLocaleString() }}</h3>
        <p class="text-gray-400">Recent Transactions</p>
      </div>
      <div class="card text-center">
        <h3 class="text-2xl font-bold text-white mb-2">{{ recentTrades.length }}</h3>
        <p class="text-gray-400">AMM Trades</p>
      </div>
      <div class="card text-center">
        <h3 class="text-2xl font-bold" :class="connectionStatus ? 'text-green-400' : 'text-red-400'">
          {{ connectionStatus ? 'LIVE' : 'OFFLINE' }}
        </h3>
        <p class="text-gray-400">Network Status</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Latest Blocks -->
      <div class="lg:col-span-2">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-white">Latest Blocks</h2>
          <button @click="refreshBlocks" class="btn-secondary flex items-center space-x-2" :disabled="isLoading">
            <svg class="w-4 h-4" :class="{ 'animate-spin': isLoading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        <div v-if="isLoading && !latestBlocks.length" class="flex justify-center py-12">
          <div class="loading-spinner"></div>
        </div>

        <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <BlockCard v-for="block in latestBlocks" :key="block.round" :block="block" />
        </div>
      </div>

      <!-- AMM Trades Sidebar -->
      <div>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">Live AMM Trades</h2>
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 rounded-full" :class="connectionStatus ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></div>
            <span class="text-xs text-gray-400">{{ connectionStatus ? 'Live' : 'Offline' }}</span>
          </div>
        </div>

        <div v-if="!recentTrades.length" class="card text-center py-8">
          <p class="text-gray-400">{{ connectionStatus ? 'Waiting for trades...' : 'Connecting to live feed...' }}</p>
        </div>

        <div v-else class="space-y-4 max-h-96 overflow-y-auto">
          <TradeCard v-for="trade in recentTrades.slice(0, 10)" :key="trade.id" :trade="trade" />
        </div>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="mt-12">
      <h2 class="text-2xl font-bold text-white mb-6">Recent Transactions</h2>
      
      <div v-if="isLoadingTransactions" class="flex justify-center py-12">
        <div class="loading-spinner"></div>
      </div>

      <div v-else-if="recentTransactions.length" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <TransactionCard v-for="tx in recentTransactions.slice(0, 9)" :key="tx.id" :transaction="tx" />
      </div>

      <div v-else class="card text-center py-12">
        <p class="text-gray-400">No recent transactions available</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { algorandService } from '../services/algorandService';
import { signalrService } from '../services/signalrService';
import type { AlgorandBlock, AlgorandTransaction, AMMTrade } from '../types/algorand';
import BlockCard from '../components/BlockCard.vue';
import TransactionCard from '../components/TransactionCard.vue';
import TradeCard from '../components/TradeCard.vue';

const latestBlocks = ref<AlgorandBlock[]>([]);
const recentTransactions = ref<AlgorandTransaction[]>([]);
const recentTrades = ref<AMMTrade[]>([]);
const isLoading = ref(true);
const isLoadingTransactions = ref(true);
const connectionStatus = ref(false);
let refreshInterval: number | null = null;

const totalTransactions = computed(() => {
  return latestBlocks.value.reduce((sum, block) => sum + block.txns, 0);
});

const refreshBlocks = async () => {
  isLoading.value = true;
  try {
    const blocks = await algorandService.getLatestBlocks(20);
    latestBlocks.value = blocks;
    
    // Load transactions for the latest few blocks
    if (blocks.length > 0) {
      isLoadingTransactions.value = true;
      const txPromises = blocks.slice(0, 5).map(block => 
        algorandService.getBlockTransactions(block.round)
      );
      const txResults = await Promise.all(txPromises);
      const allTransactions: AlgorandTransaction[] = [];
      txResults.forEach(txArray => allTransactions.push(...txArray));
      recentTransactions.value = allTransactions.slice(0, 50);
      isLoadingTransactions.value = false;
    }
  } catch (error) {
    console.error('Error refreshing blocks:', error);
  }
  isLoading.value = false;
};

onMounted(async () => {
  await refreshBlocks();
  
  // Set up real-time updates
  refreshInterval = setInterval(refreshBlocks, 30000); // Refresh every 30 seconds
  
  // Set up SignalR for AMM trades
  signalrService.onTradeReceived((trade: AMMTrade) => {
    recentTrades.value.unshift(trade);
    if (recentTrades.value.length > 50) {
      recentTrades.value = recentTrades.value.slice(0, 50);
    }
  });
  
  // Check connection status
  setInterval(() => {
    connectionStatus.value = signalrService.getConnectionState();
  }, 5000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>