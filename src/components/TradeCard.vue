<template>
  <div
    class="card border-l-4"
    :class="trade.type === 'buy' ? 'border-l-green-500' : 'border-l-red-500'"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-3">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center"
          :class="trade.type === 'buy' ? 'bg-green-600' : 'bg-red-600'"
        >
          <span class="text-white text-xs font-bold">{{
            trade.type === "buy" ? "↗" : "↘"
          }}</span>
        </div>
        <div>
          <h4 class="font-medium text-white capitalize">{{ trade.type }}</h4>
          <p class="text-xs text-gray-400">{{ formatTime(trade.timestamp) }}</p>
        </div>
      </div>
      <span class="text-sm font-mono text-primary-400">
        ${{ trade.price.toFixed(4) }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-3">
      <div>
        <p class="text-xs text-gray-400 mb-1">Asset A</p>
        <p class="text-white text-sm">{{ trade.amountA.toLocaleString() }}</p>
        <p class="text-xs text-gray-500">{{ trade.assetA }}</p>
      </div>
      <div>
        <p class="text-xs text-gray-400 mb-1">Asset B</p>
        <p class="text-white text-sm">{{ trade.amountB.toLocaleString() }}</p>
        <p class="text-xs text-gray-500">{{ trade.assetB }}</p>
      </div>
    </div>

    <div class="mb-3">
      <p class="text-xs text-gray-400 mb-1">Pool</p>
      <p
        class="text-white text-sm font-mono bg-dark-900 p-2 rounded border truncate"
      >
        {{ trade.pool }}
      </p>
    </div>

    <div class="flex justify-between items-center">
      <span class="text-xs text-gray-400">
        {{ algorandService.formatAddress(trade.sender) }}
      </span>
      <router-link
        :to="{ name: 'TransactionDetails', params: { txId: trade.txId } }"
        class="text-primary-400 hover:text-primary-300 text-xs transition-colors duration-200"
      >
        View Tx →
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AMMTrade } from "../types/algorand";
import { algorandService } from "../services/algorandService";

defineProps<{
  trade: AMMTrade;
}>();

const formatTime = (timestamp: number) => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
</script>
