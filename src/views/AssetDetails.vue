<template>
  <div class="p-3 sm:p-4 space-y-3 sm:space-y-4">
    <!-- Compact Header Card -->
    <div class="card">
      <div class="flex flex-col xl:flex-row gap-4 xl:gap-6 items-center xl:items-start">
        <!-- Left: Asset Image -->
        <div class="flex-shrink-0 mx-auto xl:mx-0">
          <div
            class="w-20 h-20 sm:w-28 sm:h-28 xl:w-32 xl:h-32 rounded-full bg-white/5 p-1.5 sm:p-2 shadow-lg flex items-center justify-center overflow-hidden"
          >
            <img
              :src="assetImageUrl(assetId)"
              :alt="$t('assetDetails.assetImage')"
              class="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>

        <!-- Right: Content -->
        <div class="flex-grow w-full min-w-0 space-y-4 sm:space-y-6">
          <!-- Header Row -->
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="w-full xl:w-auto text-center xl:text-left min-w-0">
              <h1
                class="text-2xl sm:text-3xl font-bold text-white flex flex-wrap items-baseline justify-center xl:justify-start gap-x-3 gap-y-1 break-words"
              >
                {{ name }}
                <span class="text-xl text-gray-400 font-normal">{{
                  unitName
                }}</span>
              </h1>
              <div class="flex flex-wrap items-center justify-center xl:justify-start gap-2 sm:gap-3 mt-2">
                <span
                  class="px-2 py-1 rounded bg-white/10 text-xs text-gray-300 font-mono"
                  >ID: {{ assetId }}</span
                >
                <router-link
                  v-if="isSwapAvailable"
                  :to="swapLink"
                  class="px-2 py-1 rounded bg-primary-600/30 hover:bg-primary-600/50 text-xs text-primary-200 transition-colors"
                >
                  {{ $t("swap.title") }}
                </router-link>
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
            class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 border-t border-white/10 pt-4"
          >
            <div class="min-w-0 rounded-lg bg-white/5 px-3 py-2.5 sm:bg-transparent sm:p-0">
              <div class="text-[11px] sm:text-xs text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">
                {{ $t("assetDetails.price") }}
              </div>
              <div class="text-base sm:text-lg text-white font-mono break-all">
                <template v-if="priceUSD === undefined || priceUSD === null"
                  >-</template
                >
                <template v-else>
                  <FormattedNumber
                    :value="priceUSD"
                    type="currency"
                    :minimum-fraction-digits="2"
                    :maximum-fraction-digits="6"
                    :small-threshold="0.01"
                    :significant-digits="4"
                  />
                </template>
              </div>
            </div>
            <div class="min-w-0 rounded-lg bg-white/5 px-3 py-2.5 sm:bg-transparent sm:p-0">
              <div class="text-[11px] sm:text-xs text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">
                {{ $t("assetDetails.volume24H") }}
              </div>
              <div class="text-base sm:text-lg text-white font-mono break-all">
                <template v-if="volume24H === undefined || volume24H === null"
                  >-</template
                >
                <template v-else>
                  <FormattedNumber
                    :value="volume24H"
                    type="currency"
                    :maximum-fraction-digits="2"
                    :small-threshold="0.01"
                    :significant-digits="4"
                  />
                </template>
              </div>
            </div>
            <div class="col-span-2 sm:col-span-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 sm:block min-w-0 rounded-lg bg-white/5 px-3 py-2.5 sm:bg-transparent sm:p-0">
              <div class="text-[11px] sm:text-xs text-gray-400 uppercase tracking-wider sm:mb-1 sm:truncate shrink-0">
                {{ $t("assetDetails.decimals") }}
              </div>
              <div class="text-base sm:text-lg text-white font-mono">{{ decimals }}</div>
            </div>
            <div class="col-span-2 sm:col-span-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 sm:block min-w-0 rounded-lg bg-white/5 px-3 py-2.5 sm:bg-transparent sm:p-0">
              <div class="text-[11px] sm:text-xs text-gray-400 uppercase tracking-wider sm:mb-1 sm:truncate shrink-0">
                {{ $t("assetDetails.totalSupply") }}
              </div>
              <div class="text-base sm:text-lg text-white font-mono break-words sm:break-all ml-auto sm:ml-0 text-right sm:text-left">
                {{ formattedTotal }}
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
            <router-link
              :to="{
                name: 'AggregatedPoolsByAsset',
                params: { asset1: assetId },
              }"
              class="btn-secondary text-sm py-2 px-3 sm:px-4 text-center flex items-center justify-center leading-tight col-span-2 sm:col-span-1"
            >
              {{ $t("assetDetails.viewAllPools", { name }) }}
            </router-link>
            <router-link
              :to="{
                name: 'PoolsByAssets',
                params: { asset1: assetId, asset2: 0 },
              }"
              class="btn-secondary text-sm py-2 px-3 sm:px-4 text-center flex items-center justify-center leading-tight"
            >
              {{ $t("assetDetails.viewPoolsWithAlgo") }}
            </router-link>
            <router-link
              :to="{
                name: 'PoolsByAssets',
                params: { asset1: assetId, asset2: usdcAssetId },
              }"
              class="btn-secondary text-sm py-2 px-3 sm:px-4 text-center flex items-center justify-center leading-tight"
            >
              {{ $t("assetDetails.viewPoolsWithUsdc") }}
            </router-link>
            <router-link
              v-if="assetId !== '0'"
              :to="{ name: 'ActiveHolders', params: { assetId } }"
              class="btn-secondary text-sm py-2 px-3 sm:px-4 text-center flex items-center justify-center leading-tight"
            >
              {{ $t("assetDetails.viewActiveHolders") }}
            </router-link>

            <a
              target="_blank"
              :href="assetChartUrl(assetId)"
              class="btn-secondary text-sm py-2 px-3 sm:px-4 text-center flex items-center justify-center leading-tight"
            >
              {{ $t("assetDetails.fullScreenChart") }}
            </a>
          </div>

          <!-- External Links (Algorand-mainnet-only explorers) -->
          <div
            v-if="isAlgorandMainnet && assetId !== '0'"
            class="flex flex-wrap items-center justify-center xl:justify-start gap-x-4 gap-y-2 pt-2 border-t border-white/10"
          >
            <span class="text-sm text-gray-500">{{ $t("common.externalLinks") }}:</span>
            <a
              :href="`https://allo.info/asset/${assetId}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              Allo <span class="text-xs">↗</span>
            </a>
            <a
              :href="`https://lora.algokit.io/mainnet/asset/${assetId}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              Lora <span class="text-xs">↗</span>
            </a>
            <a
              :href="`https://vestige.fi/asset/${assetId}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              Vestige <span class="text-xs">↗</span>
            </a>
            <a
              :href="`https://explorer.perawallet.app/asset/${assetId}/`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              Pera <span class="text-xs">↗</span>
            </a>
          </div>
        </div>
        <div class="flex flex-grow w-full">
          <iframe
            :src="assetChartUrl(assetId)"
            class="w-full h-72 sm:h-100 rounded-lg border-0 shadow-lg"
          ></iframe>
        </div>
      </div>
    </div>

    <!-- Recent Activity Sections - 4 column layout on wide screens -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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
import {
  assetChartUrl,
  assetImageUrl,
  isAlgorandMainnet,
  usdcAssetId,
} from "../config/env";
import { isSwapAvailable } from "../swap/availability";
import { signalrService } from "../services/signalrService";
import { algorandService } from "../services/algorandService";
import type { SubscriptionFilter } from "../types/SubscriptionFilter";
import type { BiatecAsset } from "../api/models";
import TradesList from "../components/TradesList.vue";
import LiquidityList from "../components/LiquidityList.vue";
import PoolList from "../components/PoolList.vue";
import AggregatedPoolsList from "../components/AggregatedPoolsList.vue";
import FormattedNumber from "../components/FormattedNumber.vue";

const { t } = useI18n();

const route = useRoute();
const assetId = ref<string>(route.params.assetId as string);
// Sell the native token for this asset; on the native token's own page
// fall back to the default pair instead of a same-asset swap.
const swapLink = computed(() =>
  assetId.value === "0" ? "/swap" : `/swap/0/${assetId.value}`
);

const forceUpdate = ref<number>(0);
const reserveBalance = ref<bigint>(0n);
const currentAsset = ref<BiatecAsset | null>(null);
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
  const total = BigInt(Math.round(info.total));
  const circulating = total - reserveBalance.value;
  const circulatingNum = Number(circulating) / Math.pow(10, d);
  return circulatingNum.toLocaleString();
});

const isFavorite = computed(() => {
  return favoriteService.isReactiveFavorite(Number(assetId.value));
});

const priceUSD = computed(() => currentAsset.value?.priceUSD);
const volume24H = computed(() => currentAsset.value?.volume24H);

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
    updateReserveBalance();
  });
}

async function updateReserveBalance() {
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (info && info.reserve) {
    reserveBalance.value = await algorandService.getAccountAssetBalance(
      info.reserve,
      BigInt(assetId.value),
    );
  } else {
    reserveBalance.value = 0n;
  }
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
      currentAsset.value = asset;
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
  },
);
</script>

<style scoped></style>
