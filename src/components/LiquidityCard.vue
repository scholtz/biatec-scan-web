<template>
  <div class="card">
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-gray-400">
        {{ formatTimestamp(liquidity.timestamp) }}
      </span>
      <span
        class="text-xs px-2 py-1 rounded"
        :class="
          liquidity.direction === 'Add'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        "
      >
        {{ liquidity.direction }} LP
      </span>
    </div>

    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Pool:</span>
        <span class="text-sm text-white truncate ml-2">
          {{ liquidity.poolAppId }}
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Asset A:</span>
        <span class="text-sm text-white">
          {{ formatAmount(liquidity.assetAmountA) }}
          <span class="text-xs text-gray-400">({{ liquidity.assetIdA }})</span>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Asset B:</span>
        <span class="text-sm text-white">
          {{ formatAmount(liquidity.assetAmountB) }}
          <span class="text-xs text-gray-400">({{ liquidity.assetIdB }})</span>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">LP Tokens:</span>
        <span class="text-sm text-white">
          {{ formatAmount(liquidity.assetAmountLP) }}
          <span class="text-xs text-gray-400">({{ liquidity.assetIdLP }})</span>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Provider:</span>
        <span class="text-xs text-blue-400 font-mono truncate ml-2">
          {{ formatAddress(liquidity.liquidityProvider) }}
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Protocol:</span>
        <span class="text-xs text-purple-400">
          {{ liquidity.protocol }}
        </span>
      </div>
    </div>

    <div class="mt-3 pt-3 border-t border-gray-700">
      <div class="text-xs text-gray-500 truncate">TX: {{ liquidity.txId }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AMMLiquidity } from "../types/algorand";

interface Props {
  liquidity: AMMLiquidity;
}

defineProps<Props>();

const formatAmount = (amount: number): string => {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(2) + "M";
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2) + "K";
  }
  return amount.toString();
};

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) {
    return `${diffSecs}s ago`;
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};
</script>
