<template>
  <div
    v-if="cards.length > 0"
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3"
  >
    <div
      v-for="card in cards"
      :key="card.key"
      class="bg-gray-800/60 border border-gray-700 rounded-lg p-3 min-w-0"
    >
      <div class="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-2 truncate">
        {{ card.title }}
      </div>
      <div class="space-y-1.5">
        <div v-if="card.items.length === 0" class="text-xs text-gray-500 px-1 py-0.5">—</div>
        <RouterLink
          v-for="(item, i) in card.items"
          :key="item.assetId"
          :to="`/asset/${item.assetId}`"
          class="flex items-center gap-2 min-w-0 rounded px-1 py-0.5 -mx-1 hover:bg-gray-700/60"
        >
          <span class="text-[10px] text-gray-500 font-mono shrink-0 w-3">{{ i + 1 }}</span>
          <img :src="assetImageUrl(item.assetId ?? 0)" class="w-5 h-5 rounded shrink-0" />
          <span class="text-xs text-white truncate min-w-0 flex-1">
            {{ item.unitName || item.name || "#" + item.assetId }}
          </span>
          <span class="text-xs shrink-0">
            <template v-if="card.metric === 'volume24H'">
              <span class="text-gray-200">
                <FormattedNumber
                  :value="item.volume24HUSD ?? 0"
                  type="currency"
                  compact
                  :minimum-fraction-digits="0"
                  :maximum-fraction-digits="1"
                />
              </span>
            </template>
            <template v-else-if="card.metric === 'volume1H'">
              <span class="text-gray-200">
                <FormattedNumber
                  :value="item.volume1HUSD ?? 0"
                  type="currency"
                  compact
                  :minimum-fraction-digits="0"
                  :maximum-fraction-digits="1"
                />
              </span>
            </template>
            <template v-else-if="card.metric === 'priceChange'">
              <span :class="signClass(item.priceChange24HPercent)">
                {{ formatPercent(item.priceChange24HPercent) }}
              </span>
            </template>
            <template v-else>
              <span :class="signClass(item.tvlChange24HPercent)">
                {{ formatPercent(item.tvlChange24HPercent) }}
              </span>
            </template>
          </span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getAVMTradeReporterAPI } from "../api";
import type { TopAssetItem, TopAssetsResponse } from "../api/models";
import FormattedNumber from "./FormattedNumber.vue";
import { assetImageUrl } from "../config/env";

const { t } = useI18n();

const data = ref<TopAssetsResponse | null>(null);

// The backend recomputes and re-caches these lists every 5 minutes, so poll on
// the same cadence to stay fresh without hammering the API.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | undefined;

type Metric = "volume24H" | "volume1H" | "priceChange" | "tvlChange";

interface Card {
  key: string;
  title: string;
  metric: Metric;
  items: TopAssetItem[];
}

const cards = computed<Card[]>(() => {
  const d = data.value;
  if (!d) return [];
  const defs: Array<[string, Metric, TopAssetItem[] | undefined]> = [
    ["popular", "volume24H", d.popular ?? undefined],
    ["trending", "volume1H", d.trending ?? undefined],
    ["gainers", "priceChange", d.topGainers ?? undefined],
    ["losers", "priceChange", d.topLosers ?? undefined],
    ["valueGainers", "tvlChange", d.topValueGainers ?? undefined],
    ["valueLosers", "tvlChange", d.topValueLosers ?? undefined],
  ];
  // Always render all six boxes so the layout is stable — a list that happens
  // to be empty (e.g. no losers right now) shows a placeholder instead of
  // disappearing.
  return defs.map(([key, metric, items]) => ({
    key,
    metric,
    items: items ?? [],
    title: t(`assets.topLists.${key}`),
  }));
});

function signClass(value: number | null | undefined): string {
  const v = value ?? 0;
  return v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : "text-gray-400";
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return (value > 0 ? "+" : "") + value.toFixed(2) + "%";
}

async function fetchTopAssets() {
  try {
    const res = await getAVMTradeReporterAPI().getApiAssetTop();
    const payload = res as unknown as TopAssetsResponse | { data?: TopAssetsResponse };
    data.value = (payload as { data?: TopAssetsResponse }).data ?? (payload as TopAssetsResponse);
  } catch {
    // Highlights are a non-essential enhancement of the assets page — on API
    // failure simply keep whatever was shown before (or render nothing).
  }
}

onMounted(() => {
  fetchTopAssets();
  refreshTimer = setInterval(fetchTopAssets, REFRESH_INTERVAL_MS);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>
