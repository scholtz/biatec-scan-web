<template>
  <div class="min-h-screen bg-background text-white">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-4">
          {{ $t("addressDetails.title") }}
        </h1>
        <div class="flex items-center gap-4 flex-wrap">
          <span class="text-gray-400">{{
            $t("addressDetails.addressLabel")
          }}</span>
          <span class="font-mono text-blue-400 break-all">{{ address }}</span>
          <CopyToClipboard
            :text="address"
            :toast-message="t('addressDetails.addressCopied')"
            :title="t('addressDetails.copyAddress')"
            class="p-2 text-gray-400 hover:text-white transition-colors"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
        ></div>
        <p class="text-gray-400">{{ $t("addressDetails.loading") }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-400 mb-4">{{ error }}</p>
        <button
          @click="loadAddressInfo"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          {{ $t("addressDetails.retry") }}
        </button>
      </div>

      <!-- Address Information -->
      <div v-else class="space-y-6">
        <!-- Account Balance -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">
            {{ $t("addressDetails.accountInfo") }}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{
                $t("addressDetails.balance")
              }}</span>
              <span class="text-white font-mono">
                <FormattedNumber
                  :value="totalValueUSD"
                  type="currency"
                  currency="USD"
                  :maximum-fraction-digits="2"
                  :small-threshold="0.01"
                  :significant-digits="4"
                />
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{
                $t("addressDetails.minBalance")
              }}</span>
              <span class="text-white font-mono">
                {{ formatAlgoAmount(accountInfo?.["min-balance"] || 0) }} ALGO
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{
                $t("addressDetails.round")
              }}</span>
              <span class="text-white">{{ accountInfo?.round || "N/A" }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{
                $t("addressDetails.status")
              }}</span>
              <span class="text-white">{{
                formatStatus(accountInfo?.status)
              }}</span>
            </div>
          </div>
          <!-- External Links -->
          <div class="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-700">
            <a
              :href="`https://allo.info/account/${address}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              Allo <span class="text-xs">↗</span>
            </a>
            <a
              :href="`https://lora.algokit.io/mainnet/account/${address}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              Lora <span class="text-xs">↗</span>
            </a>
            <a
              :href="`https://vestige.fi/wallet/${address}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              Vestige <span class="text-xs">↗</span>
            </a>
            <a
              :href="`https://explorer.perawallet.app/address/${address}/`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              Pera <span class="text-xs">↗</span>
            </a>
            <a
              :href="`https://algonoderewards.com/${address}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              NodeRewards <span class="text-xs">↗</span>
            </a>
            <a
              :href="`https://www.asastats.com/${address}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              ASA Stats <span class="text-xs">↗</span>
            </a>
          </div>
        </div>

        <!-- Pool Actions -->
        <div v-if="identifiedPool" class="card">
          <div
            class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
          >
            <div>
              <h2 class="text-xl font-semibold mb-2">
                {{ $t("addressDetails.identifiedPool") }}
              </h2>
              <div class="text-sm text-gray-400">
                {{ $t("addressDetails.poolPair") }}:
                <span class="text-white font-mono">
                  {{ formatPoolPair(identifiedPool) }}
                </span>
              </div>
              <div
                v-if="identifiedPool.poolAppId"
                class="text-sm text-gray-400 mt-1"
              >
                {{ $t("addressDetails.poolAppId") }}:
                <span class="text-white font-mono">{{
                  identifiedPool.poolAppId
                }}</span>
              </div>
            </div>
            <router-link
              v-if="
                identifiedPool.assetIdA !== undefined &&
                identifiedPool.assetIdB !== undefined
              "
              :to="{
                name: 'TradesByPair',
                params: {
                  assetId1: identifiedPool.assetIdA?.toString(),
                  assetId2: identifiedPool.assetIdB?.toString(),
                },
              }"
              class="btn-secondary text-sm self-start"
            >
              {{ $t("addressDetails.viewPoolTrades") }}
            </router-link>
          </div>
        </div>

        <!-- 3-Column Grid: Assets | Transactions | Trades -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <!-- Column 1: Assets -->
          <div class="card space-y-4">
            <h2 class="text-xl font-semibold">
              {{ $t("addressDetails.assets") }}
            </h2>

            <!-- Donut pie chart -->
            <div
              v-if="pieChartSlices.length > 0"
              class="flex flex-col items-center gap-3"
            >
              <div class="relative">
                <svg viewBox="0 0 100 100" class="w-44 h-44">
                  <path
                    v-for="slice in pieChartSlices"
                    :key="slice.asset['asset-id']"
                    :d="slicePath(slice.startAngle, slice.endAngle)"
                    :fill="slice.color"
                    class="cursor-pointer hover:opacity-75 transition-opacity"
                    @click="setTradeAssetFilter(slice.asset['asset-id'])"
                  >
                    <title>{{ slice.asset.name }}: {{ slice.percentage }}%</title>
                  </path>
                  <!-- Donut hole -->
                  <circle cx="50" cy="50" r="22" fill="rgb(17 24 39)" />
                  <text
                    x="50"
                    y="48"
                    text-anchor="middle"
                    fill="white"
                    font-size="5.5"
                    font-weight="600"
                  >
                    {{ $t("addressDetails.assetAllocation") }}
                  </text>
                  <text
                    x="50"
                    y="56"
                    text-anchor="middle"
                    fill="#6b7280"
                    font-size="5"
                  >
                    {{ enrichedAssets.length }}
                    {{ $t("addressDetails.assetsCount") }}
                  </text>
                </svg>
              </div>
              <!-- Pie legend -->
              <div class="w-full space-y-1">
                <div
                  v-for="slice in pieChartSlices.slice(0, 8)"
                  :key="slice.asset['asset-id']"
                  class="flex items-center gap-2 text-xs cursor-pointer hover:opacity-80"
                  @click="setTradeAssetFilter(slice.asset['asset-id'])"
                >
                  <div
                    class="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    :style="{ backgroundColor: slice.color }"
                  ></div>
                  <span class="text-gray-300 truncate flex-1">{{
                    slice.asset.name
                  }}</span>
                  <span class="text-gray-400 flex-shrink-0"
                    >{{ slice.percentage }}%</span
                  >
                </div>
              </div>
            </div>

            <!-- No assets -->
            <div
              v-if="enrichedAssets.length === 0"
              class="text-center py-4 text-gray-400 text-sm"
            >
              {{ $t("addressDetails.noAssets") }}
            </div>

            <!-- Asset list -->
            <div class="space-y-2">
              <div
                v-for="asset in pagedAssets"
                :key="asset['asset-id']"
                class="flex justify-between items-center p-3 bg-gray-800 rounded"
              >
                <div class="flex-1 min-w-0 mr-2">
                  <div class="flex items-center gap-1.5">
                    <span class="text-white font-medium text-sm truncate">{{
                      asset.name
                    }}</span>
                    <!-- Filter by asset icon -->
                    <button
                      @click="setTradeAssetFilter(asset['asset-id'])"
                      :class="[
                        'flex-shrink-0 transition-colors',
                        tradeAssetFilter === asset['asset-id']
                          ? 'text-blue-400'
                          : 'text-gray-500 hover:text-blue-400',
                      ]"
                      :title="t('addressDetails.filterByAsset')"
                    >
                      <svg
                        class="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                  <div
                    class="text-xs text-gray-500 flex items-center gap-1 mt-0.5"
                    v-if="asset['asset-id'] !== 0"
                  >
                    ID: {{ asset["asset-id"] }}
                    <CopyToClipboard
                      :text="asset['asset-id'].toString()"
                      :toast-message="
                        t('common.copiedAssetId', {
                          name: asset.name,
                          id: asset['asset-id'],
                        })
                      "
                      :title="
                        t('common.copyAssetId', {
                          name: asset.name,
                          id: asset['asset-id'],
                        })
                      "
                      class="text-gray-600 hover:text-white transition-colors"
                    />
                  </div>
                  <div class="text-xs text-gray-500" v-if="asset.priceUSD > 0">
                    <FormattedNumber
                      :value="asset.priceUSD"
                      type="currency"
                      currency="USD"
                      :maximum-fraction-digits="6"
                      :small-threshold="0.01"
                      :significant-digits="4"
                    />
                    {{ $t("addressDetails.perUnit") }}
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-white font-mono text-sm">
                    {{ formatAssetAmount(asset.amount, asset["asset-id"]) }}
                  </div>
                  <div
                    class="text-xs text-green-400"
                    v-if="asset.valueUSD > 0"
                  >
                    <FormattedNumber
                      :value="asset.valueUSD"
                      type="currency"
                      currency="USD"
                      :maximum-fraction-digits="2"
                      :small-threshold="0.01"
                      :significant-digits="4"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Assets pagination -->
            <div
              v-if="enrichedAssets.length > PAGE_SIZE"
              class="flex justify-between items-center pt-1"
            >
              <button
                :disabled="assetsPage === 0"
                @click="assetsPage--"
                class="btn-secondary text-sm"
              >
                {{ $t("common.prev") }}
              </button>
              <span class="text-xs text-gray-400">
                {{ $t("common.page") }} {{ assetsPage + 1 }} /
                {{ totalAssetsPages }}
              </span>
              <button
                :disabled="assetsPage + 1 >= totalAssetsPages"
                @click="assetsPage++"
                class="btn-secondary text-sm"
              >
                {{ $t("common.next") }}
              </button>
            </div>
          </div>

          <!-- Column 2: Recent Transactions -->
          <div class="card space-y-4">
            <h2 class="text-xl font-semibold">
              {{ $t("addressDetails.recentTransactions") }}
            </h2>

            <div
              v-if="loadingTransactions && transactions.length === 0"
              class="text-center py-4 text-gray-400 text-sm"
            >
              <div
                class="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
              ></div>
              {{ $t("common.loading") }}
            </div>

            <div
              v-else-if="pagedTransactions.length === 0"
              class="text-center py-4 text-gray-400 text-sm"
            >
              {{ $t("addressDetails.noTransactions") }}
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="tx in pagedTransactions"
                :key="tx.id"
                class="p-3 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                <div class="flex justify-between items-start mb-1">
                  <router-link
                    :to="{
                      name: 'TransactionDetails',
                      params: { txId: tx.id },
                    }"
                    class="text-blue-400 hover:text-blue-300 font-mono text-xs"
                    v-if="tx.id"
                  >
                    {{ algorandService.formatTransactionId(tx.id) }}
                  </router-link>
                  <span
                    class="text-xs text-gray-400"
                    v-if="tx['round-time']"
                  >
                    <FormattedTime :timestamp="BigInt(tx['round-time'])" />
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-400 text-xs">{{
                    formatTransactionType(tx["tx-type"] || "unknown")
                  }}</span>
                  <div class="text-right">
                    <div class="text-white text-xs">
                      {{ $t("addressDetails.round") }}
                      {{ tx["confirmed-round"] || "N/A" }}
                    </div>
                    <div class="text-gray-400 text-xs">
                      {{ $t("addressDetails.fee") }}
                      {{ algorandService.formatAlgoAmount(tx.fee) }} ALGO
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Transactions pagination -->
            <div class="flex justify-between items-center pt-1">
              <button
                :disabled="txPage === 0"
                @click="prevTxPage"
                class="btn-secondary text-sm"
              >
                {{ $t("common.prev") }}
              </button>
              <span class="text-xs text-gray-400">
                {{ $t("common.page") }} {{ txPage + 1 }}
              </span>
              <button
                :disabled="!canGoToNextTxPage || loadingTransactions"
                @click="nextTxPage"
                class="btn-secondary text-sm"
              >
                {{
                  loadingTransactions
                    ? $t("common.loading")
                    : $t("common.next")
                }}
              </button>
            </div>
          </div>

          <!-- Column 3: Recent Trades -->
          <div class="card space-y-4">
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-semibold">
                {{ $t("addressDetails.recentTrades") }}
              </h2>
              <span
                v-if="liveTradeUpdates > 0"
                class="text-xs text-green-300 rounded bg-green-600/20 px-2 py-1"
              >
                {{
                  $t("addressDetails.liveUpdates", {
                    count: liveTradeUpdates,
                  })
                }}
              </span>
            </div>

            <!-- Mini filters -->
            <div class="space-y-2">
              <div class="space-y-1">
                <label class="text-xs text-gray-400">{{
                  $t("addressDetails.assetFilter")
                }}</label>
                <select
                  v-model="tradeAssetFilter"
                  class="filter-control text-sm"
                >
                  <option :value="null">
                    {{ $t("addressDetails.allAssets") }}
                  </option>
                  <option
                    v-for="asset in enrichedAssets"
                    :key="asset['asset-id']"
                    :value="asset['asset-id']"
                  >
                    {{ asset.name }}
                    <template v-if="asset.unitName && asset.unitName !== asset.name">
                      ({{ asset.unitName }})
                    </template>
                  </option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label class="text-xs text-gray-400">{{
                    $t("addressDetails.minUSD")
                  }}</label>
                  <input
                    type="number"
                    v-model="tradeMinUSD"
                    min="0"
                    step="0.01"
                    inputmode="decimal"
                    class="filter-control text-sm"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-gray-400">{{
                    $t("addressDetails.maxUSD")
                  }}</label>
                  <input
                    type="number"
                    v-model="tradeMaxUSD"
                    min="0"
                    step="0.01"
                    inputmode="decimal"
                    class="filter-control text-sm"
                  />
                </div>
              </div>
            </div>

            <!-- Loading / empty state -->
            <div
              v-if="loadingAddressTrades && addressTrades.length === 0"
              class="text-center py-4 text-gray-400 text-sm"
            >
              <div
                class="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
              ></div>
              {{ $t("common.loading") }}
            </div>

            <div
              v-else-if="filteredAddressTrades.length === 0"
              class="text-center py-4 text-gray-400 text-sm"
            >
              {{ $t("addressDetails.noTradesForAddress") }}
            </div>

            <!-- Trade list (compact) -->
            <div v-else class="space-y-2">
              <div
                v-for="trade in pagedAddressTrades"
                :key="tradeKey(trade)"
                class="p-2.5 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                <div class="flex items-center justify-between mb-1 gap-2">
                  <div class="flex items-center gap-1 min-w-0 flex-1">
                    <img
                      :src="assetImageUrl(trade.assetIdIn)"
                      class="w-4 h-4 rounded-full border border-gray-700 bg-gray-900 flex-shrink-0"
                      :alt="assetName(trade.assetIdIn)"
                    />
                    <span class="text-xs text-gray-300 truncate">{{
                      assetName(trade.assetIdIn)
                    }}</span>
                    <svg
                      class="w-3 h-3 text-gray-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <img
                      :src="assetImageUrl(trade.assetIdOut)"
                      class="w-4 h-4 rounded-full border border-gray-700 bg-gray-900 flex-shrink-0"
                      :alt="assetName(trade.assetIdOut)"
                    />
                    <span class="text-xs text-gray-300 truncate">{{
                      assetName(trade.assetIdOut)
                    }}</span>
                  </div>
                  <router-link
                    v-if="trade.topTxId || trade.txId"
                    :to="{
                      name: 'TransactionDetails',
                      params: { txId: trade.topTxId || trade.txId },
                    }"
                    class="text-blue-400 hover:text-blue-300 font-mono text-xs flex-shrink-0"
                  >
                    {{
                      algorandService.formatTransactionId(
                        trade.topTxId || trade.txId || "",
                      )
                    }}
                  </router-link>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">
                    <FormattedTime
                      :timestamp="trade.timestamp || fallbackTimestamp"
                      format="both"
                    />
                  </span>
                  <FormattedNumber
                    v-if="trade.valueUSD"
                    :value="trade.valueUSD"
                    type="currency"
                    currency="USD"
                    :maximum-fraction-digits="2"
                    :small-threshold="0.01"
                    :significant-digits="4"
                    class="text-xs text-green-400"
                  />
                </div>
              </div>
            </div>

            <!-- Trades pagination -->
            <div
              v-if="filteredAddressTrades.length > PAGE_SIZE"
              class="flex justify-between items-center pt-1"
            >
              <button
                :disabled="tradesPage === 0"
                @click="tradesPage--"
                class="btn-secondary text-sm"
              >
                {{ $t("common.prev") }}
              </button>
              <span class="text-xs text-gray-400">
                {{ $t("common.page") }} {{ tradesPage + 1 }} /
                {{ totalTradesPages }}
              </span>
              <button
                :disabled="tradesPage + 1 >= totalTradesPages"
                @click="tradesPage++"
                class="btn-secondary text-sm"
              >
                {{ $t("common.next") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { algorandService } from "../services/algorandService";
import { assetService } from "../services/assetService";
import { signalrService } from "../services/signalrService";
import { getAVMTradeReporterAPI } from "../api";
import type { Pool, Trade } from "../api/models";
import type { AMMTrade } from "../types/algorand";
import type { SubscriptionFilter } from "../types/SubscriptionFilter";
import FormattedTime from "../components/FormattedTime.vue";
import CopyToClipboard from "../components/CopyToClipboard.vue";
import FormattedNumber from "../components/FormattedNumber.vue";

const { t, locale } = useI18n();
const api = getAVMTradeReporterAPI();

const PAGE_SIZE = 25;
const fallbackTimestamp = new Date().toISOString();

interface AccountAsset {
  "asset-id": number;
  amount: number;
  "is-frozen": boolean;
}

interface AccountInfo {
  amount: number;
  "min-balance": number;
  round: number;
  status: string;
  assets?: AccountAsset[];
}

interface IndexerTransaction {
  id: string;
  fee: number;
  "round-time"?: number;
  "tx-type"?: string;
  "confirmed-round"?: number;
  [key: string]: any;
}

const route = useRoute();
const address = computed(() => route.params.address as string);

// Account state
const loading = ref(false);
const error = ref("");
const accountInfo = ref<AccountInfo | null>(null);
const assetPrices = ref<Record<number, number>>({});
const identifiedPool = ref<Pool | null>(null);

// Transaction state
const transactions = ref<IndexerTransaction[]>([]);
const loadingTransactions = ref(false);
const hasMoreTransactions = ref(true);
const nextToken = ref("");
const txPage = ref(0);

// Assets pagination
const assetsPage = ref(0);

// Trades state
const addressTrades = ref<Trade[]>([]);
const loadingAddressTrades = ref(false);
const liveTradeUpdates = ref(0);
const tradeAssetFilter = ref<number | null>(null);
const tradeMinUSD = ref("");
const tradeMaxUSD = ref("");
const tradesPage = ref(0);
const forceUpdate = ref(0);
let tradeSubscriptionFilter: SubscriptionFilter | null = null;

// Pie chart colors
const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#a78bfa",
];

// ---- Computed ----

const enrichedAssets = computed(() => {
  void forceUpdate.value; // re-run when asset metadata loads
  if (!accountInfo.value) return [];

  const assets: any[] = [];

  // Add Algo
  assets.push({
    "asset-id": 0,
    amount: accountInfo.value.amount,
    "is-frozen": false,
    name: "Algorand",
    unitName: "ALGO",
    decimals: 6,
    priceUSD: assetPrices.value[0] || 0,
    valueUSD:
      (accountInfo.value.amount / Math.pow(10, 6)) *
      (assetPrices.value[0] || 0),
  });

  if (accountInfo.value.assets) {
    accountInfo.value.assets.forEach((asset) => {
      const assetId = asset["asset-id"];
      const assetInfo = assetService.getAssetInfo(BigInt(assetId));

      if (!assetInfo) {
        assetService.requestAsset(BigInt(assetId), () => {
          forceUpdate.value += 1;
        });
      }

      const decimals = assetInfo?.decimals ?? 0;
      const price = assetPrices.value[assetId] || 0;
      const amount = asset.amount;
      const valueUSD = (amount / Math.pow(10, decimals)) * price;

      assets.push({
        ...asset,
        name: assetInfo?.name || `Asset ${assetId}`,
        unitName: assetInfo?.unitName || t("assets.unit"),
        decimals,
        priceUSD: price,
        valueUSD,
      });
    });
  }

  return assets.sort((a, b) => b.valueUSD - a.valueUSD);
});

const totalValueUSD = computed(() =>
  enrichedAssets.value.reduce((sum, asset) => sum + asset.valueUSD, 0),
);

// Assets pagination
const totalAssetsPages = computed(() =>
  Math.max(1, Math.ceil(enrichedAssets.value.length / PAGE_SIZE)),
);
const pagedAssets = computed(() =>
  enrichedAssets.value.slice(
    assetsPage.value * PAGE_SIZE,
    (assetsPage.value + 1) * PAGE_SIZE,
  ),
);

// Transactions pagination
const pagedTransactions = computed(() =>
  transactions.value.slice(
    txPage.value * PAGE_SIZE,
    (txPage.value + 1) * PAGE_SIZE,
  ),
);
const canGoToNextTxPage = computed(() => {
  const nextStart = (txPage.value + 1) * PAGE_SIZE;
  return nextStart < transactions.value.length || hasMoreTransactions.value;
});

// Trades filtering and pagination
const filteredAddressTrades = computed(() => {
  return addressTrades.value.filter((trade) => {
    if (tradeAssetFilter.value !== null) {
      if (
        trade.assetIdIn !== tradeAssetFilter.value &&
        trade.assetIdOut !== tradeAssetFilter.value
      )
        return false;
    }
    const minUSD =
      tradeMinUSD.value !== "" ? parseFloat(tradeMinUSD.value) : null;
    const maxUSD =
      tradeMaxUSD.value !== "" ? parseFloat(tradeMaxUSD.value) : null;
    if (minUSD !== null && (trade.valueUSD ?? 0) < minUSD) return false;
    if (maxUSD !== null && (trade.valueUSD ?? 0) > maxUSD) return false;
    return true;
  });
});
const totalTradesPages = computed(() =>
  Math.max(1, Math.ceil(filteredAddressTrades.value.length / PAGE_SIZE)),
);
const pagedAddressTrades = computed(() =>
  filteredAddressTrades.value.slice(
    tradesPage.value * PAGE_SIZE,
    (tradesPage.value + 1) * PAGE_SIZE,
  ),
);

// Pie chart slices
const pieChartSlices = computed(() => {
  const total = enrichedAssets.value.reduce((sum, a) => sum + a.valueUSD, 0);
  if (total === 0) return [];
  let angle = 0;
  return enrichedAssets.value
    .filter((a) => a.valueUSD > 0)
    .map((asset, i) => {
      const fraction = asset.valueUSD / total;
      const startAngle = angle;
      angle += fraction * 2 * Math.PI;
      return {
        asset,
        color: PIE_COLORS[i % PIE_COLORS.length],
        startAngle,
        endAngle: angle,
        fraction,
        percentage: (fraction * 100).toFixed(1),
      };
    });
});

// ---- Watchers ----

watch([tradeAssetFilter, tradeMinUSD, tradeMaxUSD], () => {
  tradesPage.value = 0;
});

// ---- Functions ----

function slicePath(startAngle: number, endAngle: number): string {
  const cx = 50,
    cy = 50,
    outerR = 45,
    innerR = 25;
  const s = startAngle - Math.PI / 2;
  const e = endAngle - Math.PI / 2;
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const x1 = cx + outerR * Math.cos(s);
  const y1 = cy + outerR * Math.sin(s);
  const x2 = cx + outerR * Math.cos(e);
  const y2 = cy + outerR * Math.sin(e);
  const x3 = cx + innerR * Math.cos(e);
  const y3 = cy + innerR * Math.sin(e);
  const x4 = cx + innerR * Math.cos(s);
  const y4 = cy + innerR * Math.sin(s);
  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

function setTradeAssetFilter(assetId: number) {
  tradesPage.value = 0;
  tradeAssetFilter.value =
    tradeAssetFilter.value === assetId ? null : assetId;
}

function assetName(assetId?: number | null): string {
  void forceUpdate.value;
  if (assetId === undefined || assetId === null) return t("common.unknown");
  const info = assetService.getAssetInfo(BigInt(assetId));
  if (!info) {
    void assetService.requestAsset(BigInt(assetId), () => {
      forceUpdate.value += 1;
    });
    return `${t("common.asset")} ${assetId}`;
  }
  return info.unitName || info.name || `${t("common.asset")} ${assetId}`;
}

function assetImageUrl(assetId?: number | null): string {
  return `https://algorand-trades.de-4.biatec.io/api/asset/image/${assetId ?? 0}`;
}

function tradeKey(trade: Trade): string {
  return [
    trade.txId || trade.topTxId || "pending",
    trade.poolAddress || "pool",
    trade.assetIdIn ?? "in",
    trade.assetIdOut ?? "out",
  ].join(":");
}

function tradeTime(trade: Trade): number {
  const parsed = trade.timestamp ? new Date(trade.timestamp).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function convertAMMTrade(trade: AMMTrade): Trade {
  return {
    assetIdIn: Number(trade.assetIdIn),
    assetIdOut: Number(trade.assetIdOut),
    assetAmountIn: trade.assetAmountIn,
    assetAmountOut: trade.assetAmountOut,
    valueUSD: trade.valueUSD ?? null,
    priceAssetInUSD: trade.priceAssetInUSD ?? null,
    priceAssetOutUSD: trade.priceAssetOutUSD ?? null,
    feesUSD: trade.feesUSD ?? null,
    feesUSDProvider: trade.feesUSDProvider ?? null,
    feesUSDProtocol: trade.feesUSDProtocol ?? null,
    txId: trade.txId,
    blockId: Number(trade.blockId),
    txGroup: trade.txGroup,
    timestamp: trade.timestamp,
    protocol: trade.protocol as Trade["protocol"],
    trader: trade.trader,
    poolAddress: trade.poolAddress,
    poolAppId: Number(trade.poolAppId),
    topTxId: trade.topTxId,
    tradeState: trade.tradeState as Trade["tradeState"],
  };
}

function handleAddressTradeUpdate(trade: AMMTrade) {
  if (!address.value || trade.trader !== address.value) return;

  const apiTrade = convertAMMTrade(trade);
  const existingIdx = addressTrades.value.findIndex(
    (item) => tradeKey(item) === tradeKey(apiTrade),
  );

  if (existingIdx >= 0) {
    if (
      addressTrades.value[existingIdx].tradeState === "Confirmed" &&
      apiTrade.tradeState === "TxPool"
    )
      return;
    const next = [...addressTrades.value];
    next[existingIdx] = apiTrade;
    addressTrades.value = next
      .sort((a, b) => tradeTime(b) - tradeTime(a))
      .slice(0, 100);
    return;
  }

  addressTrades.value = [apiTrade, ...addressTrades.value]
    .sort((a, b) => tradeTime(b) - tradeTime(a))
    .slice(0, 100);
  liveTradeUpdates.value += 1;
}

async function fetchAddressTrades() {
  if (!address.value) return;
  loadingAddressTrades.value = true;
  try {
    const response = await api.getApiTrade({
      trader: address.value,
      size: 100,
      sortBy: "timestamp",
      sortDirection: "desc",
    });
    const page = (response.data as any) ?? {};
    addressTrades.value = Array.isArray(page.items) ? page.items : [];
  } catch (e) {
    console.error("Error fetching address trades:", e);
  } finally {
    loadingAddressTrades.value = false;
  }
}

function createAddressSubscriptionFilter(): SubscriptionFilter {
  const assetIds = enrichedAssets.value
    .slice(0, 15)
    .map((a) => a["asset-id"].toString());
  return {
    RecentBlocks: false,
    RecentTrades: true,
    RecentLiquidity: false,
    RecentPool: false,
    RecentAggregatedPool: false,
    RecentAssets: false,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: assetIds,
  };
}

async function subscribeToAddressTrades() {
  await unsubscribeFromAddressTrades();
  tradeSubscriptionFilter = createAddressSubscriptionFilter();
  await signalrService.subscribe(tradeSubscriptionFilter);
}

async function unsubscribeFromAddressTrades() {
  if (!tradeSubscriptionFilter) return;
  const filter = tradeSubscriptionFilter;
  tradeSubscriptionFilter = null;
  await signalrService.unsubscribeFilter(filter);
}

// Transaction pagination helpers
async function nextTxPage() {
  const nextStart = (txPage.value + 1) * PAGE_SIZE;
  if (nextStart >= transactions.value.length) {
    if (hasMoreTransactions.value) {
      await loadTransactions(false);
    } else {
      return;
    }
  }
  txPage.value++;
}

function prevTxPage() {
  if (txPage.value > 0) txPage.value--;
}

// ---- Data loading ----

const loadAddressInfo = async () => {
  if (!address.value) return;

  loading.value = true;
  error.value = "";

  try {
    const accountResponse = await fetch(
      `https://mainnet-idx.algonode.cloud/v2/accounts/${address.value}`,
    );

    if (!accountResponse.ok) {
      throw new Error(t("addressDetails.notFound"));
    }

    const accountData = await accountResponse.json();
    accountInfo.value = accountData.account;

    fetchAssetPrices();
    fetchIdentifiedPool();
    await loadTransactions(true);
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : t("addressDetails.loadError");
    console.error("Error loading address info:", err);
  } finally {
    loading.value = false;
  }
};

const fetchIdentifiedPool = async () => {
  identifiedPool.value = null;
  if (!address.value) return;

  try {
    const response = await api.getApiPool({ address: address.value, size: 1 });
    identifiedPool.value = response.data?.[0] ?? null;
  } catch (poolError) {
    console.error("Error identifying pool address:", poolError);
  }
};

const fetchAssetPrices = async () => {
  if (!accountInfo.value) return;

  const assetsToFetch = new Set<number>();
  assetsToFetch.add(0);

  if (accountInfo.value.assets) {
    accountInfo.value.assets.forEach((a) => assetsToFetch.add(a["asset-id"]));
  }

  const queue = Array.from(assetsToFetch);
  const batchSize = 5;

  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (assetId) => {
        try {
          const response = await api.getApiSearch({ q: assetId.toString() });

          if (response.data.assets && response.data.assets.length > 0) {
            const asset = response.data.assets.find((a) => a.index === assetId);
            if (asset && asset.priceUSD) {
              assetPrices.value[assetId] = asset.priceUSD;
            }
          }
        } catch (e) {
          console.error(`Failed to fetch price for asset ${assetId}`, e);
        }
      }),
    );
  }
};

const loadTransactions = async (reset = false) => {
  if (!address.value) return;

  loadingTransactions.value = true;

  try {
    const url = `https://mainnet-idx.algonode.cloud/v2/accounts/${address.value}/transactions?limit=${PAGE_SIZE}${nextToken.value ? `&next=${nextToken.value}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(t("addressDetails.loadTxError"));
    }

    const data = await response.json();

    if (reset) {
      transactions.value = data.transactions || [];
      txPage.value = 0;
    } else {
      transactions.value.push(...(data.transactions || []));
    }

    nextToken.value = data["next-token"] || "";
    hasMoreTransactions.value = !!data["next-token"];
  } catch (err) {
    console.error("Error loading transactions:", err);
  } finally {
    loadingTransactions.value = false;
  }
};

// ---- Formatters ----

const formatAlgoAmount = (microAlgos: number): string =>
  algorandService.formatAlgoAmount(microAlgos);

const formatAssetAmount = (amount: number, assetId: number): string => {
  const assetInfo = assetService.getAssetInfo(BigInt(assetId));
  if (!assetInfo) return assetService.formatAssetBalance(BigInt(amount), BigInt(assetId));
  const decimals = assetInfo.decimals || 0;
  const value = amount / Math.pow(10, decimals);
  const unitName = assetInfo.unitName || assetInfo.name || `Asset ${assetId}`;
  const formatted = new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: Math.min(Math.max(decimals, 2), 8),
  }).format(value);
  return `${formatted} ${unitName}`;
};

const formatTransactionType = (txType: string): string => {
  const typeMap: { [key: string]: string } = {
    pay: t("transaction.type.pay"),
    axfer: t("transaction.type.axfer"),
    acfg: t("transaction.type.acfg"),
    afrz: t("transaction.type.afrz"),
    appl: t("transaction.type.appl"),
    keyreg: t("transaction.type.keyreg"),
  };
  return typeMap[txType] || txType;
};

const formatStatus = (status?: string) => {
  if (!status) return "N/A";
  if (status === "Online") return t("status.online");
  if (status === "Offline") return t("status.offline");
  return status;
};

const getAssetLabel = (assetId?: number | null): string => {
  if (assetId === undefined || assetId === null) return t("common.unknown");
  const assetInfo = assetService.getAssetInfo(BigInt(assetId));
  if (!assetInfo) {
    assetService.requestAsset(BigInt(assetId), () => {});
    return `${t("common.asset")} ${assetId}`;
  }
  return (
    assetInfo.unitName || assetInfo.name || `${t("common.asset")} ${assetId}`
  );
};

const formatPoolPair = (pool: Pool): string =>
  `${getAssetLabel(pool.assetIdA)} / ${getAssetLabel(pool.assetIdB)}`;

// ---- Lifecycle ----

onMounted(async () => {
  await loadAddressInfo();
  await fetchAddressTrades();
  signalrService.onTradeReceived(handleAddressTradeUpdate);
  await subscribeToAddressTrades();
});

onUnmounted(async () => {
  signalrService.unsubscribeFromTradeUpdates(handleAddressTradeUpdate);
  await unsubscribeFromAddressTrades();
});
</script>

<style scoped>
.filter-control {
  width: 100%;
  border-radius: 0.25rem;
  border: 1px solid rgb(71 85 105 / 0.7);
  background: rgb(15 23 42 / 0.6);
  padding: 0.5rem 0.75rem;
  color: white;
}

.filter-control::placeholder {
  color: #64748b;
}
</style>
