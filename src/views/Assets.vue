<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">{{ $t('assets.title') }}</h1>
      <div class="flex items-center gap-2 text-sm">
        <button
          class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
          @click="refresh"
        >
          {{ $t('common.refresh') }}
        </button>
      </div>
    </div>

    <div class="flex items-center gap-4 text-xs text-gray-400">
      <div>
        {{ $t('common.page') }}: <span class="text-white">{{ page }}</span>
      </div>
      <div>
        {{ $t('common.pageSize') }}:
        <select
          v-model.number="pageSize"
          class="bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-white text-xs"
          @change="changePageSize"
        >
          <option v-for="s in state.availablePageSizes" :key="s" :value="s">
            {{ s }}{{ s === state.calculatedPageSize ? $t('assets.auto') : '' }}
          </option>
        </select>
      </div>
      <div>
        {{ $t('common.totalLoaded') }}: <span class="text-white">{{ assets.length }}</span>
      </div>
    </div>

    <div v-if="loading" class="text-gray-400">{{ $t('assets.loadingAssets') }}</div>
    <div v-else-if="error && assets.length === 0" class="text-red-400">{{ error }}</div>

    <div v-if="!loading && assets.length > 0">
      <div v-if="error" class="text-red-400 mb-4">{{ error }}</div>
      <div
        class="hidden md:grid md:grid-cols-10 gap-3 px-2 text-xs text-gray-400 mb-2"
      >
        <div>{{ $t('assets.id') }}</div>
        <div>{{ $t('assets.name') }}</div>
        <div>{{ $t('assets.unit') }}</div>
        <div class="text-right">{{ $t('assets.decimals') }}</div>
        <div class="text-right">{{ $t('assets.price') }}</div>
        <div class="text-right">{{ $t('assets.realTvl') }}</div>
        <div class="text-right">{{ $t('assets.totalTvl') }}</div>
        <div class="text-right">{{ $t('assets.updated') }}</div>
        <div class="text-center">{{ $t('common.favorite') }}</div>
        <div class="text-right">{{ $t('common.pools') }}</div>
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
              <div class="text-[10px] text-gray-400">{{ $t('assets.price') }}</div>
              <div class="text-xs text-white font-mono">
                {{ formatPrice(a) }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-gray-400">{{ $t('assets.realTvl') }}</div>
              <div class="text-xs text-white font-mono">
                {{ formatRealTVL(a) }}
              </div>
            </div>
            <RouterLink
              :to="`/aggregated-pools/${a.index}`"
              class="text-[10px] text-blue-400 hover:text-blue-300 underline ml-2"
              >{{ $t('common.pools') }}</RouterLink
            >
            <button
              @click="toggleFavorite(a.index)"
              class="favorite-star-btn transition-all duration-300 hover:scale-110 active:scale-95 ml-2"
              :class="isFavorite(a.index) ? 'text-yellow-400 animate-pulse' : 'text-gray-400 hover:text-yellow-300'"
              :title="isFavorite(a.index) ? $t('common.removeFromFavorites') : $t('common.addToFavorites')"
            >
              <svg
                class="w-4 h-4 transition-all duration-300"
                :class="{ 'drop-shadow-lg': isFavorite(a.index) }"
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
            <CopyToClipboard
              :text="a.index.toString()"
              :toast-message="t('common.copiedAssetId', { name: a.params?.name || a.params?.unitName || 'Asset', id: a.index })"
              :title="t('common.copyAssetId', { name: a.params?.name || a.params?.unitName || 'Asset', id: a.index })"
              class="ml-2"
            />
          </div>

          <!-- Desktop row layout -->
          <div class="hidden md:grid md:grid-cols-10 gap-3 items-center">
            <div class="font-mono text-xs text-blue-400 truncate flex items-center gap-1">
              <RouterLink
                :to="`/asset/${a.index}`"
                class="hover:text-blue-300"
                >{{ a.index }}</RouterLink
              >
              <CopyToClipboard
                :text="a.index.toString()"
                :toast-message="t('common.copiedAssetId', { name: a.params?.name || a.params?.unitName || 'Asset', id: a.index })"
                :title="t('common.copyAssetId', { name: a.params?.name || a.params?.unitName || 'Asset', id: a.index })"
              />
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
                class="favorite-star-btn transition-all duration-300 hover:scale-110 active:scale-95"
                :class="isFavorite(a.index) ? 'text-yellow-400 animate-pulse' : 'text-gray-400 hover:text-yellow-300'"
                :title="isFavorite(a.index) ? $t('common.removeFromFavorites') : $t('common.addToFavorites')"
              >
                <svg
                  class="w-5 h-5 transition-all duration-300"
                  :class="{ 'drop-shadow-lg': isFavorite(a.index) }"
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
                {{ $t('common.viewPools') }}
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
          {{ $t('common.prev') }}
        </button>
        <div class="text-gray-400">{{ $t('common.page') }} {{ page }}</div>
        <button
          :disabled="loading || assets.length < pageSize"
          class="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 text-gray-200 hover:bg-gray-600"
          @click="nextPage"
        >
          {{ $t('common.next') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted, onUnmounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { getAVMTradeReporterAPI } from "../api";
import { BiatecAsset } from "../api/models";
import { signalrService } from "../services/signalrService";
import FormattedTime from "../components/FormattedTime.vue";
import CopyToClipboard from "../components/CopyToClipboard.vue";
import { favoriteService } from "../services/favoriteService";

const { t } = useI18n();

interface State {
  page: number;
  pageSize: number;
  loading: boolean;
  error: string;
  assets: BiatecAsset[];
  subscribedIds: Set<number>;
  calculatedPageSize: number;
  availablePageSizes: number[];
}

const state = reactive<State>({
  page: 1,
  pageSize: 0, // Will be set to calculated value
  loading: false,
  error: "",
  assets: [],
  subscribedIds: new Set<number>(),
  calculatedPageSize: 15, // Default fallback
  availablePageSizes: [15, 25, 50, 100],
});

const api = getAVMTradeReporterAPI();

// Calculate optimal page size based on available viewport space
function calculateOptimalPageSize(): number {
  try {
    const viewportHeight = window.innerHeight;
    
    // Use DOM-based calculation to get precise measurements
    const navbar = document.querySelector('nav');
    const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 65;
    
    // Find pagination controls to calculate unused space at bottom
    const buttons = Array.from(document.querySelectorAll('button'));
    const prevButton = buttons.find(b => b.textContent?.includes('Prev'));
    const paginationContainer = prevButton?.parentElement;
    let unusedSpaceAtBottom = 200; // Fallback
    
    if (paginationContainer) {
      const paginationRect = paginationContainer.getBoundingClientRect();
      unusedSpaceAtBottom = viewportHeight - paginationRect.bottom;
    }
    
    // Get actual row height by measuring existing rows
    let rowHeight = 47; // Fallback based on measurements
    const rows = document.querySelectorAll('.space-y-1 > div');
    if (rows.length >= 2) {
      rowHeight = rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top;
    }
    
    // More aggressive calculation - minimal buffer for maximum space utilization
    const buffer = Math.max(15, Math.min(25, unusedSpaceAtBottom * 0.1)); // Dynamic buffer: 10% of unused space, capped at 15-25px
    const usableUnusedSpace = Math.max(0, unusedSpaceAtBottom - buffer);
    const additionalRows = Math.floor(usableUnusedSpace / rowHeight);
    
    // Current rows count calculation
    let baseRows;
    if (unusedSpaceAtBottom > 40) {
      // Calculate from full viewport for maximum utilization
      const usedSpaceFromTop = viewportHeight - unusedSpaceAtBottom;
      const availableSpaceForRows = usedSpaceFromTop - navbarHeight - 100; // Minimal overhead
      baseRows = Math.floor(availableSpaceForRows / rowHeight);
    } else {
      // Space is very tight, use current count
      baseRows = rows.length;
    }
    
    const optimalPageSize = baseRows + additionalRows;
    
    // Ensure reasonable bounds
    const finalPageSize = Math.max(5, Math.min(150, optimalPageSize));
    
    console.log(`Calculated optimal page size: ${finalPageSize} (viewport: ${viewportHeight}px, unused bottom: ${unusedSpaceAtBottom}px, usable unused: ${usableUnusedSpace}px, row height: ${rowHeight}px, buffer: ${buffer}px, additional rows: ${additionalRows})`);
    
    return finalPageSize;
  } catch (error) {
    console.error('Error calculating optimal page size:', error);
    return 15; // Fallback to default
  }
}

// Update available page sizes to include the calculated value
function updatePageSizeOptions() {
  const calculated = calculateOptimalPageSize();
  state.calculatedPageSize = calculated;
  
  // Create a new array with the calculated value included
  const baseOptions = [15, 25, 50, 100];
  const allOptions = [...baseOptions];
  
  // Add the calculated value if it's not already in the list
  if (!baseOptions.includes(calculated)) {
    allOptions.push(calculated);
    allOptions.sort((a, b) => a - b);
  }
  
  state.availablePageSizes = allOptions;
  
  // Set the calculated value as default if pageSize hasn't been set yet
  if (state.pageSize === 0) {
    state.pageSize = calculated;
  }
}

// Handle window resize to recalculate optimal page size
function handleResize() {
  updatePageSizeOptions();
}

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
  state.error = t('assets.demoModeError');
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
  return favoriteService.isReactiveFavorite(assetIndex);
}

function toggleFavorite(assetIndex: number): void {
  const success = favoriteService.toggleFavorite(assetIndex);
  
  // Add visual feedback with a small delay to ensure localStorage is updated
  if (success !== undefined) {
    // Force reactivity update
    const favoritesRef = favoriteService.getReactiveFavorites();
    favoritesRef.value = new Set(favoritesRef.value);
  }
}

watch(() => state.page, fetchAssets);
watch(() => state.pageSize, fetchAssets);

onMounted(async () => {
  // Calculate optimal page size first
  updatePageSizeOptions();
  
  // Add resize event listener
  window.addEventListener('resize', handleResize);
  
  signalrService.onAssetReceived(assetUpdateEvent);
  await fetchAssets();
});

onUnmounted(() => {
  // Remove resize event listener
  window.removeEventListener('resize', handleResize);
  
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
