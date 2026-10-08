<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">
        <i18n-t keypath="aggregatedPools.title" tag="span" scope="global">
          <template #assetName>
            <router-link
              :to="`/asset/${state.assetId.toString()}`"
              class="text-white hover:text-blue-300 transition-colors underline decoration-dotted"
            >
              {{ assetName }}
            </router-link>
          </template>
        </i18n-t>
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
      <span class="text-white" data-testid="loaded-count">{{ pools.length }}</span>
    </div>

    <div v-if="loading" class="text-gray-400">
      {{ $t("aggregatedPools.loadingPools") }}
    </div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>

    <div v-else ref="tableWrapEl">
      <DataTable
        :table-columns="tableColumns"
        :rows="pagePools"
        :row-key="poolKey"
        :sort-fns="sortFns"
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

        <template #cell-pairPrice7DChart="{ row: p }">
          <PairSparkline
            v-if="
              p.assetIdA !== undefined &&
              p.assetIdA !== null &&
              p.assetIdB !== undefined &&
              p.assetIdB !== null
            "
            :base-asset-id="p.assetIdA"
            :quote-asset-id="p.assetIdB"
            :label="t('aggregatedPools.pairPrice7DChart')"
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

      <div ref="paginationEl" class="mt-3">
        <PaginationControls
          :page="page"
          :page-size="pageSize"
          :total="pools.length"
          :page-size-options="PAGE_SIZE_OPTIONS"
          :auto-page-size="autoPageSize"
          @update:page="setPage"
          @update:page-size="setPageSize"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted, watch, ref, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getAVMTradeReporterAPI } from "../api";
import { AggregatedPool } from "../api/models";
import { assetService } from "../services/assetService";
import { signalrService } from "../services/signalrService";
import FormattedTime from "../components/FormattedTime.vue";
import FormattedNumber from "../components/FormattedNumber.vue";
import DataTable from "../components/table/DataTable.vue";
import ColumnSettingsPanel from "../components/table/ColumnSettingsPanel.vue";
import PaginationControls from "../components/table/PaginationControls.vue";
import PairSparkline from "../components/table/PairSparkline.vue";
import { useI18n } from "vue-i18n";
import { useTableColumns, sortRows, type ColumnDef } from "../composables/useTableColumns";
import { aggregatedPoolSpotPrice } from "../utils/poolPrice";
import { assetImageUrl as sharedAssetImageUrl } from "../config/env";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  clampPage,
  fitRowCount,
  pageSlice,
  parsePage,
  parsePageSize,
} from "../utils/pagination";
import { buildPageSubscription, pairKey, poolKey } from "../utils/aggregatedPoolSubscription";

const { t } = useI18n();

interface State {
  assetId: bigint;
  pools: AggregatedPool[];
  loading: boolean;
  error: string;
  forceUpdate: number;
}

const route = useRoute();
const router = useRouter();
const state = reactive<State>({
  assetId: BigInt((route.params.assetId as string) || 0),
  pools: [],
  loading: false,
  error: "",
  forceUpdate: 0,
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
    key: "pairPrice7DChart",
    labelKey: "aggregatedPools.pairPrice7DChart",
    align: "right",
    descriptionKey: "aggregatedPools.pairPrice7DChartHelp",
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

async function fetchAggregatedPools() {
  state.loading = true;
  state.error = "";
  try {
    const asset = Number(state.assetId);
    // The backend has no sort parameter and truncates to `size` in no
    // meaningful order, so a capped fetch returns an arbitrary subset (ALGO
    // has 3500+ pairs and e.g. Vote/ALGO — #19 by reserve — was missing from
    // an arbitrary first-1000 slice). Fetch every pair and sort/paginate
    // client-side. The `assetIdA` filter matches the asset on either side of
    // the pair server-side, so one request suffices — a second `assetIdB`
    // query returns the identical set.
    // TODO: fetch a server-sorted page directly once AVMTradeReporter
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
    // Only one page of rows is ever rendered (see pagePools), so keeping the
    // full set is cheap; the subscription follows the page, not this list.
    state.pools = merged;
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
  // Only update pools on the current page: those are the only ones subscribed.
  if (!pagePairKeys.value.has(pairKey(pool))) return;
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

// ---- Pagination (URL-backed) & page-scoped subscription ----
// A valid ?pageSize= pins the size; otherwise the size is "auto": as many rows
// as fit the viewport without scrolling, measured from the rendered layout.
const pinnedPageSize = computed(() => parsePageSize(route.query.pageSize, 0) || null);
const autoPageSize = ref<number | null>(null);
// Until the first measurement there is no rendered row to measure from.
const pageSize = computed(() => pinnedPageSize.value ?? autoPageSize.value ?? DEFAULT_PAGE_SIZE);
// Clamped so a stale/hand-edited ?page= beyond the end shows the last page.
const page = computed(() => clampPage(parsePage(route.query.page), state.pools.length, pageSize.value));

// Sort the whole set first, then slice: sorting is global, not per page.
const sortedPools = computed(() => sortRows(state.pools, tableColumns.sortState.value, sortFns));
const pagePools = computed(() => pageSlice(sortedPools.value, page.value, pageSize.value));
const pagePairKeys = computed(() => new Set(pagePools.value.map(pairKey)));

function setPage(next: number) {
  router.push({ query: { ...route.query, page: next > 1 ? String(next) : undefined } });
  window.scrollTo({ top: 0 });
}

function setPageSize(next: number | null) {
  // A different size invalidates the page number, so go back to the first page.
  // null = back to auto, which is represented by the absence of ?pageSize=.
  router.push({
    query: { ...route.query, pageSize: next === null ? undefined : String(next), page: undefined },
  });
}

// ---- Auto page size: fit the rows to the viewport (like the Assets page) ----
const tableWrapEl = ref<HTMLElement | null>(null);
const paginationEl = ref<HTMLElement | null>(null);

// Measures the real rendered rows and pagination bar instead of assuming
// pixel offsets (navbar height, row height and card layout differ per
// breakpoint). Keeps the previous value when nothing is measurable.
function measureAutoPageSize() {
  const container = tableWrapEl.value?.querySelector<HTMLElement>(".space-y-1");
  if (!container) return;
  const rows = Array.from(container.children) as HTMLElement[];
  if (rows.length < 2) return;
  const first = rows[0].getBoundingClientRect();
  const last = rows[rows.length - 1].getBoundingClientRect();
  // Everything below the last row: the pagination bar plus whatever padding
  // the page keeps under it (measured, not assumed).
  const paginationBottom = paginationEl.value?.getBoundingClientRect().bottom ?? last.bottom;
  // (<main> wraps the content only; the document itself can be stretched to the viewport.)
  const mainBottom = tableWrapEl.value?.closest("main")?.getBoundingClientRect().bottom ?? paginationBottom;
  const pageBottomGap = Math.max(0, mainBottom - paginationBottom);
  const footerHeight = Math.max(0, paginationBottom - last.bottom) + pageBottomGap;
  const fit = fitRowCount({
    viewportHeight: window.innerHeight,
    tableTop: container.getBoundingClientRect().top + window.scrollY,
    rowHeight: rows[1].getBoundingClientRect().top - first.top,
    footerHeight,
    min: 1, // a tall mobile card may leave room for just one or two rows
  });
  if (fit !== null) autoPageSize.value = fit;
}

let measureFrame: number | null = null;
function scheduleMeasure() {
  if (measureFrame !== null) return;
  measureFrame = window.requestAnimationFrame(() => {
    measureFrame = null;
    measureAutoPageSize();
  });
}

let subscriptionDebounce: number | null = null;
let lastSubscriptionSignature = "";

function scheduleSubscriptionUpdate() {
  if (subscriptionDebounce) window.clearTimeout(subscriptionDebounce);
  subscriptionDebounce = window.setTimeout(updateSubscription, 300);
}

function updateSubscription() {
  subscriptionDebounce = null;
  const { filter, signature } = buildPageSubscription(state.assetId.toString(), pagePools.value);
  if (signature === lastSubscriptionSignature) return; // no change
  lastSubscriptionSignature = signature;
  signalrService.subscribe(filter);
}

// Re-subscribe whenever the set of pairs on screen changes (page, page size,
// sort, asset, or the data arriving).
watch(pagePools, scheduleSubscriptionUpdate);

// Row height (card vs grid layout) depends on the visible columns, and the
// table only exists once loading finished.
watch(
  () => [state.loading, tableColumns.visibleOrderedColumns.value.length],
  () => nextTick(scheduleMeasure),
);

watch(
  () => route.params.assetId,
  (val) => {
    state.assetId = BigInt((val as string) || 0);
    state.pools = [];
    fetchAggregatedPools();
  },
);

onMounted(async () => {
  window.addEventListener("resize", scheduleMeasure);
  signalrService.onAggregatedPoolReceived(aggregatedPoolUpdateEvent);
  await fetchAggregatedPools();
});
onUnmounted(() => {
  window.removeEventListener("resize", scheduleMeasure);
  if (measureFrame !== null) window.cancelAnimationFrame(measureFrame);
  // A pending debounced subscribe must not fire after the page is gone.
  if (subscriptionDebounce) window.clearTimeout(subscriptionDebounce);
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
