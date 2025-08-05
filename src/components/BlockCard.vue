<template>
  <div class="card hover:border-primary-500/30 transition-all duration-300 animate-slide-up">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-white">
        Block #{{ block.round.toLocaleString() }}
      </h3>
      <span class="text-xs text-gray-400">
        {{ formatTime(block.timestamp) }}
      </span>
    </div>
    
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p class="text-sm text-gray-400 mb-1">Transactions</p>
        <p class="text-white font-medium">{{ block.txns.toLocaleString() }}</p>
      </div>
      <div>
        <p class="text-sm text-gray-400 mb-1">Round Time</p>
        <p class="text-white font-medium">{{ new Date(block.timestamp * 1000).toLocaleTimeString() }}</p>
      </div>
    </div>
    
    <div class="mb-4">
      <p class="text-sm text-gray-400 mb-1">Previous Hash</p>
      <p class="text-white font-mono text-xs bg-dark-900 p-2 rounded border truncate">
        {{ block['previous-block-hash'] || 'N/A' }}
      </p>
    </div>
    
    <div class="flex justify-between items-center">
      <span class="status-badge status-success">
        Confirmed
      </span>
      <router-link 
        :to="{ name: 'BlockDetails', params: { round: block.round } }"
        class="btn-primary text-sm"
      >
        View Details
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AlgorandBlock } from '../types/algorand';

defineProps<{
  block: AlgorandBlock;
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