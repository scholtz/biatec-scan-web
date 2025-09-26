<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Favorite Assets</h1>
      <div class="flex items-center gap-2 text-sm">
        <button
          class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
          @click="refresh"
        >
          Refresh
        </button>
        <button
          class="px-2 py-1 rounded bg-green-700 text-gray-200 hover:bg-green-600 text-xs"
          @click="addDemoAssets"
          :disabled="favoriteAssets.length > 0"
        >
          Add Demo Assets
        </button>
        <button
          class="px-2 py-1 rounded bg-red-700 text-gray-200 hover:bg-red-600 text-xs"
          @click="clearAllFavorites"
          :disabled="favoriteAssets.length === 0"
        >
          Clear All
        </button>
      </div>
    </div>

    <div class="flex items-center gap-4 text-xs text-gray-400">
      <div>
        View:
        <button
          @click="currentView = 'table'"
          :class="[
            'px-2 py-1 rounded ml-1',
            currentView === 'table' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          ]"
        >
          Table
        </button>
        <button
          @click="currentView = 'blocks'"
          :class="[
            'px-2 py-1 rounded ml-1',
            currentView === 'blocks' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          ]"
        >
          Blocks
        </button>
      </div>
      <div>
        Total Favorites: <span class="text-white">{{ favoriteAssets.length }}</span>
      </div>
    </div>

    <div v-if="loading" class="text-gray-400">Loading favorite assets…</div>
    <div v-else-if="favoriteAssets.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">No favorite assets yet</div>
      <router-link 
        to="/assets" 
        class="text-blue-400 hover:text-blue-300 underline"
      >
        Browse assets to add some favorites
      </router-link>
    </div>

    <div v-if="!loading && favoriteAssets.length > 0">
      <div v-if="error" class="text-red-400 mb-4">{{ error }}</div>
      <!-- Table View -->
      <div v-if="currentView === 'table'">
        <div
          class="hidden md:grid md:grid-cols-10 gap-3 px-2 text-xs text-gray-400 mb-2"
        >
          <div>ID</div>
          <div>Name</div>
          <div>Unit</div>
          <div class="text-right">Decimals</div>
          <div class="text-right">Price (USD)</div>
          <div class="text-right">Real TVL (USD)</div>
          <div class="text-right">Total TVL (USD)</div>
          <div class="text-right">Updated</div>
          <div class="text-center">Favorite</div>
          <div class="text-right">Pools</div>
        </div>
        <div class="space-y-1">
          <div
            v-for="a in favoriteAssets"
            :key="a.index"
            class="p-2 rounded bg-gray-800/40 hover:bg-gray-800/60 transition-colors"
          >
            <!-- Mobile compact layout -->
            <div class="md:hidden flex items-center gap-3">
              <RouterLink
                :to="`/asset/${a.index}`"
                class="flex items-center gap-2 min-w-0 flex-1"
              >
                <img :src="assetImageUrl(a.index)" class="w-8 h-8 rounded" />
                <div class="min-w-0">
                  <div class="text-white text-sm font-medium truncate">
                    {{
                      a.params?.name || a.params?.unitName || "Asset " + a.index
                    }}
                  </div>
                  <div class="text-[10px] text-gray-400 truncate font-mono">
                    #{{ a.index }} • {{ a.params?.unitName || "-" }}
                  </div>
                </div>
              </RouterLink>
              <div class="text-right">
                <div class="text-[10px] text-gray-400">Price</div>
                <div class="text-xs text-white font-mono">
                  {{ formatPrice(a) }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-[10px] text-gray-400">Real TVL</div>
                <div class="text-xs text-white font-mono">
                  {{ formatRealTVL(a) }}
                </div>
              </div>
              <RouterLink
                :to="`/aggregated-pools/${a.index}`"
                class="text-[10px] text-blue-400 hover:text-blue-300 underline ml-2"
                >Pools</RouterLink
              >
              <button
                @click="toggleFavorite(a.index)"
                class="favorite-star-btn transition-all duration-300 hover:scale-110 active:scale-95 ml-2 text-yellow-400 animate-pulse"
                title="Remove from favorites"
              >
                <svg
                  class="w-4 h-4 transition-all duration-300 drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  />
                </svg>
              </button>
              <button
                @click="copyToClipboard(a.index)"
                class="p-1 text-gray-400 hover:text-white transition-colors ml-2"
                :title="`Copy ${a.params?.name || a.params?.unitName || 'Asset'} asset id: ${a.index}`"
              >
                📋
              </button>
            </div>

            <!-- Desktop row layout -->
            <div class="hidden md:grid md:grid-cols-10 gap-3 items-center">
              <div class="font-mono text-xs text-blue-400 truncate flex items-center gap-1">
                <RouterLink
                  :to="`/asset/${a.index}`"
                  class="hover:text-blue-300"
                  >{{ a.index }}</RouterLink
                >
                <button
                  @click="copyToClipboard(a.index)"
                  class="p-1 text-gray-400 hover:text-white transition-colors"
                  :title="`Copy ${a.params?.name || a.params?.unitName || 'Asset'} asset id: ${a.index}`"
                >
                  📋
                </button>
              </div>
              <div class="text-sm text-white truncate flex items-center gap-2">
                <img :src="assetImageUrl(a.index)" class="w-6 h-6 rounded" />
                {{ a.params?.name || "-" }}
              </div>
              <div class="text-sm text-white truncate">
                {{ a.params?.unitName || "-" }}
              </div>
              <div class="text-sm text-white text-right">
                {{ a.params?.decimals ?? 0 }}
              </div>
              <div class="text-sm text-white text-right">
                {{ formatPrice(a) }}
              </div>
              <div class="text-sm text-white text-right">
                {{ formatRealTVL(a) }}
              </div>
              <div class="text-sm text-white text-right">
                {{ formatTotalTVL(a) }}
              </div>
              <div class="text-xs text-gray-400 text-right">
                <FormattedTime
                  :timestamp="a.timestamp || new Date().toISOString()"
                />
              </div>
              <div class="text-center">
                <button
                  @click="toggleFavorite(a.index)"
                  class="favorite-star-btn transition-all duration-300 hover:scale-110 active:scale-95 text-yellow-400 animate-pulse"
                  title="Remove from favorites"
                >
                  <svg
                    class="w-5 h-5 transition-all duration-300 drop-shadow-lg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    />
                  </svg>
                </button>
              </div>
              <div class="text-right">
                <RouterLink
                  :to="`/aggregated-pools/${a.index}`"
                  class="text-xs text-blue-400 hover:text-blue-300"
                >
                  View Pools
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Block View -->
      <div v-else-if="currentView === 'blocks'">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
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
import { getAVMTradeReporterAPI } from "../api";
import { BiatecAsset } from "../api/models";
import { signalrService } from "../services/signalrService";
import { favoriteService } from "../services/favoriteService";
import FormattedTime from "../components/FormattedTime.vue";
import AssetBlock from "../components/AssetBlock.vue";

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

const currentView = ref<'table' | 'blocks'>('table');
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
    const idsParam = favoriteIds.join(',');
    const res = await api.getApiAsset({ ids: idsParam });
    const data = res as unknown as BiatecAsset[] | { data: BiatecAsset[] };
    const list = Array.isArray(data) ? data : (data as { data: BiatecAsset[] }).data;
    state.favoriteAssets = list || [];
    resubscribeToVisibleAssets();
  } catch (e: unknown) {
    const error = e as { message?: string };
    state.error = error?.message || "Failed to load favorite assets";
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
        total: 10000000000
      },
      priceUSD: 1.0,
      tvL_USD: 50000000,
      totalTVLAssetInUSD: 75000000,
      timestamp: new Date().toISOString()
    },
    {
      index: 312769,
      params: {
        name: "Tether USDt",
        unitName: "USDt", 
        decimals: 6,
        total: 5000000000
      },
      priceUSD: 0.9999,
      tvL_USD: 25000000,
      totalTVLAssetInUSD: 30000000,
      timestamp: new Date().toISOString()
    },
    {
      index: 386192725,
      params: {
        name: "goBTC",
        unitName: "goBTC",
        decimals: 8,
        total: 21000000
      },
      priceUSD: 67250.45,
      tvL_USD: 15000000,
      totalTVLAssetInUSD: 20000000,
      timestamp: new Date().toISOString()
    },
    {
      index: 386195940,
      params: {
        name: "goETH",
        unitName: "goETH",
        decimals: 8,
        total: 120000000
      },
      priceUSD: 2580.75,
      tvL_USD: 8000000,
      totalTVLAssetInUSD: 12000000,
      timestamp: new Date().toISOString()
    },
    {
      index: 27165954,
      params: {
        name: "PLANET",
        unitName: "PLANET",
        decimals: 6,
        total: 10000000000
      },
      priceUSD: 0.00123,
      tvL_USD: 1200000,
      totalTVLAssetInUSD: 1500000,
      timestamp: new Date().toISOString()
    }
  ];

  // Filter demo assets to only show those that are favorited
  state.favoriteAssets = allDemoAssets.filter(asset => favoriteIds.includes(asset.index));
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
    state.favoriteAssets = state.favoriteAssets.filter(a => a.index !== assetIndex);
    resubscribeToVisibleAssets();
  }
}

function onFavoriteChanged(assetIndex: number, isFavorite: boolean) {
  if (!isFavorite) {
    // Remove the asset from the list
    state.favoriteAssets = state.favoriteAssets.filter(a => a.index !== assetIndex);
    resubscribeToVisibleAssets();
  }
}

function clearAllFavorites() {
  if (confirm('Are you sure you want to remove all favorite assets?')) {
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
        total: 10000000000
      },
      priceUSD: 1.0,
      tvL_USD: 50000000,
      totalTVLAssetInUSD: 75000000,
      timestamp: new Date().toISOString()
    },
    {
      index: 312769,
      params: {
        name: "Tether USDt",
        unitName: "USDt", 
        decimals: 6,
        total: 5000000000
      },
      priceUSD: 0.9999,
      tvL_USD: 25000000,
      totalTVLAssetInUSD: 30000000,
      timestamp: new Date().toISOString()
    },
    {
      index: 386192725,
      params: {
        name: "goBTC",
        unitName: "goBTC",
        decimals: 8,
        total: 21000000
      },
      priceUSD: 67250.45,
      tvL_USD: 15000000,
      totalTVLAssetInUSD: 20000000,
      timestamp: new Date().toISOString()
    },
    {
      index: 386195940,
      params: {
        name: "goETH",
        unitName: "goETH",
        decimals: 8,
        total: 120000000
      },
      priceUSD: 2580.75,
      tvL_USD: 8000000,
      totalTVLAssetInUSD: 12000000,
      timestamp: new Date().toISOString()
    }
  ];

  // Add these assets to favorites
  demoAssets.forEach(asset => {
    favoriteService.addFavorite(asset.index);
  });

  // Set the demo assets in state
  state.favoriteAssets = demoAssets;
  resubscribeToVisibleAssets();
}

function formatPrice(a: BiatecAsset) {
  if (a.priceUSD === undefined || a.priceUSD === null) return "-";
  return a.priceUSD.toLocaleString(undefined, {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}

function formatRealTVL(a: BiatecAsset) {
  if (a.tvL_USD === undefined || a.tvL_USD === null) return "-";
  return a.tvL_USD.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTotalTVL(a: BiatecAsset) {
  if (a.totalTVLAssetInUSD === undefined || a.totalTVLAssetInUSD === null)
    return "-";
  return a.totalTVLAssetInUSD.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function assetImageUrl(id: number) {
  return `https://algorand-trades.de-4.biatec.io/api/asset/image/${id}`;
}

const copyToClipboard = async (assetId: number) => {
  try {
    await navigator.clipboard.writeText(assetId.toString());
  } catch (err) {
    console.error("Failed to copy asset id:", err);
  }
};

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
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
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