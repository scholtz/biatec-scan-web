<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Assets</h1>
      <div class="flex items-center gap-2 text-sm">
        <button
          class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
          @click="refresh"
        >
          Refresh
        </button>
      </div>
    </div>

    <div class="flex items-center gap-4 text-xs text-gray-400">
      <div>
        Page: <span class="text-white">{{ page }}</span>
      </div>
      <div>
        Page Size:
        <select
          v-model.number="pageSize"
          class="bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-white text-xs"
          @change="changePageSize"
        >
          <option v-for="s in [15, 25, 50, 100]" :key="s" :value="s">
            {{ s }}
          </option>
        </select>
      </div>
      <div>
        Total Loaded: <span class="text-white">{{ assets.length }}</span>
      </div>
    </div>

    <div v-if="loading" class="text-gray-400">Loading assets…</div>
    <div v-else-if="error && assets.length === 0" class="text-red-400">{{ error }}</div>

    <div v-if="!loading && assets.length > 0">
      <div v-if="error" class="text-red-400 mb-4">{{ error }}</div>
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
          v-for="a in assets"
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
              class="text-yellow-400 hover:text-yellow-300 transition-colors ml-2"
              :title="isFavorite(a.index) ? 'Remove from favorites' : 'Add to favorites'"
            >
              <svg
                class="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  v-if="isFavorite(a.index)"
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

          <!-- Desktop row layout -->
          <div class="hidden md:grid md:grid-cols-10 gap-3 items-center">
            <div class="font-mono text-xs text-blue-400 truncate">
              <RouterLink
                :to="`/asset/${a.index}`"
                class="hover:text-blue-300"
                >{{ a.index }}</RouterLink
              >
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
                class="text-yellow-400 hover:text-yellow-300 transition-colors"
                :title="isFavorite(a.index) ? 'Remove from favorites' : 'Add to favorites'"
              >
                <svg
                  class="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    v-if="isFavorite(a.index)"
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

      <div class="flex justify-between items-center mt-4 text-xs">
        <button
          :disabled="page === 1 || loading"
          class="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 text-gray-200 hover:bg-gray-600"
          @click="prevPage"
        >
          Prev
        </button>
        <div class="text-gray-400">Page {{ page }}</div>
        <button
          :disabled="loading || assets.length < pageSize"
          class="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 text-gray-200 hover:bg-gray-600"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted, onUnmounted, computed } from "vue";
import { getAVMTradeReporterAPI } from "../api";
import { BiatecAsset } from "../api/models";
import { signalrService } from "../services/signalrService";
import FormattedTime from "../components/FormattedTime.vue";
import { favoriteService } from "../services/favoriteService";

interface State {
  page: number;
  pageSize: number;
  loading: boolean;
  error: string;
  assets: BiatecAsset[];
  subscribedIds: Set<number>;
}

const state = reactive<State>({
  page: 1,
  pageSize: 15,
  loading: false,
  error: "",
  assets: [],
  subscribedIds: new Set<number>(),
});

const api = getAVMTradeReporterAPI();

async function fetchAssets() {
  state.loading = true;
  state.error = "";
  try {
    // Assuming backend supports offset & size like aggregated pools
    const offset = (state.page - 1) * state.pageSize;
    const res = await api.getApiAsset({ offset, size: state.pageSize });
    const data = res as unknown as BiatecAsset[] | { data: BiatecAsset[] };
    const list = Array.isArray(data) ? data : (data as any).data;
    state.assets = list || [];
    resubscribeToVisibleAssets();
  } catch (e: any) {
    state.error = e?.message || "Failed to load assets";
    // Load demo assets when API fails for testing purposes
    loadDemoAssets();
  } finally {
    state.loading = false;
  }
}

function loadDemoAssets() {
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
  
  state.assets = demoAssets;
  state.error = "Demo mode: API unavailable, showing sample assets";
}

function resubscribeToVisibleAssets() {
  // If you had per-asset subscriptions you'd manage them here.
  // Current SignalR sends all Asset updates, so we'll just filter client-side.
  state.subscribedIds = new Set(state.assets.map((a) => a.index));
  signalrService.subscribe({
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: state.assets.map((a) => BigInt(a.index).toString()),
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
  if (!state.subscribedIds.has(asset.index)) return; // ignore assets not on current page
  console.log("Received asset update on asset overview:", asset);
  const idx = state.assets.findIndex((a) => a.index === asset.index);
  if (idx !== -1) {
    state.assets[idx] = asset;
  }
}

function refresh() {
  fetchAssets();
}
function nextPage() {
  state.page++;
  fetchAssets();
}
function prevPage() {
  if (state.page > 1) {
    state.page--;
    fetchAssets();
  }
}
function changePageSize() {
  state.page = 1;
  fetchAssets();
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

function isFavorite(assetIndex: number): boolean {
  return favoriteService.isFavorite(assetIndex);
}

function toggleFavorite(assetIndex: number): void {
  favoriteService.toggleFavorite(assetIndex);
}

watch(() => state.page, fetchAssets);
watch(() => state.pageSize, fetchAssets);

onMounted(async () => {
  signalrService.onAssetReceived(assetUpdateEvent);
  await fetchAssets();
});

onUnmounted(() => {
  signalrService.unsubscribeFromAssetUpdates(assetUpdateEvent);
});

const page = computed(() => state.page);
const pageSize = computed({
  get: () => state.pageSize,
  set: (v) => (state.pageSize = v),
});
const assets = computed(() => state.assets);
const loading = computed(() => state.loading);
const error = computed(() => state.error);
</script>
