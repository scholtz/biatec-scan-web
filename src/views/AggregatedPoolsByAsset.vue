<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">
        {{ $t("aggregatedPools.title", { assetName }) }}
      </h1>
      <div class="flex items-center gap-2 text-sm">
        <button
          class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
          @click="refresh"
        >
          {{ $t("aggregatedPools.refresh") }}
        </button>
        <ColumnSettingsPanel :columns="tableColumns" :column-labels="columnLabels" />
      </div>
    </div>

    <div class="text-xs text-gray-400">
      {{ $t("aggregatedPools.loaded") }}:
      <span class="text-white">{{ pools.length }}</span>
    </div>

    <div v-if="loading" class="text-gray-400">
      {{ $t("aggregatedPools.loadingPools") }}
    </div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>

    <div v-else>
      <DataTable
        :table-columns="tableColumns"
        :rows="pools"
        :row-key="poolKey"
        :sort-fns="sortFns"
        :on-visibility-change="handleVisibility"
        :column-labels="columnLabels"
        :on-row-click="(p: AggregatedPool) => goToPools(p)"
      >
        <template #cell-pair="{ row: p }">
          <div class="flex items-center gap-2 text-sm text-white truncate">
            <div class="flex -space-x-2">
              <img
                :src="assetImageUrl(p.assetIdA)"
                class="w-6 h-6 rounded border border-gray-700 bg-gray-900"
                :alt="assetUnitName"
              />
              <img
                :src="assetImageUrl(p.assetIdB)"
                class="w-6 h-6 rounded border border-gray-700 bg-gray-900"
                :alt="String(otherAssetUnitName(p))"
              />
            </div>
            <RouterLink
              :to="`/pools/${selectedAsset}/${p.assetIdB}`"
              class="font-mono text-blue-100 hover:text-blue-300"
              @click.stop
              >{{ pairLabel(p) }}</RouterLink
            >
          </div>
        </template>

        <template #cell-pools="{ row: p }">
          <span class="text-amber-400">{{ p.poolCount ?? "-" }}</span>
        </template>

        <template #cell-price="{ row: p }">
          {{ price(p) }}
        </template>

        <template #cell-otherPrice7DChart="{ row: p }">
          <AssetSparkline
            v-if="p.assetIdB !== undefined && p.assetIdB !== null"
            :asset-id="p.assetIdB"
            series="price"
            :label="t('aggregatedPools.otherPrice7DChart')"
          />
          <template v-else>-</template>
        </template>

        <template #cell-otherTvl7DChart="{ row: p }">
          <AssetSparkline
            v-if="p.assetIdB !== undefined && p.assetIdB !== null"
            :asset-id="p.assetIdB"
            series="tvl"
            :label="t('aggregatedPools.otherTvl7DChart')"
          />
          <template v-else>-</template>
        </template>

        <template #cell-reserve="{ row: p }">
          <RouterLink
            :to="{
              name: 'PoolsByAssets',
              params: { asset1: p.assetIdA, asset2: p.assetIdB },
            }"
            class="font-mono text-blue-100 hover:text-blue-300"
            title="Real Reserve"
            @click.stop
          >
            {{ reserveSelected(p) }}
          </RouterLink>
        </template>

        <template #cell-otherReserve="{ row: p }">
          <RouterLink
            :to="{
              name: 'AggregatedPoolsByAsset',
              params: { assetId: p.assetIdB },
            }"
            class="font-mono text-blue-100 hover:text-blue-300"
            @click.stop
          >
            {{ reserveOther(p) }}
          </RouterLink>
        </template>

        <template #cell-virtualReserve="{ row: p }">
          <span class="text-gray-300" title="Virtual Reserve">{{ virtualReserveSelected(p) }}</span>
        </template>

        <template #cell-otherVirtualReserve="{ row: p }">
          <span class="text-gray-300" title="Virtual Reserve">{{ virtualReserveOther(p) }}</span>
        </template>

        <template #cell-totalTvlUsd="{ row: p }">
          {{ totalTVLAUSD(p) }}
        </template>

        <template #cell-totalTvlOtherUsd="{ row: p }">
          {{ totalTVLBUSD(p) }}
        </template>

        <template #cell-volume24H="{ row: p }">
          <template v-if="p.volume24H === undefined || p.volume24H === null">-</template>
          <template v-else>
            <FormattedNumber
              :value="p.volume24H"
              type="currency"
              :maximum-fraction-digits="2"
              :small-threshold="0.01"
              :significant-digits="4"
            />
          </template>
        </template>

        <template #cell-updated="{ row: p }">
          <FormattedTime :timestamp="p.lastUpdated || new Date().toISOString()" />
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getAVMTradeReporterAPI } from "../api";
import { AggregatedPool } from "../api/models";
import { assetService } from "../services/assetService";
import { signalrService } from "../services/signalrService";
import FormattedTime from "../components/FormattedTime.vue";
import FormattedNumber from "../components/FormattedNumber.vue";
import DataTable from "../components/table/DataTable.vue";
import ColumnSettingsPanel from "../components/table/ColumnSettingsPanel.vue";
import AssetSparkline from "../components/table/AssetSparkline.vue";
import { useI18n } from "vue-i18n";
import { useTableColumns, type ColumnDef } from "../composables/useTableColumns";
import { aggregatedPoolSpotPrice } from "../utils/poolPrice";
import { assetImageUrl as sharedAssetImageUrl } from "../config/env";

const { t } = useI18n();

interface State {
  assetId: bigint;
  pools: AggregatedPool[];
  loading: boolean;
  error: string;
  forceUpdate: number;
  visibleIds: Set<string>; // aggregated pool ids currently visible
}

const route = useRoute();
const router = useRouter();
const state = reactive<State>({
  assetId: BigInt((route.params.assetId as string) || 0),
  pools: [],
  loading: false,
  error: "",
  forceUpdate: 0,
  visibleIds: new Set<string>(),
});

const api = getAVMTradeReporterAPI();

const aggregatedPoolColumns: ColumnDef[] = [
  { key: "pair", labelKey: "aggregatedPools.pair", pinned: true, descriptionKey: "aggregatedPools.pairHelp" },
  {
    key: "pools",
    labelKey: "aggregatedPools.pools",
    align: "right",
    sortable: true,
    descriptionKey: "aggregatedPools.poolsHelp",
  },
  { key: "price", labelKey: "aggregatedPools.price", align: "right", descriptionKey: "aggregatedPools.priceHelp" },
  {
    key: "otherPrice7DChart",
    labelKey: "aggregatedPools.otherPrice7DChart",
    align: "right",
    descriptionKey: "aggregatedPools.otherPrice7DChartHelp",
    defaultTier: "lg",
  },
  {
    key: "otherTvl7DChart",
    labelKey: "aggregatedPools.otherTvl7DChart",
    align: "right",
    descriptionKey: "aggregatedPools.otherTvl7DChartHelp",
    defaultTier: "lg",
  },
  {
    key: "reserve",
    labelKey: "aggregatedPools.reserve",
    align: "right",
    sortable: true,
    descriptionKey: "aggregatedPools.reserveHelp",
  },
  {
    key: "otherReserve",
    labelKey: "aggregatedPools.otherReserve",
    align: "right",
    sortable: true,
    descriptionKey: "aggregatedPools.otherReserveHelp",
  },
  {
    key: "virtualReserve",
    labelKey: "aggregatedPools.virtualReserve",
    align: "right",
    sortable: true,
    descriptionKey: "aggregatedPools.virtualReserveHelp",
    defaultVisible: false,
  },
  {
    key: "otherVirtualReserve",
    labelKey: "aggregatedPools.otherVirtualReserve",
    align: "right",
    sortable: true,
    descriptionKey: "aggregatedPools.otherVirtualReserveHelp",
    defaultVisible: false,
  },
  {
    key: "totalTvlUsd",
    labelKey: "aggregatedPools.totalTvlUsd",
    align: "right",
    sortable: true,
    descriptionKey: "aggregatedPools.totalTvlUsdHelp",
  },
  {
    key: "totalTvlOtherUsd",
    labelKey: "aggregatedPools.totalTvlOtherUsd",
    align: "right",
    sortable: true,
    descriptionKey: "aggregatedPools.totalTvlOtherUsdHelp",
    defaultTier: "lg",
  },
  {
    key: "volume24H",
    labelKey: "aggregatedPools.volume24H",
    align: "right",
    sortable: true,
    descriptionKey: "aggregatedPools.volume24HHelp",
  },
  {
    key: "updated",
    labelKey: "aggregatedPools.updated",
    align: "right",
    sortable: true,
    descriptionKey: "aggregatedPools.updatedHelp",
    defaultTier: "lg",
  },
];

const tableColumns = useTableColumns("aggregated-pools", aggregatedPoolColumns);

const sortFns: Partial<Record<string, (p: AggregatedPool) => number | string>> = {
  pools: (p) => p.poolCount ?? Number.NEGATIVE_INFINITY,
  reserve: (p) => p.tvL_A ?? Number.NEGATIVE_INFINITY,
  otherReserve: (p) => p.tvL_B ?? Number.NEGATIVE_INFINITY,
  virtualReserve: (p) => p.virtualSumA ?? Number.NEGATIVE_INFINITY,
  otherVirtualReserve: (p) => p.virtualSumB ?? Number.NEGATIVE_INFINITY,
  totalTvlUsd: (p) => p.totalTVLAssetAInUSD ?? Number.NEGATIVE_INFINITY,
  totalTvlOtherUsd: (p) => p.totalTVLAssetBInUSD ?? Number.NEGATIVE_INFINITY,
  volume24H: (p) => p.volume24H ?? Number.NEGATIVE_INFINITY,
  updated: (p) => p.lastUpdated ?? "",
};

// Show at most this many pairs, picked by highest reserve after fetching the
// full set (the backend can't sort, so the top-N must be computed client-side).
const MAX_DISPLAYED_PAIRS = 1000;

async function fetchAggregatedPools() {
  state.loading = true;
  state.error = "";
  try {
    const asset = Number(state.assetId);
    // The backend has no sort parameter and truncates to `size` in no
    // meaningful order, so a capped fetch returns an arbitrary subset (ALGO
    // has 3500+ pairs and e.g. Vote/ALGO — #19 by reserve — was missing from
    // an arbitrary first-1000 slice). Fetch every pair, then keep only the
    // top MAX_DISPLAYED_PAIRS by reserve below. The `assetIdA` filter matches
    // the asset on either side of the pair server-side, so one request
    // suffices — a second `assetIdB` query returns the identical set.
    // TODO: fetch a server-sorted top-N directly once AVMTradeReporter
    // supports ordering (scholtz/AVMTradeReporter#18).
    const res = await api.getApiAggregatedPool({ assetIdA: asset, size: 10000 });
    const listA = (res.data as AggregatedPool[]) || [];
    const map = new Map<string, AggregatedPool>();
    const selected = BigInt(asset);

    function normalizeAndStore(p: AggregatedPool) {
      if (p.assetIdA === undefined || p.assetIdB === undefined) return;
      // Ensure selected asset is always assetIdA in stored version for consistent display
      let pool = p;
      if (BigInt(p.assetIdA) !== selected && BigInt(p.assetIdB) === selected) {
        pool = assetService.reverseAggregatedPool(p);
      }
      const key = `${Math.min(pool.assetIdA ?? 0, pool.assetIdB ?? 0)}-${Math.max(pool.assetIdA ?? 0, pool.assetIdB ?? 0)}`;
      // Keep the one with latest update if duplicate
      if (!map.has(key)) {
        map.set(key, pool);
      } else {
        const existing = map.get(key)!;
        if ((pool.lastUpdated || "") > (existing.lastUpdated || "")) {
          map.set(key, pool);
        }
      }
    }

    listA.forEach(normalizeAndStore);

    let merged = Array.from(map.values());
    // Default sort by selected asset reserve descending; overridden by user's chosen column sort.
    merged.sort((a, b) => (b.tvL_A || 0) - (a.tvL_A || 0));
    // Cap what we keep/render: 3500+ rows of this table (images, links,
    // per-row IntersectionObserver, asset-info lookups) freeze the page.
    state.pools = merged.slice(0, MAX_DISPLAYED_PAIRS);

    // Initial subscription (asset scoped) – we'll refine to visible shortly
    scheduleSubscriptionUpdate();
  } catch (e: unknown) {
    state.error =
      e instanceof Error ? e.message : "Failed to load aggregated pools";
  } finally {
    state.loading = false;
  }
}

function aggregatedPoolUpdateEvent(p: AggregatedPool) {
  if (p.assetIdA === undefined || p.assetIdB === undefined) return;
  const selected = state.assetId;
  // Only consider pools containing selected asset
  if (BigInt(p.assetIdA) !== selected && BigInt(p.assetIdB) !== selected)
    return;
  let pool = p;
  if (BigInt(p.assetIdA) !== selected && BigInt(p.assetIdB) === selected) {
    pool = assetService.reverseAggregatedPool(p);
  }
  // Only update if pool is visible (as requested)
  const key = poolKey(pool);
  if (!state.visibleIds.has(key)) return;
  // Replace if exists else push
  const idx = state.pools.findIndex(
    (x) =>
      (x.assetIdA === pool.assetIdA && x.assetIdB === pool.assetIdB) ||
      (x.assetIdA === pool.assetIdB && x.assetIdB === pool.assetIdA),
  );
  if (idx >= 0) {
    state.pools[idx] = pool;
  } else {
    state.pools.push(pool);
  }
  // Resort using default ordering; if the user picked a column sort, DataTable re-sorts on top of this.
  state.pools.sort((a, b) => (b.tvL_A || 0) - (a.tvL_A || 0));
}

function refresh() {
  fetchAggregatedPools();
}

// Clicking a pair row opens the individual pools for that asset pair.
function goToPools(p: AggregatedPool) {
  router.push(`/pools/${state.assetId.toString()}/${p.assetIdB}`);
}

// Asset name / unit helpers
function ensureAssetLoaded(assetId: bigint) {
  void state.forceUpdate;
  const info = assetService.getAssetInfo(assetId);
  if (!info) {
    assetService.requestAsset(assetId, () => state.forceUpdate++);
  }
  return info;
}

const assetInfo = computed(() => ensureAssetLoaded(state.assetId));
const assetName = computed(
  () =>
    assetInfo.value?.unitName ||
    assetInfo.value?.name ||
    `Asset ${state.assetId}`,
);
const assetUnitName = computed(
  () => assetInfo.value?.unitName || assetInfo.value?.name || "-",
);

// Column headers that need the selected asset's unit name interpolated at runtime
// (e.g. "Reserve (ALGO)") can't be resolved from a static i18n key alone.
const columnLabels = computed(() => ({
  reserve: t("aggregatedPools.reserve", { unitName: assetUnitName.value }),
  virtualReserve: t("aggregatedPools.virtualReserve", { unitName: assetUnitName.value }),
  totalTvlUsd: t("aggregatedPools.totalTvlUsd", { unitName: assetUnitName.value }),
}));

function otherAssetInfo(p: AggregatedPool) {
  if (p.assetIdB === undefined || p.assetIdB === null) return null;
  return ensureAssetLoaded(BigInt(p.assetIdB));
}

function pairLabel(p: AggregatedPool) {
  const other = otherAssetInfo(p);
  const otherName = other?.unitName || other?.name || p.assetIdB;
  return `${assetUnitName.value}/${otherName}`;
}

function reserveSelected(p: AggregatedPool) {
  if (p.tvL_A === undefined || p.assetIdA === undefined) return "-";
  return assetService.formatAssetBalance(p.tvL_A, BigInt(p.assetIdA), false);
}
function reserveOther(p: AggregatedPool) {
  if (p.tvL_B === undefined || p.assetIdB === undefined) return "-";
  return assetService.formatAssetBalance(p.tvL_B, BigInt(p.assetIdB), false);
}
function virtualReserveSelected(p: AggregatedPool) {
  if (p.virtualSumA === undefined || p.assetIdA === undefined) return "-";
  return assetService.formatAssetBalance(
    p.virtualSumA,
    BigInt(p.assetIdA),
    false,
  );
}
function virtualReserveOther(p: AggregatedPool) {
  if (p.virtualSumB === undefined || p.assetIdB === undefined) return "-";
  return assetService.formatAssetBalance(
    p.virtualSumB,
    BigInt(p.assetIdB),
    false,
  );
}
function price(p: AggregatedPool) {
  if (p.assetIdA === undefined || p.assetIdB === undefined) return "-";
  const spot = aggregatedPoolSpotPrice(p);
  if (spot === undefined) return "-";
  return assetService.formatPairBalanceWithRealValue(spot, p.assetIdA, p.assetIdB);
}
function totalTVLAUSD(p: AggregatedPool) {
  if (p.totalTVLAssetAInUSD === undefined || p.totalTVLAssetAInUSD === null)
    return "-";
  return p.totalTVLAssetAInUSD.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function totalTVLBUSD(p: AggregatedPool) {
  if (p.totalTVLAssetBInUSD === undefined || p.totalTVLAssetBInUSD === null)
    return "-";
  return p.totalTVLAssetBInUSD.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function assetImageUrl(id?: number) {
  if (id === undefined || id === null) return "";
  return sharedAssetImageUrl(id);
}
function otherAssetUnitName(p: AggregatedPool) {
  const other = otherAssetInfo(p);
  return other?.unitName || other?.name || p.assetIdB;
}

// ---- Visibility tracking & dynamic subscription ----
let subscriptionDebounce: number | null = null;
let lastSubscriptionSignature = "";

function poolKey(p: AggregatedPool): string {
  return (
    p.id ||
    `${Math.min(p.assetIdA ?? 0, p.assetIdB ?? 0)}-${Math.max(p.assetIdA ?? 0, p.assetIdB ?? 0)}`
  );
}

function handleVisibility(id: string, isVisible: boolean) {
  if (isVisible) state.visibleIds.add(id);
  else state.visibleIds.delete(id);
  scheduleSubscriptionUpdate();
}

function scheduleSubscriptionUpdate() {
  if (subscriptionDebounce) window.clearTimeout(subscriptionDebounce);
  subscriptionDebounce = window.setTimeout(updateSubscription, 300);
}

function updateSubscription() {
  const ids = Array.from(state.visibleIds.values());
  // Always include assetId to allow discovery of newly visible pools; we only apply updates if visible anyway
  const payload = {
    PoolsAddresses: [] as string[],
    AggregatedPoolsIds: ids,
    AssetIds: [state.assetId.toString()],
    MainAggregatedPools: false,
    RecentAggregatedPool: false,
    RecentBlocks: false,
    RecentLiquidity: false,
    RecentAssets: false,
    RecentPool: false,
    RecentTrades: false,
  };
  const signature = JSON.stringify({
    ids: ids.sort(),
    asset: state.assetId.toString(),
  });
  if (signature === lastSubscriptionSignature) return; // no change
  lastSubscriptionSignature = signature;
  signalrService.subscribe(payload);
}

watch(
  () => route.params.assetId,
  (val) => {
    state.assetId = BigInt((val as string) || 0);
    fetchAggregatedPools();
  },
);

onMounted(async () => {
  signalrService.onAggregatedPoolReceived(aggregatedPoolUpdateEvent);
  await fetchAggregatedPools();
});
onUnmounted(() => {
  signalrService.unsubscribeFromAggregatedPoolUpdates(
    aggregatedPoolUpdateEvent,
  );
  signalrService.unsubscribe();
});

const pools = computed(() => state.pools);
const loading = computed(() => state.loading);
const error = computed(() => state.error);
const selectedAsset = computed(() => state.assetId.toString());
</script>

<style scoped></style>
