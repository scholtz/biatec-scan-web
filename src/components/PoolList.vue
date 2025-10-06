<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-white">
        {{ $t("assetDetails.recentPools") }}
      </h3>
      <div v-if="loading" class="text-sm text-gray-400">
        {{ $t("common.loading") }}...
      </div>
    </div>

    <div v-if="error" class="text-red-400 text-sm bg-red-900/20 p-3 rounded">
      {{ error }}
    </div>

    <div
      v-if="!loading && pools.length === 0"
      class="text-gray-400 text-center py-8"
    >
      {{ $t("assetDetails.noPools") }}
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="pool in pools"
        :key="`${pool.poolAddress}-${pool.timestamp}`"
        class="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800/70 transition-colors"
      >
        <PoolCard :pool="pool" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { getAVMTradeReporterAPI } from "../api";
import { Pool } from "../api/models";
import { signalrService } from "../services/signalrService";
import type { SubscriptionFilter } from "../types/SubscriptionFilter";
import PoolCard from "./PoolCard.vue";

const { t } = useI18n();

const props = defineProps<{
  assetId: string;
}>();

const pools = ref<Pool[]>([]);
const loading = ref(false);
const error = ref<string>("");
let subscriptionFilter: SubscriptionFilter | null = null;

async function fetchPools(assetId: string = props.assetId) {
  if (!assetId || assetId === "0") {
    pools.value = [];
    return;
  }

  try {
    loading.value = true;
    error.value = "";

    const api = getAVMTradeReporterAPI();
    const response = await api.getApiPool({
      assetIdA: Number(assetId),
      size: 20,
    });

    // Sort by timestamp (most recent first) and take only 20 most recent
    const sortedPools = response.data || [];
    sortedPools.sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    );
    pools.value = sortedPools.slice(0, 20);
  } catch (err: unknown) {
    console.error("Error fetching pools:", err);
    error.value = t("assetDetails.poolsFetchError");
  } finally {
    loading.value = false;
  }
}

function handlePoolUpdate(pool: Pool) {
  // Only add pools for this specific asset
  if (
    pool.assetIdA?.toString() === props.assetId ||
    pool.assetIdB?.toString() === props.assetId
  ) {
    // Check if pool with same poolAppId already exists
    const existingIndex = pools.value.findIndex(
      (p) => p.poolAppId === pool.poolAppId
    );

    if (existingIndex !== -1) {
      // Pool already exists, replace it with updated version
      pools.value[existingIndex] = pool;
    } else {
      // New pool, add to list
      pools.value.unshift(pool);
    }

    // Always sort by timestamp (most recent first) and keep only 20 most recent
    pools.value.sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    );
    pools.value = pools.value.slice(0, 20);
  }
}

function createSubscriptionFilter(assetId: string): SubscriptionFilter {
  return {
    RecentBlocks: false,
    RecentTrades: false,
    RecentLiquidity: false,
    RecentPool: true,
    RecentAggregatedPool: false,
    RecentAssets: false,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: [assetId],
  };
}

async function subscribeToPoolUpdates(assetId: string) {
  await unsubscribeFromPoolUpdates();
  const filter = createSubscriptionFilter(assetId);
  subscriptionFilter = filter;
  await signalrService.subscribe(filter);
}

async function unsubscribeFromPoolUpdates() {
  if (!subscriptionFilter) {
    return;
  }

  const filter = subscriptionFilter;
  subscriptionFilter = null;
  await signalrService.unsubscribeFilter(filter);
}

onMounted(async () => {
  await fetchPools();
  signalrService.onPoolReceived(handlePoolUpdate);
  await subscribeToPoolUpdates(props.assetId);
});

onUnmounted(async () => {
  signalrService.unsubscribeFromPoolUpdates(handlePoolUpdate);
  await unsubscribeFromPoolUpdates();
});

watch(
  () => props.assetId,
  async (newAssetId, oldAssetId) => {
    if (newAssetId === oldAssetId) {
      return;
    }

    await fetchPools(newAssetId);
    await subscribeToPoolUpdates(newAssetId);
  }
);
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>
