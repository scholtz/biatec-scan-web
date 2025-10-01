<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">{{ $t('assetDetails.title', { name: headerName }) }}</h1>
      <div class="flex items-center gap-3">
        <div class="text-sm text-gray-400">ID: {{ assetId }}</div>
        <button
          @click="toggleFavorite"
          class="favorite-star-btn transition-all duration-300 hover:scale-110 active:scale-95"
          :class="isFavorite ? 'text-yellow-400 animate-pulse' : 'text-gray-400 hover:text-yellow-300'"
          :title="isFavorite ? $t('common.removeFromFavorites') : $t('common.addToFavorites')"
        >
          <svg
            class="w-5 h-5 transition-all duration-300"
            :class="{ 'drop-shadow-lg': isFavorite }"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="isFavorite"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
            <path
              v-else
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="card space-y-4">
      <div class="flex">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
          <div>
            <div class="text-xs text-gray-400">{{ $t('assetDetails.name') }}</div>
            <div class="text-white">{{ name }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-400">{{ $t('assetDetails.unit') }}</div>
            <div class="text-white">{{ unitName }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-400">{{ $t('assetDetails.decimals') }}</div>
            <div class="text-white">{{ decimals }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-400">{{ $t('assetDetails.totalSupply') }}</div>
            <div class="text-white">{{ formattedTotal }}</div>
          </div>
        </div>
        <div class="align-right text-right">
          <img
            :src="`https://algorand-trades.de-4.biatec.io/api/asset/image/${assetId}`"
            :alt="$t('assetDetails.assetImage')"
            class="inline-block w-50 h-50 ml-1"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <router-link
          :to="{
            name: 'AggregatedPoolsByAsset',
            params: { asset1: assetId },
          }"
          class="btn-secondary"
        >
          {{ $t('assetDetails.viewAllPools', { name }) }}
        </router-link>
        <router-link
          :to="{
            name: 'PoolsByAssets',
            params: { asset1: assetId, asset2: 0 },
          }"
          class="btn-secondary"
        >
          {{ $t('assetDetails.viewPoolsWithAlgo') }}
        </router-link>
        <router-link
          :to="{
            name: 'PoolsByAssets',
            params: { asset1: assetId, asset2: 31566704 },
          }"
          class="btn-secondary"
        >
          {{ $t('assetDetails.viewPoolsWithUsdc') }}
        </router-link>
      </div>
    </div>

    <!-- Recent Activity Sections -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Aggregated Pools and Recent Trades Section -->
      <div class="space-y-4">
        <!-- Aggregated Pools -->
        <div class="card">
          <AggregatedPoolsList :assetId="assetId" :maxItems="5" />
        </div>
        
        <!-- Recent Trades Section -->
        <div class="card">
          <TradesList :assetId="assetId" />
        </div>
      </div>

      <!-- Recent Liquidity Updates Section -->
      <div class="card">
        <LiquidityList :assetId="assetId" />
      </div>

      <!-- Recent Pool Updates Section -->
      <div class="card">
        <PoolList :assetId="assetId" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { assetService } from "../services/assetService";
import { favoriteService } from "../services/favoriteService";
import { signalrService } from "../services/signalrService";
import type { SubscriptionFilter } from "../types/SubscriptionFilter";
import type { BiatecAsset } from "../api/models";
import TradesList from "../components/TradesList.vue";
import LiquidityList from "../components/LiquidityList.vue";
import PoolList from "../components/PoolList.vue";
import AggregatedPoolsList from "../components/AggregatedPoolsList.vue";

const { t } = useI18n();

const route = useRoute();
const assetId = ref<string>(route.params.assetId as string);

const forceUpdate = ref<number>(0);
let assetSubscriptionFilter: SubscriptionFilter | null = null;

const name = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return t('common.loading');
  return info.name || `Asset ${assetId.value}`;
});

const unitName = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return t('common.loading');
  return info.unitName || info.name || `Asset ${assetId.value}`;
});

const decimals = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return t('common.loading');
  return info.decimals ?? 0;
});

const formattedTotal = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return t('common.loading');
  const d = info.decimals || 0;
  const total = Number(info.total) / Math.pow(10, d);
  return total.toLocaleString();
});

const headerName = computed(() => `${unitName.value}/${name.value}`);

const isFavorite = computed(() => {
  return favoriteService.isReactiveFavorite(Number(assetId.value));
});

const toggleFavorite = () => {
  const assetIndex = Number(assetId.value);
  favoriteService.toggleFavorite(assetIndex);
  
  // Force reactivity update
  const favoritesRef = favoriteService.getReactiveFavorites();
  favoritesRef.value = new Set(favoritesRef.value);
};

function ensureLoaded() {
  const id = BigInt(Number(assetId.value) || 0);
  assetService.requestAsset(id, () => {
    forceUpdate.value++;
  });
}

function handleAssetUpdate(asset: BiatecAsset) {
  // Check if this update is for the current asset
  if (asset.index?.toString() === assetId.value) {
    console.log("Asset update received for current asset:", asset);
    forceUpdate.value++;
  }
}

onMounted(() => {
  ensureLoaded();
  
  // Subscribe to asset updates for this specific asset
  signalrService.onAssetReceived(handleAssetUpdate);
  assetSubscriptionFilter = {
    RecentBlocks: false,
    RecentTrades: false,
    RecentLiquidity: false,
    RecentPool: false,
    RecentAggregatedPool: false,
    RecentAssets: true,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: [assetId.value], // Subscribe to this specific asset
  };
  signalrService.subscribe(assetSubscriptionFilter);
});

onUnmounted(() => {
  signalrService.unsubscribeFromAssetUpdates(handleAssetUpdate);
  if (assetSubscriptionFilter) {
    signalrService.unsubscribeFilter(assetSubscriptionFilter);
  }
});

watch(
  () => route.params.assetId,
  (v) => {
    const newAssetId = String(v ?? "0");
    if (newAssetId !== assetId.value) {
      // Unsubscribe from the old asset
      if (assetSubscriptionFilter) {
        signalrService.unsubscribeFilter(assetSubscriptionFilter);
      }
      
      // Update asset ID and reload
      assetId.value = newAssetId;
      ensureLoaded();
      
      // Subscribe to the new asset
      assetSubscriptionFilter = {
        RecentBlocks: false,
        RecentTrades: false,
        RecentLiquidity: false,
        RecentPool: false,
        RecentAggregatedPool: false,
        RecentAssets: true,
        MainAggregatedPools: false,
        PoolsAddresses: [],
        AggregatedPoolsIds: [],
        AssetIds: [newAssetId], // Subscribe to this specific asset
      };
      signalrService.subscribe(assetSubscriptionFilter);
    }
  }
);
</script>

<style scoped></style>
