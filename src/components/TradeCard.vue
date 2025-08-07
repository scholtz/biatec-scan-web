<template>
  <div class="card border-l-4 border-l-blue-500">
    <div class="flex flex-row gap-3 mb-3 w-full">
      <div class="text-right w-full flex-grow">
        <p class="text-xs text-gray-400 mb-1" :title="trade.trader">
          {{ algorandService.formatAddress(trade.trader) }}
          Sold
        </p>
        <p class="text-white text-sm">
          {{ trade.assetAmountIn.toLocaleString() }}
        </p>
        <p class="text-xs text-gray-500">ID: {{ trade.assetIdIn }}</p>
      </div>
      <div
        class="flex flex-col min-w-20 items-center justify-center"
        style="width: 1.5rem"
      >
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center bg-blue-600"
        >
          <span class="text-white text-xs font-bold">⇄</span>
        </div>
        <p class="text-xs text-gray-400 text-center mt-2">
          {{ formatTime(trade.timestamp) }}
        </p>
      </div>
      <div class="w-full flex-grow">
        <p class="text-xs text-gray-400 mb-1">Bought</p>
        <p class="text-white text-sm">
          {{ trade.assetAmountOut.toLocaleString() }}
        </p>
        <p class="text-xs text-gray-500">ID: {{ trade.assetIdOut }}</p>
      </div>
    </div>

    <div class="flex justify-between items-center">
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

const props = defineProps<{
  trade: AMMTrade;
}>();

const formatTime = (timestamp: string) => {
  const tradeTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diff = (now - tradeTime) / 1000;

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const calculatePrice = () => {
  if (props.trade.assetAmountIn === 0) return "N/A";
  const price = props.trade.assetAmountOut / props.trade.assetAmountIn;
  return price.toFixed(6);
};
</script>
