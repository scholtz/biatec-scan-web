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
      <div class="flex items-center gap-1.5 mb-2 min-w-0">
        <div class="text-[11px] uppercase tracking-wide text-gray-400 font-semibold truncate min-w-0">
          {{ card.title }}
        </div>
        <HelpTooltip :text="card.help" class="shrink-0" />
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
            {{ item.name || item.unitName || "#" + item.assetId }}
          </span>
          <HelpTooltip
            :text="changeTooltip(card.metric, item)"
            align="right"
            class="shrink-0"
          >
            <span class="text-xs" :class="signClass(changePercent(card.metric, item))">
              {{ formatPercent(changePercent(card.metric, item)) }}
            </span>
          </HelpTooltip>
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
import HelpTooltip from "./HelpTooltip.vue";
import { assetImageUrl } from "../config/env";

const { t, locale } = useI18n();

const data = ref<TopAssetsResponse | null>(null);

// The backend recomputes and re-caches these lists every 5 minutes, so poll on
// the same cadence to stay fresh without hammering the API.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | undefined;

// Popular/trending are *ranked* by 24h/1h trade volume server-side, but both
// display the asset's 24h price change percentage. The raw volume and price
// data are surfaced in their tooltip; the other boxes display price /
// real-TVL change percentages.
type Metric = "volume24H" | "volume1H" | "priceChange" | "tvlChange";

interface Card {
  key: string;
  title: string;
  help: string;
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
    help: t(`assets.topListsHelp.${key}`),
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

function changePercent(metric: Metric, item: TopAssetItem): number | null | undefined {
  switch (metric) {
    case "volume24H":
    case "volume1H":
    case "priceChange":
      return item.priceChange24HPercent;
    case "tvlChange":
      return item.tvlChange24HPercent;
  }
}

function fmtUsdCompact(value: number): string {
  return new Intl.NumberFormat(locale.value, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function fmtPrice(value: number): string {
  return new Intl.NumberFormat(locale.value, {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: 6,
  }).format(value);
}

// "15:35" for 1h windows, "Aug 8, 15:35" for 24h windows (locale-aware).
function fmtTime(date: Date, withDate: boolean): string {
  return new Intl.DateTimeFormat(
    locale.value,
    withDate
      ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
      : { hour: "2-digit", minute: "2-digit" },
  ).format(date);
}

// Native title tooltip explaining the percentage: the compared time window and the
// real values of the previous and current period.
function changeTooltip(metric: Metric, item: TopAssetItem): string {
  const generatedAt = data.value?.generatedAt ? new Date(data.value.generatedAt) : new Date();
  const hourMs = 3_600_000;
  // The volume window matches the card's ranking (1h for trending, 24h for
  // popular); price/TVL comparisons are always over the past 24 hours.
  const windowParams = (windowHours: 1 | 24) => {
    const withDate = windowHours === 24;
    return {
      from: fmtTime(new Date(generatedAt.getTime() - windowHours * hourMs), withDate),
      to: fmtTime(generatedAt, withDate),
    };
  };
  const params24h = windowParams(24);
  const volume1hText = () =>
    item.volume1HUSDPrev === null || item.volume1HUSDPrev === undefined
      ? ""
      : t("assets.topListsTooltip.volumeChange", {
          ...windowParams(1),
          prev: fmtUsdCompact(item.volume1HUSDPrev),
          curr: fmtUsdCompact(item.volume1HUSD ?? 0),
        });
  const volume24hText = () =>
    item.volume24HUSDPrev === null || item.volume24HUSDPrev === undefined
      ? ""
      : t("assets.topListsTooltip.volumeChange", {
          ...params24h,
          prev: fmtUsdCompact(item.volume24HUSDPrev),
          curr: fmtUsdCompact(item.volume24HUSD ?? 0),
        });
  const priceText = () =>
    item.priceUSD24H === null || item.priceUSD24H === undefined
      ? ""
      : t("assets.topListsTooltip.priceChange", {
          ...params24h,
          prev: fmtPrice(item.priceUSD24H),
          curr: fmtPrice(item.priceUSD ?? 0),
        });
  switch (metric) {
    case "volume1H":
      // Trending: ranked by 1h volume but showing the 24h price change — surface both raw datasets.
      return [volume1hText(), priceText()].filter((s) => s !== "").join("\n");
    case "volume24H":
      // Popular: ranked by 24h volume but showing the 24h price change — surface both raw datasets.
      return [volume24hText(), priceText()].filter((s) => s !== "").join("\n");
    case "priceChange":
      return priceText();
    case "tvlChange":
      if (item.realTVLUSD24H === null || item.realTVLUSD24H === undefined) return "";
      return t("assets.topListsTooltip.tvlChange", {
        ...params24h,
        prev: fmtUsdCompact(item.realTVLUSD24H),
        curr: fmtUsdCompact(item.realTVLUSD ?? 0),
      });
  }
}

async function fetchTopAssets() {
  try {
    const res = await getAVMTradeReporterAPI().getApiAssetTop();
    data.value = res.data;
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
