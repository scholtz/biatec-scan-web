<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-semibold text-white">
      Pools for {{ asset1Name }} / {{ asset2Name }}
    </h1>

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <span>Showing up to {{ state.size }} pools</span>
      <button
        class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs transition-colors"
        @click="refresh"
      >
        Refresh
      </button>
    </div>

    <!-- Aggregated Pool Summary -->
    <div class="card" v-if="state.aggregated">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-xs text-gray-400">Aggregated</div>
          <div class="text-lg text-white">{{ aggregatedPrice }}</div>
          <div class="text-xs text-gray-400">
            Price {{ asset1Name }}/{{ asset2Name }}
          </div>
        </div>
        <div class="text-right text-xs text-gray-400">
          <div>Updated</div>
          <FormattedTime
            :timestamp="state.aggregated.lastUpdated || Date.now().toString()"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        <div>
          <div class="text-xs text-gray-400">Total Reserve A</div>
          <div class="text-white">{{ aggregatedReserveA }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400">Total Reserve B</div>
          <div class="text-white">{{ aggregatedReserveB }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400 text-right">Pools</div>
          <div class="text-white text-right">
            {{ state.aggregated.poolCount }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="state.loading" class="text-gray-400">Loading pools…</div>
    <div v-else-if="state.error" class="text-red-400">{{ state.error }}</div>

    <div v-else class="space-y-2">
      <div
        class="hidden md:grid md:grid-cols-8 gap-3 px-2 text-xs text-gray-400"
      >
        <div>Protocol</div>
        <div>Pool ID</div>
        <div>Price</div>
        <div>Reserve A</div>
        <div>Reserve B</div>
        <div>LP Supply</div>
        <div>Address</div>
        <div>Time</div>
      </div>
      <PoolRow v-for="p in state.pools" :key="p.poolAddress ?? ''" :pool="p" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed, reactive, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import PoolRow from "../components/PoolRow.vue";
import { getAVMTradeReporterAPI } from "../api";
import { assetService } from "../services/assetService";
import FormattedTime from "../components/FormattedTime.vue";
import { Pool, AggregatedPool } from "../api/models";
import { signalrService } from "../services/signalrService";

const route = useRoute();

const state = reactive({
  asset1: BigInt((route.params.asset1 as string) || 0),
  asset2: BigInt((route.params.asset2 as string) || 0),
  size: 100,
  pools: [] as Pool[],
  loading: false,
  error: "",
  forceUpdate: 0,
  aggregated: null as AggregatedPool | null,
});

const api = getAVMTradeReporterAPI();

async function fetchPools() {
  state.loading = true;
  state.error = "";
  try {
    const a1 = Number(state.asset1);
    const a2 = Number(state.asset2);
    const res = await api.getApiPool({
      assetIdA: a1,
      assetIdB: a2,
      size: state.size,
    });
    // res is AxiosResponse<Pool[]>
    state.pools = res.data as Pool[];
  } catch (e: any) {
    state.error = e?.message ?? "Failed to load pools";
  } finally {
    state.loading = false;
  }
}

async function fetchAggregated() {
  try {
    const a1 = Number(state.asset1);
    const a2 = Number(state.asset2);
    const res = await api.getApiAggregatedPool({
      assetIdA: a1,
      assetIdB: a2,
      size: 1,
    });
    const raw: AggregatedPool = Array.isArray(res.data)
      ? res.data[0]
      : (res as AggregatedPool);
    if (!raw) {
      state.aggregated = null;
      return;
    }
    if (
      assetService.needToReverseAssets(
        BigInt(raw.assetIdA ?? 0n),
        BigInt(raw.assetIdB ?? 0n)
      )
    ) {
      // Reverse the aggregated pool if needed
      state.aggregated = {
        id: String(`${raw.assetIdB}-${raw.assetIdA}`),
        assetIdA: Number(raw.assetIdB ?? a2),
        assetIdB: Number(raw.assetIdA ?? a1),
        a: Number(raw.b ?? 0),
        b: Number(raw.a ?? 0),
        tvL_A: Number(raw.tvL_B ?? 0),
        tvL_B: Number(raw.tvL_A ?? 0),
        poolCount: Number(raw.poolCount ?? 0),
        lastUpdated: (raw.lastUpdated ?? null) as string | null,
      };
    } else {
      state.aggregated = {
        id: String(`${raw.assetIdA}-${raw.assetIdB}`),
        assetIdA: Number(raw.assetIdA ?? a1),
        assetIdB: Number(raw.assetIdB ?? a2),
        a: Number(raw.a ?? 0),
        b: Number(raw.b ?? 0),
        tvL_A: Number(raw.tvL_A ?? 0),
        tvL_B: Number(raw.tvL_B ?? 0),
        poolCount: Number(raw.poolCount ?? 0),
        lastUpdated: (raw.lastUpdated ?? null) as string | null,
      };
    }
  } catch (e) {
    // silent fail for aggregated; page still shows pools
    state.aggregated = null;
  }
}

async function refresh() {
  await Promise.all([fetchPools(), fetchAggregated()]);
}

onMounted(async () => {
  if (assetService.needToReverseAssets(asset1Id.value, asset2Id.value)) {
    [state.asset1, state.asset2] = [state.asset2, state.asset1];
  }

  await Promise.all([fetchPools(), fetchAggregated()]);

  signalrService.onAggregatedPoolReceived(poolUpdateEvent);
});
onUnmounted(() => {
  signalrService.unsubscribeFromAggregatedPoolUpdates(poolUpdateEvent);
});

const poolUpdateEvent = (pool: AggregatedPool) => {
  if (
    pool.assetIdA === state.aggregated?.assetIdA &&
    pool.assetIdB == state.aggregated?.assetIdB
  ) {
    state.aggregated = pool;
  }
  if (
    pool.assetIdA === state.aggregated?.assetIdB &&
    pool.assetIdB == state.aggregated?.assetIdA
  ) {
    state.aggregated = assetService.reversePool(pool);
  }
};
watch(
  () => route.params,
  (p) => {
    state.asset1 = BigInt((p.asset1 as string) || 0);
    state.asset2 = BigInt((p.asset2 as string) || 0);
    if (assetService.needToReverseAssets(asset1Id.value, asset2Id.value)) {
      [state.asset1, state.asset2] = [state.asset2, state.asset1];
    }
    fetchPools();
    fetchAggregated();
  }
);

// Helpers to resolve asset names with lazy loading
function getAssetName(assetId: bigint): string {
  // depend on forceUpdate to refresh when assets load
  void state.forceUpdate;
  const info = assetService.getAssetInfo(assetId);
  if (!info) {
    // queue load and bump state when ready
    assetService.requestAsset(assetId, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  return info.unitName || info.name || `Asset ${assetId}`;
}

const asset1Id = computed(() => {
  const n = Number(state.asset1);
  return BigInt(isNaN(n) ? 0 : n);
});
const asset2Id = computed(() => {
  const n = Number(state.asset2);
  return BigInt(isNaN(n) ? 0 : n);
});

const asset1Name = computed(() => getAssetName(asset1Id.value));
const asset2Name = computed(() => getAssetName(asset2Id.value));

// Aggregated display helpers
const aggregatedReserveA = computed(() => {
  if (!state.aggregated) return "—";
  if (
    state.aggregated.assetIdA === undefined ||
    state.aggregated.assetIdA === null
  )
    return "—";
  const aid = BigInt(state.aggregated.assetIdA);
  const bal = BigInt(Math.trunc(state.aggregated.tvL_A || 0));
  return assetService.formatAssetBalance(bal, aid, false);
});
const aggregatedReserveB = computed(() => {
  if (!state.aggregated) return "—";
  if (
    state.aggregated.assetIdB === undefined ||
    state.aggregated.assetIdB === null
  )
    return "—";
  const bid = BigInt(state.aggregated.assetIdB);
  const bal = BigInt(Math.trunc(state.aggregated.tvL_B || 0));
  return assetService.formatAssetBalance(bal, bid, false);
});
const aggregatedPrice = computed(() => {
  if (!state.aggregated) return "—";
  if (
    state.aggregated.assetIdA === undefined ||
    state.aggregated.assetIdA === null
  )
    return "—";
  if (
    state.aggregated.assetIdB === undefined ||
    state.aggregated.assetIdB === null
  )
    return "—";
  const aid = BigInt(state.aggregated.assetIdA);
  const bid = BigInt(state.aggregated.assetIdB);
  const a = BigInt(Math.trunc(state.aggregated.tvL_A || 0));
  const b = BigInt(Math.trunc(state.aggregated.tvL_B || 0));
  return assetService.formatPairBalance(a, aid, b, bid, false);
});
</script>

<style scoped></style>
