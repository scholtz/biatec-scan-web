<template>
  <div class="p-4 space-y-4">
    <div
      class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="space-y-2">
        <h1 class="text-2xl font-semibold text-white">{{ pageTitle }}</h1>
        <p class="text-sm text-gray-400">{{ routeDescription }}</p>
        <div class="flex flex-wrap gap-2 text-xs text-gray-300">
          <span class="rounded bg-dark-700/70 px-2 py-1">
            {{ $t("trades.routeFilter") }}: {{ routeLabel }}
          </span>
          <span class="rounded bg-dark-700/70 px-2 py-1">
            {{ $t("trades.loadedTrades", { count: trades.length }) }}
          </span>
          <span
            v-if="liveUpdates > 0"
            class="rounded bg-green-600/20 px-2 py-1 text-green-300"
          >
            {{ $t("trades.liveUpdates", { count: liveUpdates }) }}
          </span>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <router-link
          v-if="hasRouteFilter"
          :to="{ name: 'Trades' }"
          class="btn-secondary text-sm"
        >
          {{ $t("trades.clearRoute") }}
        </router-link>
        <button
          class="btn-primary text-sm"
          :disabled="loading"
          @click="refresh"
        >
          {{ $t("trades.refresh") }}
        </button>
      </div>
    </div>

    <div class="card space-y-5">
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-white">
          {{ $t("trades.routeScope") }}
        </h2>
        <p class="text-xs text-gray-400">
          {{ $t("trades.routeScopeHint") }}
        </p>
      </div>

      <div
        class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.asset1") }}</span>
          <input
            v-model.trim="routeFilter.asset1"
            inputmode="numeric"
            pattern="[0-9]*"
            :placeholder="$t('trades.assetPlaceholder')"
            class="filter-control"
          />
        </label>
        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.asset2") }}</span>
          <input
            v-model.trim="routeFilter.asset2"
            inputmode="numeric"
            pattern="[0-9]*"
            :placeholder="$t('trades.optionalAssetPlaceholder')"
            class="filter-control"
          />
        </label>
        <button class="btn-secondary text-sm" @click="applyRouteFilter">
          {{ $t("trades.applyRoute") }}
        </button>
      </div>
    </div>

    <div class="card space-y-4">
      <div class="flex flex-col gap-1">
        <h2 class="text-lg font-semibold text-white">
          {{ $t("trades.filters") }}
        </h2>
        <p class="text-xs text-gray-400">
          {{ $t("trades.loadedWindowHint") }}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.trader") }}</span>
          <input
            v-model.trim="filters.trader"
            type="search"
            :placeholder="$t('trades.traderPlaceholder')"
            class="filter-control"
          />
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.protocol") }}</span>
          <select v-model="filters.protocol" class="filter-control">
            <option value="all">{{ $t("trades.protocolAll") }}</option>
            <option value="Pact">Pact</option>
            <option value="Tiny">Tiny</option>
            <option value="Biatec">Biatec</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.state") }}</span>
          <select v-model="filters.state" class="filter-control">
            <option value="all">{{ $t("trades.stateAll") }}</option>
            <option value="Confirmed">{{ $t("trades.confirmed") }}</option>
            <option value="TxPool">{{ $t("trades.txPool") }}</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.direction") }}</span>
          <select v-model="filters.direction" class="filter-control">
            <option
              v-for="option in directionOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.minValueUSD") }}</span>
          <input
            v-model="filters.minValueUSD"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            class="filter-control"
          />
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.maxValueUSD") }}</span>
          <input
            v-model="filters.maxValueUSD"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            class="filter-control"
          />
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.minFeesUSD") }}</span>
          <input
            v-model="filters.minFeesUSD"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            class="filter-control"
          />
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.maxFeesUSD") }}</span>
          <input
            v-model="filters.maxFeesUSD"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            class="filter-control"
          />
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.fetchSize") }}</span>
          <select v-model.number="fetchSize" class="filter-control">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="250">250</option>
          </select>
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.fromTime") }}</span>
          <input
            v-model="filters.startTime"
            type="datetime-local"
            class="filter-control"
          />
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.toTime") }}</span>
          <input
            v-model="filters.endTime"
            type="datetime-local"
            class="filter-control"
          />
        </label>

        <label class="space-y-1 text-sm text-gray-300">
          <span>{{ $t("trades.sortBy") }}</span>
          <select v-model="filters.sortBy" class="filter-control">
            <option value="time-desc">{{ $t("trades.sortTimeDesc") }}</option>
            <option value="time-asc">{{ $t("trades.sortTimeAsc") }}</option>
            <option value="value-desc">{{ $t("trades.sortValueDesc") }}</option>
            <option value="fees-desc">{{ $t("trades.sortFeesDesc") }}</option>
            <option value="amount-in-desc">
              {{ $t("trades.sortAmountInDesc") }}
            </option>
            <option value="amount-out-desc">
              {{ $t("trades.sortAmountOutDesc") }}
            </option>
          </select>
        </label>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary text-sm" @click="resetFilters">
          {{ $t("trades.resetFilters") }}
        </button>
        <button
          class="btn-primary text-sm"
          :disabled="loading"
          @click="applyFilter"
        >
          {{ loading ? $t("common.loading") : $t("trades.applyFilter") }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="card py-4">
        <div class="text-xs uppercase text-gray-400">
          {{ $t("trades.matchingTrades") }}
        </div>
        <div class="mt-1 text-2xl font-semibold text-white">
          {{ totalMatches.toLocaleString(locale) }}
        </div>
      </div>
      <div class="card py-4">
        <div class="text-xs uppercase text-gray-400">
          {{ $t("trades.totalValue") }}
        </div>
        <div class="mt-1 text-2xl font-semibold text-white">
          <FormattedNumber
            :value="matchedValueUSD"
            type="currency"
            currency="USD"
            :maximum-fraction-digits="2"
            :small-threshold="0.01"
            :significant-digits="4"
          />
        </div>
      </div>
      <div class="card py-4">
        <div class="text-xs uppercase text-gray-400">
          {{ $t("trades.totalFees") }}
        </div>
        <div class="mt-1 text-2xl font-semibold text-white">
          <FormattedNumber
            :value="matchedFeesUSD"
            type="currency"
            currency="USD"
            :maximum-fraction-digits="2"
            :small-threshold="0.01"
            :significant-digits="4"
          />
        </div>
      </div>
      <div class="card py-4">
        <div class="text-xs uppercase text-gray-400">
          {{ $t("trades.loadedAt") }}
        </div>
        <div class="mt-1 text-sm text-white">
          <FormattedTime v-if="loadedAt" :timestamp="loadedAt" format="both" />
          <span v-else>-</span>
        </div>
      </div>
    </div>

    <div class="card space-y-4">
      <div
        class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
      >
        <h2 class="text-lg font-semibold text-white">
          {{ $t("trades.table") }}
        </h2>
        <div class="text-xs text-gray-400">
          {{ $t("trades.loadedTrades", { count: trades.length }) }}
        </div>
      </div>

      <div
        v-if="loading && trades.length === 0"
        class="py-12 text-center text-gray-400"
      >
        <div class="loading-spinner mx-auto mb-4"></div>
        {{ $t("common.loading") }}
      </div>

      <div
        v-else-if="error"
        class="rounded bg-red-900/20 p-4 text-sm text-red-300"
      >
        {{ error }}
      </div>

      <div
        v-else-if="trades.length === 0"
        class="py-12 text-center text-gray-400"
      >
        {{ $t("trades.noTrades") }}
      </div>

      <div v-else class="overflow-x-auto">
        <table
          class="min-w-330 w-full border-separate border-spacing-y-2 text-sm"
        >
          <thead>
            <tr class="text-left text-xs uppercase text-gray-400">
              <th class="px-3 py-2 font-medium">
                {{ $t("transaction.time") }}
              </th>
              <th class="px-3 py-2 font-medium">{{ $t("trades.pair") }}</th>
              <th class="px-3 py-2 font-medium text-right">
                {{ $t("common.sold") }}
              </th>
              <th class="px-3 py-2 font-medium text-right">
                {{ $t("common.bought") }}
              </th>
              <th class="px-3 py-2 font-medium text-right">
                {{ $t("trades.valueUSD") }}
              </th>
              <th class="px-3 py-2 font-medium">{{ $t("trades.trader") }}</th>
              <th class="px-3 py-2 font-medium">{{ $t("trades.pool") }}</th>
              <th class="px-3 py-2 font-medium">{{ $t("trades.protocol") }}</th>
              <th class="px-3 py-2 font-medium text-right">
                {{ $t("trades.fees") }}
              </th>
              <th class="px-3 py-2 font-medium text-right">
                {{ $t("trades.prices") }}
              </th>
              <th class="px-3 py-2 font-medium">{{ $t("trades.tx") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="trade in trades"
              :key="tradeKey(trade)"
              class="bg-gray-800/40 text-gray-200 transition-colors hover:bg-gray-800/70"
            >
              <td
                class="rounded-l-lg px-3 py-3 align-top text-xs text-gray-400"
              >
                <FormattedTime
                  :timestamp="trade.timestamp || fallbackTimestamp"
                  format="both"
                />
                <div v-if="trade.blockId" class="mt-1">
                  <router-link
                    :to="{
                      name: 'BlockDetails',
                      params: { round: trade.blockId },
                    }"
                    class="text-blue-200 hover:text-blue-100"
                  >
                    {{ $t("trades.block") }} {{ trade.blockId }}
                  </router-link>
                </div>
              </td>

              <td class="px-3 py-3 align-top">
                <router-link
                  :to="pairRoute(trade)"
                  class="flex items-center gap-2 text-blue-100 hover:text-blue-300"
                >
                  <span class="flex -space-x-1">
                    <img
                      :src="assetImageUrl(trade.assetIdIn)"
                      class="h-6 w-6 rounded-full border border-dark-700 bg-dark-900"
                      :alt="assetName(trade.assetIdIn)"
                    />
                    <img
                      :src="assetImageUrl(trade.assetIdOut)"
                      class="h-6 w-6 rounded-full border border-dark-700 bg-dark-900"
                      :alt="assetName(trade.assetIdOut)"
                    />
                  </span>
                  <span class="font-mono">{{ pairLabel(trade) }}</span>
                </router-link>
                <div class="mt-1 text-xs text-gray-500">
                  {{ formatTradeState(trade.tradeState) }}
                </div>
              </td>

              <td class="px-3 py-3 text-right align-top">
                <router-link
                  :to="assetRoute(trade.assetIdIn)"
                  class="font-mono text-blue-100 hover:text-blue-300"
                >
                  {{ formatAssetAmount(trade.assetAmountIn, trade.assetIdIn) }}
                </router-link>
              </td>

              <td class="px-3 py-3 text-right align-top">
                <router-link
                  :to="assetRoute(trade.assetIdOut)"
                  class="font-mono text-blue-100 hover:text-blue-300"
                >
                  {{
                    formatAssetAmount(trade.assetAmountOut, trade.assetIdOut)
                  }}
                </router-link>
              </td>

              <td class="px-3 py-3 text-right align-top font-mono text-white">
                <FormattedNumber
                  :value="trade.valueUSD"
                  type="currency"
                  currency="USD"
                  :maximum-fraction-digits="2"
                  :small-threshold="0.01"
                  :significant-digits="4"
                />
              </td>

              <td class="px-3 py-3 align-top">
                <router-link
                  v-if="trade.trader"
                  :to="{
                    name: 'AddressDetails',
                    params: { address: trade.trader },
                  }"
                  class="font-mono text-blue-100 hover:text-blue-300"
                  :title="trade.trader"
                >
                  {{ algorandService.formatAddress(trade.trader) }}
                </router-link>
                <span v-else>-</span>
              </td>

              <td class="px-3 py-3 align-top">
                <div>
                  <router-link
                    v-if="trade.poolAddress"
                    :to="{
                      name: 'AddressDetails',
                      params: { address: trade.poolAddress },
                    }"
                    class="font-mono text-blue-100 hover:text-blue-300"
                    :title="trade.poolAddress"
                  >
                    {{ algorandService.formatAddress(trade.poolAddress) }}
                  </router-link>
                  <span v-else>-</span>
                </div>
                <router-link
                  v-if="trade.poolAddress"
                  :to="{
                    name: 'PoolDetails',
                    params: { poolAddress: trade.poolAddress },
                  }"
                  class="mt-1 inline-block text-xs text-purple-300 hover:text-purple-200"
                >
                  {{ trade.poolAppId || $t("common.viewDetails") }}
                </router-link>
              </td>

              <td class="px-3 py-3 align-top">
                <div class="flex flex-col items-start gap-2">
                  <span
                    class="rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-200"
                  >
                    {{ trade.protocol || $t("common.unknown") }}
                  </span>
                  <span :class="stateBadgeClass(trade.tradeState)">
                    {{ formatTradeState(trade.tradeState) }}
                  </span>
                </div>
              </td>

              <td class="px-3 py-3 text-right align-top text-xs">
                <div class="font-mono text-white">
                  <FormattedNumber
                    :value="trade.feesUSD"
                    type="currency"
                    currency="USD"
                    :maximum-fraction-digits="2"
                    :small-threshold="0.01"
                    :significant-digits="4"
                  />
                </div>
                <div class="mt-1 text-gray-400">
                  {{ $t("trades.providerFees") }}:
                  <FormattedNumber
                    :value="trade.feesUSDProvider"
                    type="currency"
                    currency="USD"
                    :maximum-fraction-digits="2"
                    :small-threshold="0.01"
                    :significant-digits="4"
                  />
                </div>
                <div class="text-gray-400">
                  {{ $t("trades.protocolFees") }}:
                  <FormattedNumber
                    :value="trade.feesUSDProtocol"
                    type="currency"
                    currency="USD"
                    :maximum-fraction-digits="2"
                    :small-threshold="0.01"
                    :significant-digits="4"
                  />
                </div>
              </td>

              <td class="px-3 py-3 text-right align-top text-xs text-gray-400">
                <div>
                  {{ assetName(trade.assetIdIn) }}:
                  <FormattedNumber
                    :value="trade.priceAssetInUSD"
                    type="currency"
                    currency="USD"
                    :maximum-fraction-digits="6"
                    :small-threshold="0.01"
                    :significant-digits="4"
                  />
                </div>
                <div class="mt-1">
                  {{ assetName(trade.assetIdOut) }}:
                  <FormattedNumber
                    :value="trade.priceAssetOutUSD"
                    type="currency"
                    currency="USD"
                    :maximum-fraction-digits="6"
                    :small-threshold="0.01"
                    :significant-digits="4"
                  />
                </div>
              </td>

              <td class="rounded-r-lg px-3 py-3 align-top">
                <router-link
                  v-if="trade.topTxId || trade.txId"
                  :to="{
                    name: 'TransactionDetails',
                    params: { txId: trade.topTxId || trade.txId },
                  }"
                  class="font-mono text-blue-100 hover:text-blue-300"
                  :title="trade.topTxId || trade.txId || ''"
                >
                  {{
                    algorandService.formatTransactionId(
                      trade.topTxId || trade.txId || "",
                    )
                  }}
                </router-link>
                <div
                  v-if="trade.txGroup"
                  class="mt-1 max-w-36 truncate text-xs text-gray-500"
                  :title="trade.txGroup"
                >
                  {{ trade.txGroup }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="text-xs text-gray-400">
          {{ $t("trades.page", { page: pageNumber }) }}
        </div>
        <div class="flex gap-2">
          <button
            class="btn-secondary text-sm"
            :disabled="loading || offset === 0"
            @click="prevPage"
          >
            {{ $t("trades.previous") }}
          </button>
          <button
            class="btn-secondary text-sm"
            :disabled="loading || !hasMore"
            @click="nextPage"
          >
            {{ $t("trades.next") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { GetApiTradeParams, Trade } from "../api/models";
import { DEXProtocol, TxState } from "../api/models";
import { getAVMTradeReporterAPI } from "../api";
import FormattedNumber from "../components/FormattedNumber.vue";
import FormattedTime from "../components/FormattedTime.vue";
import { algorandService } from "../services/algorandService";
import { assetService } from "../services/assetService";
import { signalrService } from "../services/signalrService";
import type { AMMTrade } from "../types/algorand";
import type { SubscriptionFilter } from "../types/SubscriptionFilter";

type DirectionFilter =
  | "all"
  | "forward"
  | "reverse"
  | "asset-sold"
  | "asset-bought";
type SortOption =
  | "time-desc"
  | "time-asc"
  | "value-desc"
  | "fees-desc"
  | "amount-in-desc"
  | "amount-out-desc";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const api = getAVMTradeReporterAPI();

const trades = ref<Trade[]>([]);
const loading = ref(false);
const error = ref("");
const fetchSize = ref(25);
const offset = ref(0);
const hasMore = ref(false);
const totalMatches = ref(0);
const forceUpdate = ref(0);
const liveUpdates = ref(0);
const loadedAt = ref<string | null>(null);
const fallbackTimestamp = new Date().toISOString();

const pageNumber = computed(
  () => Math.floor(offset.value / fetchSize.value) + 1,
);

const routeFilter = reactive({
  asset1: "",
  asset2: "",
});

const filters = reactive({
  trader: "",
  protocol: "all",
  state: "all",
  direction: "all" as DirectionFilter,
  minValueUSD: "",
  maxValueUSD: "",
  minFeesUSD: "",
  maxFeesUSD: "",
  startTime: "",
  endTime: "",
  sortBy: "time-desc" as SortOption,
});

let subscriptionFilter: SubscriptionFilter | null = null;

function routeAsset(paramName: "assetId1" | "assetId2") {
  const value = route.params[paramName];
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === "") return null;
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

const assetId1 = computed(() => routeAsset("assetId1"));
const assetId2 = computed(() => routeAsset("assetId2"));
const hasRouteFilter = computed(() => assetId1.value !== null);
const hasPairFilter = computed(
  () => assetId1.value !== null && assetId2.value !== null,
);
const hasSingleAssetFilter = computed(
  () => assetId1.value !== null && assetId2.value === null,
);

const pageTitle = computed(() => {
  if (
    hasPairFilter.value &&
    assetId1.value !== null &&
    assetId2.value !== null
  ) {
    return t("trades.titlePair", {
      asset1: assetName(assetId1.value),
      asset2: assetName(assetId2.value),
    });
  }
  if (hasSingleAssetFilter.value && assetId1.value !== null) {
    return t("trades.titleAsset", { asset: assetName(assetId1.value) });
  }
  return t("trades.title");
});

const routeDescription = computed(() => {
  if (
    hasPairFilter.value &&
    assetId1.value !== null &&
    assetId2.value !== null
  ) {
    return t("trades.descriptionPair", {
      asset1: assetName(assetId1.value),
      asset2: assetName(assetId2.value),
    });
  }
  if (hasSingleAssetFilter.value && assetId1.value !== null) {
    return t("trades.descriptionAsset", { asset: assetName(assetId1.value) });
  }
  return t("trades.descriptionAll");
});

const routeLabel = computed(() => {
  if (
    hasPairFilter.value &&
    assetId1.value !== null &&
    assetId2.value !== null
  ) {
    return `${assetName(assetId1.value)} / ${assetName(assetId2.value)}`;
  }
  if (hasSingleAssetFilter.value && assetId1.value !== null) {
    return assetName(assetId1.value);
  }
  return t("trades.allTrades");
});

const directionOptions = computed(() => {
  if (
    hasPairFilter.value &&
    assetId1.value !== null &&
    assetId2.value !== null
  ) {
    return [
      { value: "all", label: t("trades.directionAll") },
      {
        value: "forward",
        label: t("trades.directionForward", {
          asset1: assetName(assetId1.value),
          asset2: assetName(assetId2.value),
        }),
      },
      {
        value: "reverse",
        label: t("trades.directionReverse", {
          asset1: assetName(assetId1.value),
          asset2: assetName(assetId2.value),
        }),
      },
    ];
  }
  if (hasSingleAssetFilter.value && assetId1.value !== null) {
    return [
      { value: "all", label: t("trades.directionAll") },
      {
        value: "asset-sold",
        label: t("trades.directionAssetSold", {
          asset: assetName(assetId1.value),
        }),
      },
      {
        value: "asset-bought",
        label: t("trades.directionAssetBought", {
          asset: assetName(assetId1.value),
        }),
      },
    ];
  }
  return [{ value: "all", label: t("trades.directionAll") }];
});

const matchedValueUSD = computed(() =>
  trades.value.reduce((sum, trade) => sum + (trade.valueUSD ?? 0), 0),
);

const matchedFeesUSD = computed(() =>
  trades.value.reduce((sum, trade) => sum + (trade.feesUSD ?? 0), 0),
);

function tradeMatchesFilters(trade: Trade) {
  if (!matchesRoute(trade)) return false;
  if (!matchesDirection(trade)) return false;
  if (filters.protocol !== "all" && trade.protocol !== filters.protocol) {
    return false;
  }
  if (filters.state !== "all" && trade.tradeState !== filters.state) {
    return false;
  }
  if (filters.trader) {
    if ((trade.trader ?? "").toLowerCase() !== filters.trader.toLowerCase()) {
      return false;
    }
  }

  const minValue = optionalNumber(filters.minValueUSD);
  const maxValue = optionalNumber(filters.maxValueUSD);
  const minFees = optionalNumber(filters.minFeesUSD);
  const maxFees = optionalNumber(filters.maxFeesUSD);
  const start = optionalDate(filters.startTime);
  const end = optionalDate(filters.endTime);

  const valueUSD = trade.valueUSD ?? 0;
  const feesUSD = trade.feesUSD ?? 0;
  const timestamp = tradeTime(trade);
  if (minValue !== null && valueUSD < minValue) return false;
  if (maxValue !== null && valueUSD > maxValue) return false;
  if (minFees !== null && feesUSD < minFees) return false;
  if (maxFees !== null && feesUSD > maxFees) return false;
  if (start !== null && timestamp < start) return false;
  if (end !== null && timestamp > end) return false;
  return true;
}

function syncRouteFilter() {
  routeFilter.asset1 = assetId1.value?.toString() ?? "";
  routeFilter.asset2 = assetId2.value?.toString() ?? "";
}

function normalizeAssetInput(value: string) {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed : "";
}

function applyRouteFilter() {
  const first = normalizeAssetInput(routeFilter.asset1);
  const second = normalizeAssetInput(routeFilter.asset2);

  if (first && second) {
    void router.push({
      name: "TradesByPair",
      params: { assetId1: first, assetId2: second },
    });
    return;
  }

  if (first) {
    void router.push({ name: "TradesByAsset", params: { assetId1: first } });
    return;
  }

  void router.push({ name: "Trades" });
}

function optionalNumber(value: string) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalDate(value: string) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function tradeTime(trade: Trade) {
  const parsed = trade.timestamp ? new Date(trade.timestamp).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function matchesRoute(trade: Trade) {
  const first = assetId1.value;
  const second = assetId2.value;
  if (first === null) return true;
  if (second === null) {
    return trade.assetIdIn === first || trade.assetIdOut === first;
  }
  return (
    (trade.assetIdIn === first && trade.assetIdOut === second) ||
    (trade.assetIdIn === second && trade.assetIdOut === first)
  );
}

function matchesDirection(trade: Trade) {
  const first = assetId1.value;
  const second = assetId2.value;
  if (filters.direction === "all" || first === null) return true;
  if (second !== null) {
    if (filters.direction === "forward") {
      return trade.assetIdIn === first && trade.assetIdOut === second;
    }
    if (filters.direction === "reverse") {
      return trade.assetIdIn === second && trade.assetIdOut === first;
    }
  }
  if (filters.direction === "asset-sold") return trade.assetIdIn === first;
  if (filters.direction === "asset-bought") return trade.assetIdOut === first;
  return true;
}

function sortParams(): { sortBy: string; sortDirection: string } {
  switch (filters.sortBy) {
    case "time-asc":
      return { sortBy: "timestamp", sortDirection: "asc" };
    case "value-desc":
      return { sortBy: "valueUSD", sortDirection: "desc" };
    case "fees-desc":
      return { sortBy: "feesUSD", sortDirection: "desc" };
    case "amount-in-desc":
      return { sortBy: "assetAmountIn", sortDirection: "desc" };
    case "amount-out-desc":
      return { sortBy: "assetAmountOut", sortDirection: "desc" };
    case "time-desc":
    default:
      return { sortBy: "timestamp", sortDirection: "desc" };
  }
}

function buildTradeParams(): GetApiTradeParams {
  const first = assetId1.value;
  const second = assetId2.value;
  const sort = sortParams();
  const params: GetApiTradeParams = {
    offset: offset.value,
    size: fetchSize.value,
    sortBy: sort.sortBy,
    sortDirection: sort.sortDirection,
  };

  if (first !== null && second !== null) {
    if (filters.direction === "forward") {
      params.assetIdIn = first;
      params.assetIdOut = second;
    } else if (filters.direction === "reverse") {
      params.assetIdIn = second;
      params.assetIdOut = first;
    } else {
      params.assetIdA = first;
      params.assetIdB = second;
    }
  } else if (first !== null) {
    if (filters.direction === "asset-sold") {
      params.assetIdIn = first;
    } else if (filters.direction === "asset-bought") {
      params.assetIdOut = first;
    } else {
      params.assetId = first;
    }
  }

  if (filters.trader) params.trader = filters.trader;
  if (filters.protocol !== "all") {
    params.protocol = filters.protocol as DEXProtocol;
  }
  if (filters.state !== "all") {
    params.tradeState = filters.state as TxState;
  }

  const minValue = optionalNumber(filters.minValueUSD);
  const maxValue = optionalNumber(filters.maxValueUSD);
  const minFees = optionalNumber(filters.minFeesUSD);
  const maxFees = optionalNumber(filters.maxFeesUSD);
  if (minValue !== null) params.minValueUSD = minValue;
  if (maxValue !== null) params.maxValueUSD = maxValue;
  if (minFees !== null) params.minFeesUSD = minFees;
  if (maxFees !== null) params.maxFeesUSD = maxFees;

  if (filters.startTime) {
    params.timestampFrom = new Date(filters.startTime).toISOString();
  }
  if (filters.endTime) {
    params.timestampTo = new Date(filters.endTime).toISOString();
  }

  return params;
}

async function fetchTrades() {
  loading.value = true;
  error.value = "";
  try {
    const response = await api.getApiTrade(buildTradeParams());
    const page = response.data ?? {};
    const loaded = Array.isArray(page.items) ? page.items : [];
    trades.value = loaded;
    hasMore.value = page.hasMore ?? loaded.length === fetchSize.value;
    totalMatches.value = page.total ?? loaded.length;
    loadedAt.value = new Date().toISOString();
    liveUpdates.value = 0;
  } catch (fetchError) {
    console.error("Error fetching trades:", fetchError);
    error.value = t("trades.loadError");
  } finally {
    loading.value = false;
  }
}

function mergeTrades(nextTrades: Trade[]) {
  const map = new Map<string, Trade>();
  for (const trade of nextTrades) {
    const key = tradeKey(trade);
    const existing = map.get(key);
    if (existing?.tradeState === "Confirmed" && trade.tradeState === "TxPool") {
      continue;
    }
    map.set(key, trade);
  }
  return Array.from(map.values()).sort(
    (left, right) => tradeTime(right) - tradeTime(left),
  );
}

function applyFilter() {
  offset.value = 0;
  void fetchTrades();
}

function refresh() {
  offset.value = 0;
  void fetchTrades();
}

function nextPage() {
  if (!hasMore.value || loading.value) return;
  offset.value += fetchSize.value;
  void fetchTrades();
}

function prevPage() {
  if (offset.value === 0 || loading.value) return;
  offset.value = Math.max(0, offset.value - fetchSize.value);
  void fetchTrades();
}

function resetFilters() {
  filters.trader = "";
  filters.protocol = "all";
  filters.state = "all";
  filters.direction = "all";
  filters.minValueUSD = "";
  filters.maxValueUSD = "";
  filters.minFeesUSD = "";
  filters.maxFeesUSD = "";
  filters.startTime = "";
  filters.endTime = "";
  filters.sortBy = "time-desc";
  offset.value = 0;
  void fetchTrades();
}

function handleTradeUpdate(trade: AMMTrade) {
  // Only live-update the first page when sorted by most recent.
  if (offset.value !== 0 || filters.sortBy !== "time-desc") return;

  const apiTrade = convertAMMTrade(trade);
  if (!tradeMatchesFilters(apiTrade)) return;

  const existingIndex = trades.value.findIndex(
    (item) => tradeKey(item) === tradeKey(apiTrade),
  );
  if (existingIndex >= 0) {
    if (
      trades.value[existingIndex].tradeState === "Confirmed" &&
      apiTrade.tradeState === "TxPool"
    ) {
      return;
    }
    const next = [...trades.value];
    next[existingIndex] = apiTrade;
    trades.value = mergeTrades(next).slice(0, fetchSize.value);
    return;
  }

  trades.value = mergeTrades([apiTrade, ...trades.value]).slice(
    0,
    fetchSize.value,
  );
  liveUpdates.value += 1;
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

function createSubscriptionFilter(): SubscriptionFilter {
  const assetIds = [assetId1.value, assetId2.value]
    .filter((value): value is number => value !== null)
    .map((value) => value.toString());
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

async function subscribeToTradeUpdates() {
  await unsubscribeFromTradeUpdates();
  subscriptionFilter = createSubscriptionFilter();
  await signalrService.subscribe(subscriptionFilter);
}

async function unsubscribeFromTradeUpdates() {
  if (!subscriptionFilter) return;
  const filter = subscriptionFilter;
  subscriptionFilter = null;
  await signalrService.unsubscribeFilter(filter);
}

function assetName(assetId?: number | null) {
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

function formatAssetAmount(amount?: number | null, assetId?: number | null) {
  void forceUpdate.value;
  if (
    amount === undefined ||
    amount === null ||
    assetId === undefined ||
    assetId === null
  ) {
    return "-";
  }
  const info = assetService.getAssetInfo(BigInt(assetId));
  if (!info) {
    void assetService.requestAsset(BigInt(assetId), () => {
      forceUpdate.value += 1;
    });
    return t("common.loading");
  }
  const decimals = info.decimals || 0;
  const value = amount / Math.pow(10, decimals);
  const unit = info.unitName || info.name || `${t("common.asset")} ${assetId}`;
  const formatted = new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: Math.min(Math.max(decimals, 2), 8),
  }).format(value);
  return `${formatted} ${unit}`;
}

function pairLabel(trade: Trade) {
  return `${assetName(trade.assetIdIn)} / ${assetName(trade.assetIdOut)}`;
}

function assetImageUrl(assetId?: number | null) {
  return `https://algorand-trades.de-4.biatec.io/api/asset/image/${assetId ?? 0}`;
}

function assetRoute(assetId?: number | null) {
  return {
    name: "AssetDetails",
    params: { assetId: (assetId ?? 0).toString() },
  };
}

function pairRoute(trade: Trade) {
  return {
    name: "TradesByPair",
    params: {
      assetId1: (trade.assetIdIn ?? 0).toString(),
      assetId2: (trade.assetIdOut ?? 0).toString(),
    },
  };
}

function tradeKey(trade: Trade) {
  return [
    trade.txId || trade.topTxId || "pending",
    trade.poolAddress || "pool",
    trade.assetIdIn ?? "in",
    trade.assetIdOut ?? "out",
  ].join(":");
}

function formatTradeState(state?: string | null) {
  if (state === "Confirmed") return t("trades.confirmed");
  if (state === "TxPool") return t("trades.txPool");
  return state || t("common.unknown");
}

function stateBadgeClass(state?: string | null) {
  if (state === "Confirmed") {
    return "rounded bg-green-600/20 px-2 py-1 text-xs text-green-300";
  }
  if (state === "TxPool") {
    return "rounded bg-amber-600/20 px-2 py-1 text-xs text-amber-300";
  }
  return "rounded bg-gray-600/20 px-2 py-1 text-xs text-gray-300";
}

onMounted(async () => {
  syncRouteFilter();
  await fetchTrades();
  signalrService.onTradeReceived(handleTradeUpdate);
  await subscribeToTradeUpdates();
});

onUnmounted(async () => {
  signalrService.unsubscribeFromTradeUpdates(handleTradeUpdate);
  await unsubscribeFromTradeUpdates();
});

watch(
  () => [route.params.assetId1, route.params.assetId2],
  async () => {
    syncRouteFilter();
    filters.direction = "all";
    offset.value = 0;
    await fetchTrades();
    await subscribeToTradeUpdates();
  },
);

watch(fetchSize, async () => {
  offset.value = 0;
  await fetchTrades();
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

.filter-control:focus {
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 2px rgb(59 130 246 / 0.4);
}
</style>
