<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">
        Aggregated pools containing {{ assetName }}
      </h1>
      <div class="flex items-center gap-2 text-sm">
        <button
          class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
          @click="refresh"
        >
          Refresh
        </button>
      </div>
    </div>

    <div class="text-xs text-gray-400">
      Loaded: <span class="text-white">{{ pools.length }}</span>
    </div>

    <div v-if="loading" class="text-gray-400">Loading aggregated pools…</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>

    <div v-else>
      <!-- Desktop header -->
      <div
        class="hidden md:grid md:grid-cols-10 gap-3 px-2 text-xs text-gray-400 mb-2"
      >
        <div>Pair</div>
        <div class="text-right">Pools</div>
        <div class="text-right">Price</div>
        <div class="text-right">Reserve ({{ assetUnitName }})</div>
        <div class="text-right">Other Reserve</div>
        <div class="text-right">Virtual Reserve ({{ assetUnitName }})</div>
        <div class="text-right">Other Virtual Reserve</div>
        <div class="text-right">Total TVL {{ assetUnitName }} USD</div>
        <div class="text-right">Total TVL Other USD</div>
        <div class="text-right">Updated</div>
      </div>
      <div class="space-y-1">
        <div
          v-for="p in pools"
          :key="p.id || `${p.assetIdA}-${p.assetIdB}`"
          class="grid grid-cols-1 md:grid-cols-10 gap-3 items-center p-2 rounded bg-gray-800/40 hover:bg-gray-800/60"
        >
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
              >{{ pairLabel(p) }}</RouterLink
            >
          </div>
          <div class="text-xs text-right text-amber-400">
            {{ p.poolCount ?? "-" }}
          </div>
          <div class="text-xs text-right text-white">
            {{ price(p) }}
          </div>
          <div class="text-xs text-right text-white" :title="'Real Reserve'">
            {{ reserveSelected(p) }}
          </div>
          <div class="text-xs text-right text-white">
            {{ reserveOther(p) }}
          </div>
          <div
            class="text-[10px] text-right text-gray-300"
            :title="'Virtual Reserve'"
          >
            {{ virtualReserveSelected(p) }}
          </div>
          <div
            class="text-[10px] text-right text-gray-300"
            :title="'Virtual Reserve'"
          >
            {{ virtualReserveOther(p) }}
          </div>
          <div class="text-xs text-right text-white">
            {{ totalTVLAUSD(p) }}
          </div>
          <div class="text-xs text-right text-white">
            {{ totalTVLBUSD(p) }}
          </div>
          <div class="text-xs text-right text-gray-400">
            <FormattedTime
              :timestamp="p.lastUpdated || new Date().toISOString()"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { getAVMTradeReporterAPI } from "../api";
import { AggregatedPool } from "../api/models";
import { assetService } from "../services/assetService";
import { signalrService } from "../services/signalrService";
import FormattedTime from "../components/FormattedTime.vue";

interface State {
  assetId: bigint;
  pools: AggregatedPool[];
  loading: boolean;
  error: string;
  forceUpdate: number;
}

const route = useRoute();
const state = reactive<State>({
  assetId: BigInt((route.params.assetId as string) || 0),
  pools: [],
  loading: false,
  error: "",
  forceUpdate: 0,
});

const api = getAVMTradeReporterAPI();

async function fetchAggregatedPools() {
  state.loading = true;
  state.error = "";
  try {
    const asset = Number(state.assetId);
    const size = 1000;
    const [resA, resB] = await Promise.all([
      api.getApiAggregatedPool({ assetIdA: asset, size }),
      api.getApiAggregatedPool({ assetIdB: asset, size }),
    ]);
    const listA = (resA.data as AggregatedPool[]) || [];
    const listB = (resB.data as AggregatedPool[]) || [];
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
    listB.forEach(normalizeAndStore);

    let merged = Array.from(map.values());
    // Sort by selected asset reserve descending (tvL_A since selected asset is assetIdA in all entries)
    merged.sort((a, b) => (b.tvL_A || 0) - (a.tvL_A || 0));
    state.pools = merged;

    // Subscribe to updates for these aggregated pools
    const aggIds = state.pools
      .map((p) => p.id)
      .filter((id) => !!id) as string[];
    signalrService.subscribe({
      PoolsAddresses: [],
      AggregatedPoolsIds: aggIds,
      AssetIds: [state.assetId.toString()],
      MainAggregatedPools: false,
      RecentAggregatedPool: false,
      RecentBlocks: false,
      RecentLiquidity: false,
      RecentAssets: false,
      RecentPool: false,
      RecentTrades: false,
    });
  } catch (e: any) {
    state.error = e?.message || "Failed to load aggregated pools";
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
  // Replace if exists else push
  const idx = state.pools.findIndex(
    (x) =>
      (x.assetIdA === pool.assetIdA && x.assetIdB === pool.assetIdB) ||
      (x.assetIdA === pool.assetIdB && x.assetIdB === pool.assetIdA)
  );
  if (idx >= 0) {
    state.pools[idx] = pool;
  } else {
    state.pools.push(pool);
  }
  // Resort
  state.pools.sort((a, b) => (b.tvL_A || 0) - (a.tvL_A || 0));
}

function refresh() {
  fetchAggregatedPools();
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
    `Asset ${state.assetId}`
);
const assetUnitName = computed(
  () => assetInfo.value?.unitName || assetInfo.value?.name || "-"
);

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
    false
  );
}
function virtualReserveOther(p: AggregatedPool) {
  if (p.virtualSumB === undefined || p.assetIdB === undefined) return "-";
  return assetService.formatAssetBalance(
    p.virtualSumB,
    BigInt(p.assetIdB),
    false
  );
}
function price(p: AggregatedPool) {
  if (p.assetIdA === undefined || p.assetIdB === undefined) return "-";
  if (p.virtualSumA === undefined || p.virtualSumB === undefined) return "-";
  return assetService.formatPairBalance(
    p.virtualSumA || 0,
    BigInt(p.assetIdA),
    p.virtualSumB || 0,
    BigInt(p.assetIdB),
    false
  );
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
  return `https://algorand-trades.de-4.biatec.io/api/asset/image/${id}`;
}
function otherAssetUnitName(p: AggregatedPool) {
  const other = otherAssetInfo(p);
  return other?.unitName || other?.name || p.assetIdB;
}

watch(
  () => route.params.assetId,
  (val) => {
    state.assetId = BigInt((val as string) || 0);
    fetchAggregatedPools();
  }
);

onMounted(async () => {
  signalrService.onAggregatedPoolReceived(aggregatedPoolUpdateEvent);
  await fetchAggregatedPools();
});
onUnmounted(() => {
  signalrService.unsubscribeFromAggregatedPoolUpdates(
    aggregatedPoolUpdateEvent
  );
  signalrService.unsubscribe();
});

const pools = computed(() => state.pools);
const loading = computed(() => state.loading);
const error = computed(() => state.error);
const selectedAsset = computed(() => state.assetId.toString());
</script>

<style scoped></style>
