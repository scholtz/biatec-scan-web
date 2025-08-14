<template>
  <div
    class="card hover:border-primary-500/30 transition-all duration-300 animate-slide-up"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-white">
        Block #{{ block.round.toLocaleString() }}
      </h3>
      <span class="text-xs text-gray-400">
        <FormattedTime :timestamp="block.timestamp" />
      </span>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <div>
        <p class="text-sm text-gray-400 mb-1">Transactions</p>
        <p class="text-white font-medium">
          {{ block.transactions.toLocaleString() }}
        </p>
      </div>
      <div class="flex flex-col justify-between items-center">
        <p class="text-sm text-gray-400 mb-1">Round Time</p>
        <p class="text-white font-medium">
          {{ new Date(block.timestamp).toLocaleTimeString() }}
        </p>
      </div>
      <div class="flex justify-between items-center w-full">
        <router-link
          :to="{
            name: 'BlockDetails',
            params: { round: block.round.toString() },
          }"
          class="btn-primary text-sm w-full text-center"
        >
          Details
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FormattedTime from "./FormattedTime.vue";
import { BiatecBlock } from "../types/BiatecBlock";

defineProps<{
  block: BiatecBlock;
}>();
</script>
