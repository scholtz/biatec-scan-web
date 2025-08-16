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

const route = useRoute();
const asset1 = ref<string>(route.params.asset1 as string);
const asset2 = ref<string>(route.params.asset2 as string);
const size = ref<number>(100);

const pools = ref<AMMPool[]>([]);
const loading = ref<boolean>(false);
const error = ref<string>("");
const forceUpdate = ref<number>(0); // trigger recompute after asset load

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

function refresh() {
  fetchPools();
}

onMounted(fetchPools);

watch(
  () => route.params,
  (p) => {
    asset1.value = p.asset1 as string;
    asset2.value = p.asset2 as string;
    fetchPools();
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
</script>

<style scoped></style>
