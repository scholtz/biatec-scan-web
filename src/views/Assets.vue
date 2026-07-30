<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">{{ $t("assets.title") }}</h1>
      <div class="flex items-center gap-2 text-sm">
        <button
          class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
          @click="refresh"
        >
          {{ $t("common.refresh") }}
        </button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-4 text-xs text-gray-400">
      <label class="flex items-center gap-2 shrink-0">
        <input
          type="checkbox"
          v-model="showStable"
          class="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
          @change="handleFilterChange('stable')"
        />
        <span>{{ $t("assets.stableAssets") }}</span>
      </label>
      <label class="flex items-center gap-2 shrink-0">
        <input
          type="checkbox"
          v-model="showUtility"
          class="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
          @change="handleFilterChange('utility')"
        />
        <span>{{ $t("assets.utilityTokens") }}</span>
      </label>
      <HelpTooltip :text="t('assets.filtersHelp')" />

      <div class="shrink-0">
        {{ $t("common.page") }}: <span class="text-white">{{ page }}</span>
      </div>
      <div class="shrink-0">
        {{ $t("common.pageSize") }}:
        <select
          v-model.number="pageSize"
          class="bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-white text-xs"
          @change="changePageSize"
        >
          <option v-for="s in state.availablePageSizes" :key="s" :value="s">
            {{ s }}{{ s === state.calculatedPageSize ? $t("assets.auto") : "" }}
          </option>
        </select>
      </div>
      <div class="shrink-0">
        {{ $t("common.totalLoaded") }}:
        <span class="text-white">{{ displayAssets.length }}</span>
      </div>
      <ColumnSettingsPanel :columns="tableColumns" class="ml-auto" />
    </div>

    <div v-if="loading" class="text-gray-400">
      {{ $t("assets.loadingAssets") }}
    </div>
    <div v-else-if="error && assets.length === 0" class="text-red-400">
      {{ error }}
    </div>
    <div v-if="!loading && assets.length > 0">
      <div v-if="error" class="text-red-400 mb-4">{{ error }}</div>
      <DataTable
        :table-columns="tableColumns"
        :rows="displayAssets"
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
                {{ a.params?.name || a.params?.unitName || "Asset " + a.index }}
              </RouterLink>
              <div class="text-[10px] text-gray-400 truncate font-mono md:hidden">
                #{{ a.index }} • {{ a.params?.unitName || "-" }}
              </div>
            </div>
            <CopyToClipboard
              @click.stop
              :text="a.index.toString()"
              :toast-message="
                t('common.copiedAssetId', {
                  name: a.params?.name || a.params?.unitName || 'Asset',
                  id: a.index,
                })
              "
              :title="
                t('common.copyAssetId', {
                  name: a.params?.name || a.params?.unitName || 'Asset',
                  id: a.index,
                })
              "
            />
          </div>
        </template>

        <template #cell-rank="{ index }">
          <span class="font-mono">#{{ (page - 1) * pageSize + index + 1 }}</span>
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
            class="favorite-star-btn transition-all duration-300 hover:scale-110 active:scale-95"
            :class="
              isFavorite(a.index) ? 'text-yellow-400 animate-pulse' : 'text-gray-400 hover:text-yellow-300'
            "
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
        </template>

        <template #cell-pools="{ row: a }">
          <RouterLink
            :to="`/aggregated-pools/${a.index}`"
            class="text-xs text-blue-400 hover:text-blue-300"
            @click.stop
          >
            {{ $t("common.viewPools") }}
          </RouterLink>
        </template>
      </DataTable>

      <div class="flex justify-between items-center mt-4 text-xs">
        <button
          :disabled="page === 1 || loading"
          class="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 text-gray-200 hover:bg-gray-600"
          @click="prevPage"
        >
          {{ $t("common.prev") }}
        </button>
        <div class="text-gray-400">{{ $t("common.page") }} {{ page }}</div>
        <button
          :disabled="loading || assets.length < pageSize"
          class="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 text-gray-200 hover:bg-gray-600"
          @click="nextPage"
        >
          {{ $t("common.next") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted, onUnmounted, computed, defineComponent, h, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { getAVMTradeReporterAPI } from "../api";
import { BiatecAsset } from "../api/models";
import { signalrService } from "../services/signalrService";
import FormattedTime from "../components/FormattedTime.vue";
import CopyToClipboard from "../components/CopyToClipboard.vue";
import FormattedNumber from "../components/FormattedNumber.vue";
import { favoriteService } from "../services/favoriteService";
import DataTable from "../components/table/DataTable.vue";
import ColumnSettingsPanel from "../components/table/ColumnSettingsPanel.vue";
import HelpTooltip from "../components/HelpTooltip.vue";
import { useTableColumns, sortRows, type ColumnDef } from "../composables/useTableColumns";

const { t } = useI18n();
const router = useRouter();

// Clicking an asset row opens its list of pools (aggregated pools by asset).
function goToPools(assetIndex: number) {
  router.push(`/aggregated-pools/${assetIndex}`);
}

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

const showStable = ref(false);
const showUtility = ref(true);

// Minimum number of rows to prefetch per page so the frontend has enough data
// to sort meaningfully by any column, independent of the visible page size.
const MIN_PREFETCH_SIZE = 200;

const api = getAVMTradeReporterAPI();

const assetColumns: ColumnDef[] = [
  { key: "name", labelKey: "assets.name", pinned: true },
  { key: "rank", labelKey: "assets.rank", align: "right" },
  { key: "price", labelKey: "assets.price", align: "right", sortable: true },
  { key: "change1H", labelKey: "assets.change1H", align: "right", sortable: true, defaultVisible: false },
  { key: "change24H", labelKey: "assets.change24H", align: "right", sortable: true },
  { key: "change7D", labelKey: "assets.change7D", align: "right", sortable: true, defaultVisible: false },
  { key: "realTvl", labelKey: "assets.realTvl", align: "right", sortable: true },
  { key: "totalTvl", labelKey: "assets.totalTvl", align: "right", sortable: true },
  { key: "volume1H", labelKey: "assets.volume1H", align: "right", sortable: true, defaultVisible: false },
  { key: "volume24H", labelKey: "assets.volume24H", align: "right", sortable: true },
  { key: "volume7D", labelKey: "assets.volume7D", align: "right", sortable: true, defaultVisible: false },
  { key: "updated", labelKey: "assets.updated", align: "right", sortable: true },
  { key: "favorite", labelKey: "common.favorite", align: "center" },
  { key: "pools", labelKey: "common.pools", align: "right" },
];

const tableColumns = useTableColumns("assets", assetColumns);

function changePercent(current: number | undefined | null, previous: number | undefined | null): number | undefined {
  if (current == null || previous == null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

const sortFns: Partial<Record<string, (a: BiatecAsset) => number | string>> = {
  price: (a) => a.priceUSD ?? Number.NEGATIVE_INFINITY,
  change1H: (a) => changePercent(a.priceUSD, a.priceUSD1H) ?? Number.NEGATIVE_INFINITY,
  change24H: (a) => changePercent(a.priceUSD, a.priceUSD24H) ?? Number.NEGATIVE_INFINITY,
  change7D: (a) => changePercent(a.priceUSD, a.priceUSD7D) ?? Number.NEGATIVE_INFINITY,
  realTvl: (a) => a.tvL_USD ?? Number.NEGATIVE_INFINITY,
  totalTvl: (a) => a.totalTVLAssetInUSD ?? Number.NEGATIVE_INFINITY,
  volume1H: (a) => a.volume1H ?? Number.NEGATIVE_INFINITY,
  volume24H: (a) => a.volume24H ?? Number.NEGATIVE_INFINITY,
  volume7D: (a) => a.volume7D ?? Number.NEGATIVE_INFINITY,
  updated: (a) => a.timestamp ?? "",
};

// Small inline helper component for the repeated "colored % change" cell markup.
const ChangeCell = defineComponent({
  props: { current: { type: Number, default: undefined }, previous: { type: Number, default: undefined } },
  setup(props) {
    return () => {
      const pct = changePercent(props.current, props.previous);
      if (pct === undefined) return h("span", {}, "-");
      const cls = pct > 0 ? "text-green-400" : pct < 0 ? "text-red-400" : "text-gray-400";
      const text = (pct > 0 ? "+" : "") + pct.toFixed(2) + "%";
      return h("span", { class: cls }, text);
    };
  },
});

// Calculate optimal page size based on available viewport space
function calculateOptimalPageSize(): number {
  try {
    const viewportHeight = window.innerHeight;

    // Use DOM-based calculation to get precise measurements
    const navbar = document.querySelector("nav");
    const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 65;

    // Find pagination controls to calculate unused space at bottom
    const buttons = Array.from(document.querySelectorAll("button"));
    const prevButton = buttons.find((b) => b.textContent?.includes("Prev"));
    const paginationContainer = prevButton?.parentElement;
    let unusedSpaceAtBottom = 200; // Fallback

    if (paginationContainer) {
      const paginationRect = paginationContainer.getBoundingClientRect();
      unusedSpaceAtBottom = viewportHeight - paginationRect.bottom;
    }

    // Get actual row height by measuring existing rows
    let rowHeight = 47; // Fallback based on measurements
    const rows = document.querySelectorAll(".space-y-1 > div");
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

    return finalPageSize;
  } catch (error) {
    console.error("Error calculating optimal page size:", error);
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
    // Fetch a buffer larger than the visible page size so sorting on the frontend
    // has enough rows to work with, per the "prefetch 200+ items" requirement.
    const offset = (state.page - 1) * state.pageSize;
    const fetchSize = Math.max(state.pageSize, MIN_PREFETCH_SIZE);
    const search = showStable.value
      ? showUtility.value
        ? "" // both
        : "stable" // stable only
      : showUtility.value
        ? "utility" // utility only
        : ""; // both, (this should not occur due to checkbox logic)
    const res = await api.getApiAsset({
      search: search,
      offset,
      size: fetchSize,
    });
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
        total: 10000000000,
      },
      priceUSD: 1.0,
      priceUSD1H: 1.0,
      priceUSD24H: 1.0,
      priceUSD7D: 1.0,
      tvL_USD: 50000000,
      totalTVLAssetInUSD: 75000000,
      timestamp: new Date().toISOString(),
      stabilityIndex: 1, // Stable asset
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
      priceUSD1H: 0.9999,
      priceUSD24H: 0.9999,
      priceUSD7D: 0.9999,
      tvL_USD: 25000000,
      totalTVLAssetInUSD: 30000000,
      timestamp: new Date().toISOString(),
      stabilityIndex: 1, // Stable asset
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
      priceUSD1H: 67000.0,
      priceUSD24H: 66500.0,
      priceUSD7D: 65000.0,
      tvL_USD: 15000000,
      totalTVLAssetInUSD: 20000000,
      timestamp: new Date().toISOString(),
      stabilityIndex: 1, // Utility token
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
      priceUSD1H: 2550.0,
      priceUSD24H: 2520.0,
      priceUSD7D: 2400.0,
      tvL_USD: 8000000,
      totalTVLAssetInUSD: 12000000,
      timestamp: new Date().toISOString(),
      stabilityIndex: 1, // Utility token
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
      priceUSD1H: 0.0012,
      priceUSD24H: 0.00125,
      priceUSD7D: 0.0013,
      tvL_USD: 1200000,
      totalTVLAssetInUSD: 1500000,
      timestamp: new Date().toISOString(),
      stabilityIndex: 0, // Utility token
    },
  ];

  state.assets = demoAssets;
  state.error = t("assets.demoModeError");
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

function handleFilterChange(type: "stable" | "utility") {
  if (type === "stable" && !showStable.value && !showUtility.value) {
    showUtility.value = true;
  } else if (type === "utility" && !showUtility.value && !showStable.value) {
    showStable.value = true;
  }
  // Reset to page 1 when filters change
  state.page = 1;
  fetchAssets();
}

const filteredAssets = computed(() => {
  return state.assets.filter((asset) => {
    const isStable = (asset.stabilityIndex ?? 0) > 0;
    const isUtility = (asset.stabilityIndex ?? 0) === 0;
    return (showStable.value && isStable) || (showUtility.value && isUtility);
  });
});

// Sort the prefetched buffer on the frontend, then show only the current page's worth of rows.
const sortedAssets = computed(() => sortRows(filteredAssets.value, tableColumns.sortState.value, sortFns));
const displayAssets = computed(() => sortedAssets.value.slice(0, state.pageSize));

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

function assetImageUrl(id: number) {
  return `https://algorand-trades.de-4.biatec.io/api/asset/image/${id}`;
}

watch(() => state.page, fetchAssets);
watch(() => state.pageSize, fetchAssets);

onMounted(async () => {
  // Calculate optimal page size first
  updatePageSizeOptions();

  // Add resize event listener
  window.addEventListener("resize", handleResize);

  signalrService.onAssetReceived(assetUpdateEvent);
  await fetchAssets();
});

onUnmounted(() => {
  // Remove resize event listener
  window.removeEventListener("resize", handleResize);

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
