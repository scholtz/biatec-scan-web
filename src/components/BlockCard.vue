<template>
  <div
    class="card hover:border-primary-500/30 transition-all duration-300 animate-slide-up"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-white">
        Block #{{ block.round.toLocaleString() }}
      </h3>
      <span class="text-xs text-gray-400">
        {{ formattedTime }}
      </span>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <div>
        <p class="text-sm text-gray-400 mb-1">Transactions</p>
        <p class="text-white font-medium">
          {{
            (
              block.txnCounter - (previousBlock?.txnCounter || 0n)
            ).toLocaleString()
          }}
        </p>
      </div>
      <div class="flex flex-col justify-between items-center">
        <p class="text-sm text-gray-400 mb-1">Round Time</p>
        <p class="text-white font-medium">
          {{ new Date(Number(block.timestamp) * 1000).toLocaleTimeString() }}
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
import { ref, computed, onMounted, onUnmounted } from "vue";
import algosdk from "algosdk";

const props = defineProps<{
  block: algosdk.BlockHeader;
  previousBlock: algosdk.BlockHeader | null;
}>();

// Create a reactive timestamp that updates every second
const currentTime = ref(Date.now());
let timeInterval: number | null = null;

const formatTime = (timestamp: bigint) => {
  const now = currentTime.value / 1000;
  const diff = now - Number(timestamp);

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formattedTime = computed(() => formatTime(props.block.timestamp));

onMounted(() => {
  // Update current time every second
  timeInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000) as unknown as number;
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});
</script>
