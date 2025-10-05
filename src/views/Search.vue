<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
    <!-- Search Panel -->
    <div class="card mb-6 md:mb-8">
      <div class="flex flex-col md:flex-row md:items-end gap-4">
        <div class="flex-1 w-full">
          <h1
            class="text-2xl font-bold text-white mb-2 flex items-center gap-2"
          >
            <svg
              class="w-6 h-6 text-primary-400"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            {{ $t("search.title") }}
            <span
              v-if="searchResult && hasResults"
              class="ml-2 text-sm text-gray-400 font-normal"
              >({{ $t("search.foundResults", { count: totalResults }) }})</span
            >
          </h1>
          <p class="text-gray-400 text-sm mb-3 md:mb-4">
            {{ $t("search.description") }}
          </p>
          <div class="relative group">
            <input
              v-model="searchQuery"
              @keyup.enter="performSearch"
              type="text"
              :placeholder="inputPlaceholder"
              class="w-full pl-11 pr-14 py-3 rounded-lg bg-dark-800/60 border border-dark-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm text-white placeholder-gray-500 transition"
            />
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <svg
                class="w-5 h-5 text-gray-500 group-focus-within:text-primary-400"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 1 0-14 0 7 7 0 0 0 14 0Z" />
              </svg>
            </div>
            <button
              @click="performSearch"
              :disabled="!searchQuery.trim() || isSearching"
              class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              <span v-if="isSearching" class="flex items-center gap-1">
                <svg
                  class="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {{ t("common.searching") }}
              </span>
              <span v-else class="flex items-center gap-1">
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 1 0-14 0 7 7 0 0 0 14 0Z" />
                </svg>
                {{ t("nav.search") }}
              </span>
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-3 text-[10px] md:text-xs">
            <button
              v-for="example in sampleQueries"
              :key="example.value"
              @click="prefillExample(example.value)"
              class="px-2 py-1 rounded bg-dark-700/60 hover:bg-dark-600 text-gray-300 transition-colors"
            >
              >
              {{ example.label }}
            </button>
            <span
              v-if="isAssetQuery"
              class="px-2 py-1 rounded bg-blue-500/20 text-blue-300"
              >Asset ID Detected</span
            >
            <span
              v-else-if="isBlockQuery"
              class="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300"
              >Block Detected</span
            >
            <span
              v-else-if="isTxQuery"
              class="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300"
              >Transaction Detected</span
            >
            <span
              v-else-if="isAddressQuery"
              class="px-2 py-1 rounded bg-purple-500/20 text-purple-300"
              >Address Detected</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Skeleton while searching (and no result yet) -->
    <div v-if="isSearching && !searchResult" class="space-y-4 mb-8">
      <div class="animate-pulse h-24 rounded-lg bg-dark-800/40"></div>
      <div class="animate-pulse h-24 rounded-lg bg-dark-800/30"></div>
      <div class="animate-pulse h-24 rounded-lg bg-dark-800/20"></div>
    </div>

    <!-- Search Results -->
    <div v-if="searchResult && hasResults" class="space-y-8 animate-fade-in">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold text-white">
          Search Results ({{ totalResults }})
        </h2>
        <button
          class="text-xs px-2 py-1 rounded bg-dark-700/60 hover:bg-dark-600 text-gray-300 transition-colors"
          @click="resetSearch"
        >
          New Search
        </button>
      </div>

      <!-- Assets Section -->
      <div
        v-if="searchResult.assets?.length"
        class="space-y-4 animate-slide-up"
      >
        <h3 class="text-lg font-medium text-white flex items-center gap-2">
          <svg
            class="w-5 h-5 text-blue-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
          </svg>
          Assets ({{ searchResult.assets.length }})
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="asset in searchResult.assets"
            :key="asset.index"
            @click="navigateToAsset(asset.index)"
            class="card hover:bg-dark-800/80 transition-all duration-200 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="text-white font-medium">
                  {{ formatAssetName(asset) }}
                </div>
                <div class="text-sm text-gray-400">ID: {{ asset.index }}</div>
                <div v-if="asset.params.unitName" class="text-sm text-gray-500">
                  {{ asset.params.unitName }}
                </div>
              </div>
              <div class="text-right">
                <div v-if="asset.priceUSD" class="text-sm text-green-400">
                  {{ formatUSD(asset.priceUSD) }}
                </div>
                <div v-if="asset.tvL_USD" class="text-xs text-gray-400">
                  TVL: {{ formatUSD(asset.tvL_USD) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pools Section -->
      <div v-if="searchResult.pools?.length" class="space-y-4 animate-slide-up">
        <h3 class="text-lg font-medium text-white flex items-center gap-2">
          <svg
            class="w-5 h-5 text-green-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
            />
          </svg>
          Pools ({{ searchResult.pools.length }})
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="pool in searchResult.pools"
            :key="pool.poolAddress || pool.poolAppId"
            @click="navigateToPool(pool.poolAddress || '')"
            class="card hover:bg-dark-800/80 transition-all duration-200 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="text-white font-medium">
                  {{ formatPoolName(pool) }}
                </div>
                <div class="text-sm text-gray-400">
                  {{ formatAddress(pool.poolAddress || "") }}
                </div>
                <div class="text-sm text-gray-500">
                  App ID: {{ pool.poolAppId }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-400">{{ pool.protocol }}</div>
                <div
                  v-if="pool.totalTVLAssetAInUSD || pool.totalTVLAssetBInUSD"
                  class="text-sm text-green-400"
                >
                  TVL:
                  {{
                    formatUSD(
                      (pool.totalTVLAssetAInUSD || 0) +
                        (pool.totalTVLAssetBInUSD || 0)
                    )
                  }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Aggregated Pools Section -->
      <div
        v-if="searchResult.aggregatedPools?.length"
        class="space-y-4 animate-slide-up"
      >
        <h3 class="text-lg font-medium text-white flex items-center gap-2">
          <svg
            class="w-5 h-5 text-yellow-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
          Aggregated Pools ({{ searchResult.aggregatedPools.length }})
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="aggPool in searchResult.aggregatedPools"
            :key="aggPool.id || aggPool.assetIdA + '-' + aggPool.assetIdB"
            @click="navigateToAggregatedPool(aggPool.assetIdA || 0)"
            class="card hover:bg-dark-800/80 transition-all duration-200 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="text-white font-medium">
                  {{ aggPool.assetIdA }}/{{ aggPool.assetIdB }}
                </div>
                <div class="text-sm text-gray-400">
                  {{ aggPool.poolCount }} pools
                </div>
                <div class="text-sm text-gray-500">ID: {{ aggPool.id }}</div>
              </div>
              <div class="text-right">
                <div
                  v-if="
                    aggPool.totalTVLAssetAInUSD || aggPool.totalTVLAssetBInUSD
                  "
                  class="text-sm text-green-400"
                >
                  TVL:
                  {{
                    formatUSD(
                      (aggPool.totalTVLAssetAInUSD || 0) +
                        (aggPool.totalTVLAssetBInUSD || 0)
                    )
                  }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Addresses Section -->
      <div
        v-if="searchResult.addresses?.length"
        class="space-y-4 animate-slide-up"
      >
        <h3 class="text-lg font-medium text-white flex items-center gap-2">
          <svg
            class="w-5 h-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"
            />
          </svg>
          Addresses ({{ searchResult.addresses.length }})
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="address in searchResult.addresses"
            :key="address"
            @click="navigateToAddress(address)"
            class="card hover:bg-dark-800/80 transition-all duration-200 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div class="flex items-center justify-between">
              <div class="text-white font-mono text-sm">
                {{ formatAddress(address) }}
              </div>
              <button
                @click.stop="copyToClipboard(address)"
                class="px-2 py-1 rounded bg-dark-700/70 hover:bg-dark-600 text-xs text-gray-300 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Blocks Section -->
      <div
        v-if="searchResult.blocks?.length"
        class="space-y-4 animate-slide-up"
      >
        <h3 class="text-lg font-medium text-white flex items-center gap-2">
          <svg
            class="w-5 h-5 text-emerald-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
          Blocks ({{ searchResult.blocks.length }})
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="blockNum in searchResult.blocks"
            :key="blockNum"
            @click="navigateToBlock(blockNum)"
            class="card hover:bg-dark-800/80 transition-all duration-200 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            <div class="text-white font-medium">
              {{ blockNum.toLocaleString() }}
            </div>
            <div class="text-xs text-gray-400">Block</div>
          </div>
        </div>
      </div>

      <!-- Trades Section -->
      <div
        v-if="searchResult.trades?.length"
        class="space-y-4 animate-slide-up"
      >
        <h3 class="text-lg font-medium text-white flex items-center gap-2">
          <svg
            class="w-5 h-5 text-orange-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
          Trades ({{ searchResult.trades.length }})
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            v-for="trade in searchResult.trades"
            :key="
              trade.txId ||
              trade.blockId + '-' + trade.assetIdIn + '-' + trade.assetIdOut
            "
            @click="navigateToTransaction(trade.txId || '')"
            class="card hover:bg-dark-800/80 transition-all duration-200 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="text-white font-medium">
                  {{ trade.assetIdIn }} → {{ trade.assetIdOut }}
                </div>
                <div class="text-sm text-gray-400">
                  {{ formatAddress(trade.trader || "") }}
                </div>
                <div class="text-sm text-gray-500">{{ trade.protocol }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-300">
                  {{ formatTradeAmount(trade.assetAmountIn || 0) }} →
                  {{ formatTradeAmount(trade.assetAmountOut || 0) }}
                </div>
                <div class="text-xs text-gray-400">
                  Block: {{ trade.blockId }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Result After Search -->
    <div
      v-else-if="hasSearched && !isSearching && (!searchResult || !hasResults)"
      class="card text-center py-10 animate-fade-in"
    >
      <svg
        class="w-16 h-16 text-gray-500 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <h2 class="text-lg md:text-xl font-semibold text-white mb-2">
        {{ $t("search.noResults") }}
      </h2>
      <p class="text-gray-400 mb-4 text-sm md:text-base">
        {{ $t("search.noResultsDescription", { query: lastSearchQuery }) }}
      </p>
      <button
        @click="resetSearch"
        class="px-4 py-2 rounded bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors"
      >
        {{ $t("common.tryDifferentSearch") }}
      </button>
    </div>

    <!-- Tips (initial) -->
    <div v-if="!hasSearched && !searchResult" class="card animate-fade-in">
      <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg
          class="w-5 h-5 text-primary-400"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
          />
        </svg>
        {{ $t("search.searchTips") }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-3 text-gray-300 text-sm">
          <div class="flex gap-3">
            <span class="text-blue-400">•</span>
            <div>
              <span class="font-medium text-blue-300">Assets:</span> Enter asset
              ID (e.g., 452399768) to find token information, prices, and TVL
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-green-400">•</span>
            <div>
              <span class="font-medium text-green-300">Pools:</span> Search by
              asset ID to find liquidity pools and trading pairs
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-emerald-400">•</span>
            <div>
              <span class="font-medium text-emerald-300">Blocks:</span> Enter
              block number (e.g., 50,000,000) to view block details
            </div>
          </div>
        </div>
        <div class="space-y-3 text-gray-300 text-sm">
          <div class="flex gap-3">
            <span class="text-indigo-400">•</span>
            <div>
              <span class="font-medium text-indigo-300">Transactions:</span>
              Paste transaction ID to view trade details
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-purple-400">•</span>
            <div>
              <span class="font-medium text-purple-300">Addresses:</span> Enter
              Algorand address to find related activity
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-orange-400">•</span>
            <div>
              <span class="font-medium text-orange-300">Trades:</span> Find swap
              transactions and DEX activity
            </div>
          </div>
        </div>
      </div>
      <div class="mt-6 p-4 bg-dark-800/40 rounded-lg border border-dark-700/30">
        <p class="text-xs text-gray-400 text-center">
          <svg
            class="w-4 h-4 inline mr-1"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            />
          </svg>
          Our search automatically detects the type of your query and shows
          relevant results
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { getAVMTradeReporterAPI } from "../api";
import type { SearchResponse, BiatecAsset, Pool } from "../api/models";
import algosdk from "algosdk";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const api = getAVMTradeReporterAPI();
const searchQuery = ref("");
const searchResult = ref<SearchResponse | null>(null);
const blockTransactions = ref<algosdk.indexerModels.Transaction[]>([]);
const isSearching = ref(false);
const hasSearched = ref(false);
const lastSearchQuery = ref("");
const currentPage = ref(1);

// Computed properties for result counts and detection
const totalResults = computed(() => {
  if (!searchResult.value) return 0;
  return (
    (searchResult.value.assets?.length || 0) +
    (searchResult.value.pools?.length || 0) +
    (searchResult.value.aggregatedPools?.length || 0) +
    (searchResult.value.addresses?.length || 0) +
    (searchResult.value.blocks?.length || 0) +
    (searchResult.value.trades?.length || 0)
  );
});

const hasResults = computed(() => totalResults.value > 0);

// Detection for input type to show hints (order matters - more specific first)
const isBlockQuery = computed(() => {
  const value = searchQuery.value.trim();
  const num = parseInt(value);
  return /^\d{1,12}$/.test(value) && num <= 999999999; // Blocks up to ~1B
});
const isTxQuery = computed(() =>
  /^[A-Z0-9]{40,}$/.test(searchQuery.value.trim())
);
const isAddressQuery = computed(() =>
  /^[A-Z0-9]{58}$/.test(searchQuery.value.trim())
);
const isAssetQuery = computed(() => {
  const value = searchQuery.value.trim();
  const num = parseInt(value);
  return /^\d{6,}$/.test(value) && (num > 999999999 || value.length >= 9); // Asset IDs are typically very large
});

const inputPlaceholder = computed(() => {
  if (isAssetQuery.value) return "Asset ID detected - press Enter to search";
  if (isBlockQuery.value)
    return "Block number detected - press Enter to search";
  if (isTxQuery.value) return "Transaction ID detected - press Enter to search";
  if (isAddressQuery.value) return "Address detected - press Enter to search";
  return "Search assets, pools, blocks, transactions, addresses...";
});
const sampleQueries = computed(() => [
  { label: t("search.exampleAsset"), value: "452399768" },
  { label: t("search.exampleBlock"), value: "50000000" },
  {
    label: t("search.exampleAddress"),
    value: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  },
]);

const performSearch = async () => {
  if (!searchQuery.value.trim()) return;

  isSearching.value = true;
  hasSearched.value = true;
  lastSearchQuery.value = searchQuery.value.trim();
  searchResult.value = null;
  blockTransactions.value = [];
  currentPage.value = 1;

  try {
    const response = await api.getApiSearch({ q: lastSearchQuery.value });
    searchResult.value = response.data;
  } catch (error) {
    console.error("Search error:", error);
    // Set empty result to show "No Results" message
    searchResult.value = {
      assets: null,
      pools: null,
      aggregatedPools: null,
      addresses: null,
      blocks: null,
      trades: null,
    };
  }

  isSearching.value = false;
};

function copyToClipboard(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch (e) {
    // ignore
  }
}

function prefillExample(val: string) {
  searchQuery.value = val;
  performSearch();
}

function resetSearch() {
  searchQuery.value = "";
  searchResult.value = null;
  hasSearched.value = false;
  blockTransactions.value = [];
  currentPage.value = 1;
}

// Format functions for display
function formatAssetName(asset: BiatecAsset): string {
  return asset.params.name || asset.params.unitName || `Asset ${asset.index}`;
}

function formatPoolName(pool: Pool): string {
  return `Pool ${pool.assetIdA}/${pool.assetIdB} (${pool.protocol})`;
}

function formatTradeAmount(amount: number, decimals: number = 6): string {
  return (amount / Math.pow(10, decimals)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

// Navigation functions for clickable results
function navigateToAsset(assetId: number) {
  router.push(`/asset/${assetId}`);
}

function navigateToPool(poolAddress: string) {
  if (poolAddress) {
    router.push(`/pool/${poolAddress}`);
  }
}

function navigateToAggregatedPool(assetIdA: number) {
  router.push(`/aggregated-pools/${assetIdA}`);
}

function navigateToAddress(address: string) {
  router.push(`/address/${address}`);
}

function navigateToBlock(blockNumber: number) {
  router.push(`/block/${blockNumber}`);
}

function navigateToTransaction(txId: string) {
  if (txId) {
    router.push(`/transaction/${txId}`);
  }
}

// Handle URL query parameter
watch(
  () => route.query.q,
  (newQuery) => {
    if (newQuery && typeof newQuery === "string") {
      searchQuery.value = newQuery;
      performSearch();
    }
  }
);

onMounted(() => {
  const queryParam = route.query.q;
  if (queryParam && typeof queryParam === "string") {
    searchQuery.value = queryParam;
    performSearch();
  }
});
</script>
