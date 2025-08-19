<template>
  <StyledBox>
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-white">
        <router-link
          :to="{
            name: 'BlockDetails',
            params: { round: block.round.toString() },
          }"
          class="text-lg w-full text-center text-blue-100 hover:text-blue-300 transition-colors duration-300"
        >
          Block #{{ block.round.toLocaleString() }}
        </router-link>
      </h3>
      <span class="text-xs text-gray-400">
        <FormattedTime :timestamp="block.timestamp" />
      </span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-gray-400 mb-1">Transactions</p>
        <p class="text-white font-medium">
          {{ block.transactions.toLocaleString() }}
        </p>
      </div>
      <div class="flex flex-col justify-between items-right">
        <p class="text-sm text-gray-400 mb-1 text-right">Round Time</p>
        <p class="text-white font-medium text-right">
          {{ new Date(block.timestamp).toLocaleTimeString() }}
        </p>
      </div>
    </div>
  </StyledBox>
</template>

<script setup lang="ts">
import FormattedTime from "./FormattedTime.vue";
import { BiatecBlock } from "../types/BiatecBlock";
import StyledBox from "./StyledBox.vue";

defineProps<{
  block: BiatecBlock;
}>();
</script>
