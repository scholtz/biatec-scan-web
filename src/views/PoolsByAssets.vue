<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-semibold text-white">
      Pools for {{ asset1 }} / {{ asset2 }}
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

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <PoolCard v-for="p in pools" :key="p.poolAppId.toString()" :pool="p" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import PoolCard from "../components/PoolCard.vue";
import type { AMMPool } from "../types/algorand";
import { getAVMTradeReporterAPI } from "../api";

const route = useRoute();
const asset1 = ref<string>(route.params.asset1 as string);
const asset2 = ref<string>(route.params.asset2 as string);
const size = ref<number>(100);

const pools = ref<AMMPool[]>([]);
const loading = ref<boolean>(false);
const error = ref<string>("");

const api = getAVMTradeReporterAPI();

function mapPool(apiPool: any): AMMPool {
  return {
    poolAddress: apiPool.poolAddress ?? "",
    poolAppId: BigInt(apiPool.poolAppId ?? 0),
    assetIdA: apiPool.assetIdA != null ? BigInt(apiPool.assetIdA) : undefined,
    assetIdB: apiPool.assetIdB != null ? BigInt(apiPool.assetIdB) : undefined,
    assetIdLP:
      apiPool.assetIdLP != null ? BigInt(apiPool.assetIdLP) : undefined,
    a: apiPool.a != null ? BigInt(apiPool.a) : undefined,
    b: apiPool.b != null ? BigInt(apiPool.b) : undefined,
    l: apiPool.l != null ? BigInt(apiPool.l) : undefined,
    protocol: String(apiPool.protocol),
    timestamp: apiPool.timestamp ?? undefined,
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
</script>

<style scoped></style>
