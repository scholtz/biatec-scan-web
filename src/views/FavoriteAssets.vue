<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">
        {{ $t("favorites.title") }}
      </h1>
      <div class="flex items-center gap-2 text-sm">
        <button
          class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
          @click="refresh"
        >
          {{ $t("common.refresh") }}
        </button>
        <button
          class="px-2 py-1 rounded bg-green-700 text-gray-200 hover:bg-green-600 text-xs"
          @click="addDemoAssets"
          :disabled="favoriteAssets.length > 0"
        >
          {{ $t("favorites.addDemoAssets") }}
        </button>
        <button
          class="px-2 py-1 rounded bg-red-700 text-gray-200 hover:bg-red-600 text-xs"
          @click="clearAllFavorites"
          :disabled="favoriteAssets.length === 0"
        >
          {{ $t("favorites.clearAll") }}
        </button>
      </div>
    </div>

    <div class="flex items-center gap-4 text-xs text-gray-400">
      <div>
        {{ $t("favorites.view") }}:
        <button
          @click="currentView = 'table'"
          :class="[
            'px-2 py-1 rounded ml-1',
            currentView === 'table'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600',
          ]"
        >
          {{ $t("favorites.table") }}
        </button>
        <button
          @click="currentView = 'blocks'"
          :class="[
            'px-2 py-1 rounded ml-1',
            currentView === 'blocks'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600',
          ]"
        >
          {{ $t("favorites.blocks") }}
        </button>
      </div>
      <div>
        {{ $t("favorites.totalFavorites") }}:
        <span class="text-white">{{ favoriteAssets.length }}</span>
      </div>
      <ColumnSettingsPanel v-if="currentView === 'table'" :columns="tableColumns" class="ml-auto" />
    </div>

    <div v-if="loading" class="text-gray-400">
      {{ $t("favorites.loadingFavoriteAssets") }}
    </div>
    <div v-else-if="favoriteAssets.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">{{ $t("favorites.noFavoritesYet") }}</div>
      <router-link
        to="/assets"
        class="text-blue-400 hover:text-blue-300 underline"
      >
        {{ $t("favorites.browseAssetsToAdd") }}
      </router-link>
    </div>

    <div v-if="!loading && favoriteAssets.length > 0">
      <div v-if="error" class="text-red-400 mb-4">{{ error }}</div>
      <!-- Table View -->
      <div v-if="currentView === 'table'">
        <DataTable
          :table-columns="tableColumns"
          :rows="favoriteAssets"
          :row-key="(a: BiatecAsset) => a.index"
          :sort-fns="sortFns"
          :on-row-click="(a: BiatecAsset) => goToPools(a.index)"
        >
          <template #cell-name="{ row: a }">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <img :src="assetImageUrl(a.index)" class="w-6 h-6 md:w-6 md:h-6 rounded shrink-0" />
              <div class="min-w-0">
                <RouterLink
                  :to="`/asset/${a.index}`"
                  class="text-sm text-white hover:text-blue-300 truncate block"
                  @click.stop
                >
                  {{ a.params?.name || a.params?.unitName || t("favorites.assetPrefix") + a.index }}
                </RouterLink>
                <div class="text-[10px] text-gray-400 truncate font-mono md:hidden">
                  #{{ a.index }} • {{ a.params?.unitName || "-" }}
                </div>
              </div>
              <CopyToClipboard
                @click.stop
                :text="a.index.toString()"
                :toast-message="`Copied ${a.params?.name || a.params?.unitName || 'Asset'} asset ID: ${a.index}`"
                :title="`Copy ${a.params?.name || a.params?.unitName || 'Asset'} asset id: ${a.index}`"
              />
            </div>
          </template>

          <template #cell-rank="{ index }">
            <span class="font-mono">#{{ index + 1 }}</span>
          </template>

          <template #cell-price="{ row: a }">
            <template v-if="a.priceUSD === undefined || a.priceUSD === null">-</template>
            <template v-else>
              <FormattedNumber
                :value="a.priceUSD"
                type="currency"
                :minimum-fraction-digits="2"
                :maximum-fraction-digits="6"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </template>
          </template>

          <template #cell-price7DChart="{ row: a }">
            <AssetSparkline :asset-id="a.index" series="price" :label="t('assets.price7DChart')" />
          </template>

          <template #cell-change1H="{ row: a }">
            <ChangeCell :current="a.priceUSD ?? undefined" :previous="a.priceUSD1H ?? undefined" />
          </template>
          <template #cell-change24H="{ row: a }">
            <ChangeCell :current="a.priceUSD ?? undefined" :previous="a.priceUSD24H ?? undefined" />
          </template>
          <template #cell-change7D="{ row: a }">
            <ChangeCell :current="a.priceUSD ?? undefined" :previous="a.priceUSD7D ?? undefined" />
          </template>

          <template #cell-realTvl="{ row: a }">
            <template v-if="a.tvL_USD === undefined || a.tvL_USD === null">-</template>
            <template v-else>
              <FormattedNumber
                :value="a.tvL_USD"
                type="currency"
                :maximum-fraction-digits="2"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </template>
          </template>

          <template #cell-realTvl7DChart="{ row: a }">
            <AssetSparkline :asset-id="a.index" series="tvl" :label="t('assets.realTvl7DChart')" />
          </template>

          <template #cell-totalTvl="{ row: a }">
            <template v-if="a.totalTVLAssetInUSD === undefined || a.totalTVLAssetInUSD === null">-</template>
            <template v-else>
              <FormattedNumber
                :value="a.totalTVLAssetInUSD"
                type="currency"
                :maximum-fraction-digits="2"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </template>
          </template>

          <template #cell-fdmc="{ row: a }">
            <template v-if="fdmc(a) === undefined">-</template>
            <template v-else>
              <FormattedNumber
                :value="fdmc(a)"
                type="currency"
                compact
                :minimum-fraction-digits="0"
                :maximum-fraction-digits="1"
              />
            </template>
          </template>

          <template #cell-volume1H="{ row: a }">
            <template v-if="a.volume1H === undefined || a.volume1H === null">-</template>
            <template v-else>
              <FormattedNumber
                :value="a.volume1H"
                type="currency"
                :maximum-fraction-digits="2"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </template>
          </template>
          <template #cell-volume24H="{ row: a }">
            <template v-if="a.volume24H === undefined || a.volume24H === null">-</template>
            <template v-else>
              <FormattedNumber
                :value="a.volume24H"
                type="currency"
                :maximum-fraction-digits="2"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </template>
          </template>
          <template #cell-volume7D="{ row: a }">
            <template v-if="a.volume7D === undefined || a.volume7D === null">-</template>
            <template v-else>
              <FormattedNumber
                :value="a.volume7D"
                type="currency"
                :maximum-fraction-digits="2"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </template>
          </template>

          <template #cell-updated="{ row: a }">
            <FormattedTime :timestamp="a.timestamp || new Date().toISOString()" />
          </template>

          <template #cell-favorite="{ row: a }">
            <button
              @click.stop="toggleFavorite(a.index)"
              class="favorite-star-btn transition-all duration-300 hover:scale-110 active:scale-95 text-yellow-400 animate-pulse"
              :title="t('common.removeFromFavorites')"
            >
              <svg
                class="w-5 h-5 transition-all duration-300 drop-shadow-lg"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          </template>

          <template #cell-pools="{ row: a }">
            <RouterLink
              :to="`/aggregated-pools/${a.index}`"
              class="text-xs text-blue-400 hover:text-blue-300"
              @click.stop
            >
              {{ $t("favorites.viewPools") }}
            </RouterLink>
          </template>
        </DataTable>
      </div>

      <!-- Block View -->
      <div v-else-if="currentView === 'blocks'">
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4"
        >
          <AssetBlock
            v-for="a in favoriteAssets"
            :key="a.index"
            :asset="a"
            :show-favorite="true"
            @favorite-changed="onFavoriteChanged"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted, computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { getAVMTradeReporterAPI } from "../api";
import { BiatecAsset } from "../api/models";
import { signalrService } from "../services/signalrService";
import { favoriteService } from "../services/favoriteService";
import FormattedTime from "../components/FormattedTime.vue";
import AssetBlock from "../components/AssetBlock.vue";
import CopyToClipboard from "../components/CopyToClipboard.vue";
import FormattedNumber from "../components/FormattedNumber.vue";
import DataTable from "../components/table/DataTable.vue";
import ColumnSettingsPanel from "../components/table/ColumnSettingsPanel.vue";
import ChangeCell from "../components/table/ChangeCell.vue";
import AssetSparkline from "../components/table/AssetSparkline.vue";
import { useTableColumns } from "../composables/useTableColumns";
import { assetColumns, assetSortFns, fdmc } from "../config/assetColumns";
import { assetImageUrl as sharedAssetImageUrl } from "../config/env";

const { t } = useI18n();
const router = useRouter();

// Clicking a favorite asset row opens its list of pools (aggregated pools by asset),
// matching the row-click behavior of the main assets table.
function goToPools(assetIndex: number) {
  router.push(`/aggregated-pools/${assetIndex}`);
}

// Favorites is just a user-curated filter over the same asset data as the main
// Assets table, so it must always expose the exact same columns — see assetColumns.
const tableColumns = useTableColumns("favorites", assetColumns);
const sortFns = assetSortFns;

interface State {
  loading: boolean;
  error: string;
  favoriteAssets: BiatecAsset[];
  subscribedIds: Set<number>;
}

const state = reactive<State>({
  loading: false,
  error: "",
  favoriteAssets: [],
  subscribedIds: new Set<number>(),
});

const currentView = ref<"table" | "blocks">("table");
const api = getAVMTradeReporterAPI();

async function fetchFavoriteAssets() {
  state.loading = true;
  state.error = "";

  const favoriteIds = favoriteService.getFavoriteAssetIds();
  if (favoriteIds.length === 0) {
    state.favoriteAssets = [];
    state.loading = false;
    return;
  }

  try {
    // Fetch favorite assets using the API with comma-separated IDs
    const idsParam = favoriteIds.join(",");
    const res = await api.getApiAsset({ ids: idsParam });
    state.favoriteAssets = res.data || [];
    resubscribeToVisibleAssets();
  } catch (e: unknown) {
    state.error =
      e instanceof Error ? e.message : "Failed to load favorite assets";
    // Load demo assets for the favorites when API fails
    loadDemoFavoriteAssets(favoriteIds);
  } finally {
    state.loading = false;
  }
}

function loadDemoFavoriteAssets(favoriteIds: number[]) {
  const allDemoAssets: BiatecAsset[] = [
    {
      index: 31566704,
      params: {
        name: "USD Coin",
        unitName: "USDC",
        decimals: 6,
        total: 10000000000,
      },
      priceUSD: 1.0,
      tvL_USD: 50000000,
      totalTVLAssetInUSD: 75000000,
      timestamp: new Date().toISOString(),
    },
    {
      index: 312769,
      params: {
        name: "Tether USDt",
        unitName: "USDt",
        decimals: 6,
        total: 5000000000,
      },
      priceUSD: 0.9999,
      tvL_USD: 25000000,
      totalTVLAssetInUSD: 30000000,
      timestamp: new Date().toISOString(),
    },
    {
      index: 386192725,
      params: {
        name: "goBTC",
        unitName: "goBTC",
        decimals: 8,
        total: 21000000,
      },
      priceUSD: 67250.45,
      tvL_USD: 15000000,
      totalTVLAssetInUSD: 20000000,
      timestamp: new Date().toISOString(),
    },
    {
      index: 386195940,
      params: {
        name: "goETH",
        unitName: "goETH",
        decimals: 8,
        total: 120000000,
      },
      priceUSD: 2580.75,
      tvL_USD: 8000000,
      totalTVLAssetInUSD: 12000000,
      timestamp: new Date().toISOString(),
    },
    {
      index: 27165954,
      params: {
        name: "PLANET",
        unitName: "PLANET",
        decimals: 6,
        total: 10000000000,
      },
      priceUSD: 0.00123,
      tvL_USD: 1200000,
      totalTVLAssetInUSD: 1500000,
      timestamp: new Date().toISOString(),
    },
  ];

  // Filter demo assets to only show those that are favorited
  state.favoriteAssets = allDemoAssets.filter((asset) =>
    favoriteIds.includes(asset.index)
  );
  resubscribeToVisibleAssets();
}

function resubscribeToVisibleAssets() {
  state.subscribedIds = new Set(state.favoriteAssets.map((a) => a.index));
  signalrService.subscribe({
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: state.favoriteAssets.map((a) => BigInt(a.index).toString()),
    MainAggregatedPools: false,
    RecentAggregatedPool: false,
    RecentBlocks: false,
    RecentLiquidity: false,
    RecentAssets: false,
    RecentPool: false,
    RecentTrades: false,
  });
}

function assetUpdateEvent(asset: BiatecAsset) {
  if (!state.subscribedIds.has(asset.index)) return; // ignore assets not in favorites
  console.log("Received asset update on favorites page:", asset);
  const idx = state.favoriteAssets.findIndex((a) => a.index === asset.index);
  if (idx !== -1) {
    state.favoriteAssets[idx] = asset;
  }
}

function refresh() {
  fetchFavoriteAssets();
}

function toggleFavorite(assetIndex: number): void {
  favoriteService.toggleFavorite(assetIndex);
  // Remove the asset from the list if it's no longer a favorite
  if (!favoriteService.isFavorite(assetIndex)) {
    state.favoriteAssets = state.favoriteAssets.filter(
      (a) => a.index !== assetIndex
    );
    resubscribeToVisibleAssets();
  }
}

function onFavoriteChanged(assetIndex: number, isFavorite: boolean) {
  if (!isFavorite) {
    // Remove the asset from the list
    state.favoriteAssets = state.favoriteAssets.filter(
      (a) => a.index !== assetIndex
    );
    resubscribeToVisibleAssets();
  }
}

function clearAllFavorites() {
  if (confirm(t("favorites.confirmClearAll"))) {
    favoriteService.clearFavorites();
    state.favoriteAssets = [];
    state.subscribedIds.clear();
  }
}

function addDemoAssets() {
  // Create some demo assets for testing when API is not available
  const demoAssets: BiatecAsset[] = [
    {
      index: 31566704,
      params: {
        name: "USD Coin",
        unitName: "USDC",
        decimals: 6,
        total: 10000000000,
      },
      priceUSD: 1.0,
      tvL_USD: 50000000,
      totalTVLAssetInUSD: 75000000,
      timestamp: new Date().toISOString(),
    },
    {
      index: 312769,
      params: {
        name: "Tether USDt",
        unitName: "USDt",
        decimals: 6,
        total: 5000000000,
      },
      priceUSD: 0.9999,
      tvL_USD: 25000000,
      totalTVLAssetInUSD: 30000000,
      timestamp: new Date().toISOString(),
    },
    {
      index: 386192725,
      params: {
        name: "goBTC",
        unitName: "goBTC",
        decimals: 8,
        total: 21000000,
      },
      priceUSD: 67250.45,
      tvL_USD: 15000000,
      totalTVLAssetInUSD: 20000000,
      timestamp: new Date().toISOString(),
    },
    {
      index: 386195940,
      params: {
        name: "goETH",
        unitName: "goETH",
        decimals: 8,
        total: 120000000,
      },
      priceUSD: 2580.75,
      tvL_USD: 8000000,
      totalTVLAssetInUSD: 12000000,
      timestamp: new Date().toISOString(),
    },
  ];

  // Add these assets to favorites
  demoAssets.forEach((asset) => {
    favoriteService.addFavorite(asset.index);
  });

  // Set the demo assets in state
  state.favoriteAssets = demoAssets;
  resubscribeToVisibleAssets();
}

function assetImageUrl(id: number) {
  return sharedAssetImageUrl(id);
}

onMounted(async () => {
  signalrService.onAssetReceived(assetUpdateEvent);
  await fetchFavoriteAssets();
});

onUnmounted(() => {
  signalrService.unsubscribeFromAssetUpdates(assetUpdateEvent);
});

const favoriteAssets = computed(() => state.favoriteAssets);
const loading = computed(() => state.loading);
const error = computed(() => state.error);
</script>

<style scoped>
.favorite-star-btn {
  position: relative;
}

.favorite-star-btn:active {
  animation: starPop 0.3s ease-in-out;
}

@keyframes starPop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* Add a subtle glow effect when favorited */
.favorite-star-btn.text-yellow-400:hover {
  filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.5));
}

/* Smooth transition for star state changes */
.favorite-star-btn svg {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
