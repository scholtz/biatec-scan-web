<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-semibold text-white">
      Pools for {{ asset1Name }} / {{ asset2Name }}
    </h1>

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <span>Showing up to {{ size }} pools</span>
      <button
        class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs transition-colors"
        @click="refresh"
      >
        Refresh
      </button>
    </div>

    <!-- Aggregated Pool Summary -->
    <div class="card" v-if="aggregated">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-xs text-gray-400">Aggregated</div>
          <div class="text-lg text-white">{{ aggregatedPrice }}</div>
          <div class="text-xs text-gray-400">Price {{ asset2Name }}/{{ asset1Name }}</div>
        </div>
        <div class="text-right text-xs text-gray-400">
          <div>Updated</div>
          <FormattedTime :timestamp="aggregated.lastUpdated || Date.now().toString()" />
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div>
          <div class="text-xs text-gray-400">Total Reserve A</div>
          <div class="text-white">{{ aggregatedReserveA }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400">Total Reserve B</div>
          <div class="text-white">{{ aggregatedReserveB }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400">Pools</div>
          <div class="text-white">{{ aggregated.poolCount }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400">TVL (est.)</div>
          <div class="text-white">{{ aggregatedTVL }}</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-gray-400">Loading pools…</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>

    <div v-else class="space-y-2">
      <div
        class="hidden md:grid md:grid-cols-8 gap-3 px-2 text-xs text-gray-400"
      >
        <div>Protocol</div>
        <div>Pool ID</div>
        <div>Pair</div>
        <div>Reserve A</div>
        <div>Reserve B</div>
        <div>LP Supply</div>
        <div>Address</div>
        <div>Time</div>
      </div>
      <PoolRow v-for="p in pools" :key="p.poolAppId.toString()" :pool="p" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { useRoute } from "vue-router";
import PoolRow from "../components/PoolRow.vue";
import type { AMMPool } from "../types/algorand";
import { getAVMTradeReporterAPI } from "../api";
import { assetService } from "../services/assetService";
import FormattedTime from "../components/FormattedTime.vue";

const route = useRoute();
const asset1 = ref<string>(route.params.asset1 as string);
const asset2 = ref<string>(route.params.asset2 as string);
const size = ref<number>(100);

const pools = ref<AMMPool[]>([]);
const loading = ref<boolean>(false);
const error = ref<string>("");
const forceUpdate = ref<number>(0); // trigger recompute after asset load
const aggregated = ref<{ id: string; assetIdA: number; assetIdB: number; a: number; b: number; tvL_A: number; tvL_B: number; poolCount: number; lastUpdated: string | null } | null>(null);

const api = getAVMTradeReporterAPI();

function mapPool(apiPool: any): AMMPool {
  const aidA = apiPool.assetIdA != null ? BigInt(apiPool.assetIdA) : undefined;
  const aidB = apiPool.assetIdB != null ? BigInt(apiPool.assetIdB) : undefined;
  return {
    poolAddress: apiPool.poolAddress ?? "",
    poolAppId: BigInt(apiPool.poolAppId ?? 0),
    assetIdA: aidA,
    assetIdB: aidB,
    assetIdLP:
      apiPool.assetIdLP != null ? BigInt(apiPool.assetIdLP) : undefined,
    a: apiPool.a != null ? BigInt(apiPool.a) : undefined,
    b: apiPool.b != null ? BigInt(apiPool.b) : undefined,
    l: apiPool.l != null ? BigInt(apiPool.l) : undefined,
    protocol: String(apiPool.protocol),
    timestamp: apiPool.timestamp ?? undefined,
    isReversed: assetService.needToReverseAssets(aidA ?? 0n, aidB ?? 0n),
  } satisfies AMMPool;
}

async function fetchPools() {
  loading.value = true;
  error.value = "";
  try {
    const a1 = Number(asset1.value);
    const a2 = Number(asset2.value);
    const res = await api.getApiPool({
      assetIdA: a1,
      assetIdB: a2,
      size: size.value,
    });
    // res is AxiosResponse<Pool[]>
    pools.value = (res.data ?? []).map(mapPool);
  } catch (e: any) {
    error.value = e?.message ?? "Failed to load pools";
  } finally {
    loading.value = false;
  }
}

async function fetchAggregated() {
  try {
    const a1 = Number(asset1.value);
    const a2 = Number(asset2.value);
    const res = await api.getApiAggregatedPool({ assetIdA: a1, assetIdB: a2, size: 1 });
    const raw: any = Array.isArray(res.data) ? res.data[0] : (res as any).data ?? res;
    if (!raw) {
      aggregated.value = null;
      return;
    }
    aggregated.value = {
      id: String(raw.id ?? `${a1}-${a2}`),
      assetIdA: Number(raw.assetIdA ?? a1),
      assetIdB: Number(raw.assetIdB ?? a2),
      a: Number(raw.a ?? 0),
      b: Number(raw.b ?? 0),
      tvL_A: Number(raw.tvL_A ?? raw.tvl_A ?? raw.tvlA ?? 0),
      tvL_B: Number(raw.tvL_B ?? raw.tvl_B ?? raw.tvlB ?? 0),
      poolCount: Number(raw.poolCount ?? raw.count ?? 0),
      lastUpdated: (raw.lastUpdated ?? raw.updated ?? null) as string | null,
    };
  } catch (e) {
    // silent fail for aggregated; page still shows pools
    aggregated.value = null;
  }
}

function refresh() {
  fetchPools();
  fetchAggregated();
}

onMounted(async () => {
  await Promise.all([fetchPools(), fetchAggregated()]);
});

watch(
  () => route.params,
  (p) => {
    asset1.value = p.asset1 as string;
    asset2.value = p.asset2 as string;
  fetchPools();
  fetchAggregated();
  }
);

// Helpers to resolve asset names with lazy loading
function getAssetName(assetId: bigint): string {
  // depend on forceUpdate to refresh when assets load
  void forceUpdate.value;
  const info = assetService.getAssetInfo(assetId);
  if (!info) {
    // queue load and bump state when ready
    assetService.requestAsset(assetId, () => {
      forceUpdate.value++;
    });
    return "Loading...";
  }
  return info.unitName || info.name || `Asset ${assetId}`;
}

const asset1Id = computed(() => {
  const n = Number(asset1.value);
  return BigInt(isNaN(n) ? 0 : n);
});
const asset2Id = computed(() => {
  const n = Number(asset2.value);
  return BigInt(isNaN(n) ? 0 : n);
});

const asset1Name = computed(() => getAssetName(asset1Id.value));
const asset2Name = computed(() => getAssetName(asset2Id.value));

// Aggregated display helpers
const aggregatedReserveA = computed(() => {
  if (!aggregated.value) return '—';
  const aid = BigInt(aggregated.value.assetIdA);
  const bal = BigInt(Math.trunc(aggregated.value.a || 0));
  return assetService.formatAssetBalance(bal, aid);
});
const aggregatedReserveB = computed(() => {
  if (!aggregated.value) return '—';
  const bid = BigInt(aggregated.value.assetIdB);
  const bal = BigInt(Math.trunc(aggregated.value.b || 0));
  return assetService.formatAssetBalance(bal, bid);
});
const aggregatedPrice = computed(() => {
  if (!aggregated.value) return '—';
  const aid = BigInt(aggregated.value.assetIdA);
  const bid = BigInt(aggregated.value.assetIdB);
  const a = BigInt(Math.trunc(aggregated.value.a || 0));
  const b = BigInt(Math.trunc(aggregated.value.b || 0));
  return assetService.formatPairBalance(a, aid, b, bid, true);
});
const aggregatedTVL = computed(() => {
  if (!aggregated.value) return '—';
  // Prefer provided TVL_B if available; otherwise show B reserve in base units
  const tvl = aggregated.value.tvL_B || 0;
  const bid = BigInt(aggregated.value.assetIdB);
  if (tvl > 0) return `${tvl.toLocaleString()} ${assetService.getAssetInfo(bid)?.unitName ?? ''}`.trim();
  const bal = BigInt(Math.trunc(aggregated.value.b || 0));
  return assetService.formatAssetBalance(bal, bid);
});
</script>

<style scoped></style>
