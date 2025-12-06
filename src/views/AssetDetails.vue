<template>
  <div class="p-4 space-y-4">
    <!-- Compact Header Card -->
    <div class="card">
      <div class="flex flex-col md:flex-row gap-6 items-start">
        <!-- Left: Asset Image -->
        <div class="flex-shrink-0 mx-auto md:mx-0">
          <div
            class="w-32 h-32 rounded-full bg-white/5 p-2 shadow-lg flex items-center justify-center overflow-hidden"
          >
            <img
              :src="`https://algorand-trades.de-4.biatec.io/api/asset/image/${assetId}`"
              :alt="$t('assetDetails.assetImage')"
              class="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>

        <!-- Right: Content -->
        <div class="flex-grow w-full space-y-6">
          <!-- Header Row -->
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                class="text-3xl font-bold text-white flex flex-wrap items-baseline gap-x-3 gap-y-1"
              >
                {{ name }}
                <span class="text-xl text-gray-400 font-normal">{{
                  unitName
                }}</span>
              </h1>
              <div class="flex items-center gap-3 mt-2">
                <span
                  class="px-2 py-1 rounded bg-white/10 text-xs text-gray-300 font-mono"
                  >ID: {{ assetId }}</span
                >
                <button
                  @click="toggleFavorite"
                  class="transition-all duration-300 hover:scale-110 active:scale-95 p-1"
                  :class="
                    isFavorite
                      ? 'text-yellow-400'
                      : 'text-gray-500 hover:text-yellow-300'
                  "
                  :title="
                    isFavorite
                      ? $t('common.removeFromFavorites')
                      : $t('common.addToFavorites')
                  "
                >
                  <svg
                    class="w-5 h-5"
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
          </div>

          <!-- Stats Grid -->
          <div
            class="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-4"
          >
            <div>
              <div class="text-xs text-gray-400 uppercase tracking-wider mb-1">
                {{ $t("assetDetails.decimals") }}
              </div>
              <div class="text-lg text-white font-mono">{{ decimals }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 uppercase tracking-wider mb-1">
                {{ $t("assetDetails.totalSupply") }}
              </div>
              <div class="text-lg text-white font-mono">
                {{ formattedTotal }}
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3 pt-2">
            <router-link
              :to="{
                name: 'AggregatedPoolsByAsset',
                params: { asset1: assetId },
              }"
              class="btn-secondary text-sm py-2 px-4"
            >
              {{ $t("assetDetails.viewAllPools", { name }) }}
            </router-link>
            <router-link
              :to="{
                name: 'PoolsByAssets',
                params: { asset1: assetId, asset2: 0 },
              }"
              class="btn-secondary text-sm py-2 px-4"
            >
              {{ $t("assetDetails.viewPoolsWithAlgo") }}
            </router-link>
            <router-link
              :to="{
                name: 'PoolsByAssets',
                params: { asset1: assetId, asset2: 31566704 },
              }"
              class="btn-secondary text-sm py-2 px-4"
            >
              {{ $t("assetDetails.viewPoolsWithUsdc") }}
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity Sections - 4 column layout on wide screens -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <!-- Aggregated Pools Section -->
      <div class="card">
        <AggregatedPoolsList :assetId="assetId" :maxItems="20" />
      </div>

      <!-- Recent Trades Section -->
      <div class="card">
        <TradesList :assetId="assetId" />
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
  if (!info) return t("common.loading");
  return info.name || `Asset ${assetId.value}`;
});

const unitName = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return t("common.loading");
  return info.unitName || info.name || `Asset ${assetId.value}`;
});

const decimals = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return t("common.loading");
  return info.decimals ?? 0;
});

const formattedTotal = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return t("common.loading");
  const d = info.decimals || 0;
  const total = Number(info.total) / Math.pow(10, d);
  return total.toLocaleString();
});

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

function createAssetSubscriptionFilter(id: string): SubscriptionFilter {
  return {
    RecentBlocks: false,
    RecentTrades: false,
    RecentLiquidity: false,
    RecentPool: false,
    RecentAggregatedPool: false,
    RecentAssets: true,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: [id],
  };
}

async function subscribeToAssetUpdates(id: string) {
  await unsubscribeFromAssetUpdates();
  const filter = createAssetSubscriptionFilter(id);
  assetSubscriptionFilter = filter;
  await signalrService.subscribe(filter);
}

async function unsubscribeFromAssetUpdates() {
  if (!assetSubscriptionFilter) {
    return;
  }

  const filter = assetSubscriptionFilter;
  assetSubscriptionFilter = null;
  await signalrService.unsubscribeFilter(filter);
}

function handleAssetUpdate(asset: BiatecAsset) {
  try {
    if (asset.index?.toString() === assetId.value) {
      console.log("Asset update received for current asset:", asset);
      forceUpdate.value++;
    }
  } catch (error) {
    console.error("Error handling asset update:", error);
  }
}

onMounted(async () => {
  ensureLoaded();

  signalrService.onAssetReceived(handleAssetUpdate);
  await subscribeToAssetUpdates(assetId.value);
});

onUnmounted(async () => {
  signalrService.unsubscribeFromAssetUpdates(handleAssetUpdate);
  await unsubscribeFromAssetUpdates();
});

watch(
  () => route.params.assetId,
  async (v) => {
    const newAssetId = String(v ?? "0");
    if (newAssetId === assetId.value) {
      return;
    }

    assetId.value = newAssetId;
    ensureLoaded();
    await subscribeToAssetUpdates(newAssetId);
  }
);
</script>

<style scoped></style>
