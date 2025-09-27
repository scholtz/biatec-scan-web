<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-semibold text-white">
      {{
        isSingleAsset
          ? $t('poolsByAssets.poolsContaining', { assetName: asset1Name })
          : $t('poolsByAssets.poolsFor', { asset1Name, asset2Name })
      }}
    </h1>

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <span>{{ $t('poolsByAssets.showingUpTo', { size: state.size }) }}</span>
      <button
        class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs transition-colors"
        @click="refresh"
      >
        {{ $t('poolsByAssets.refresh') }}
      </button>
    </div>

    <!-- Aggregated Pool Summary -->
    <div class="card" v-if="state.aggregated && !isSingleAsset">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-xs text-gray-400">{{ $t('poolsByAssets.aggregated') }}</div>
          <div class="text-lg text-white">{{ aggregatedPrice }}</div>
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
          <div class="text-xs text-gray-400">{{ $t('poolsByAssets.totalReserveA') }}</div>
          <div class="text-white" title="Real reserve">
            <router-link
              :to="{
                name: 'AggregatedPoolsByAsset',
                params: { asset1: state.aggregated.assetIdA },
              }"
              class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
            >
              {{ aggregatedReserveA }}
            </router-link>
          </div>
          <div
            class="text-gray-400 text-xs"
            title="Virtual reserve"
            v-if="aggregatedVirtualReserveA != aggregatedReserveA"
          >
            {{ aggregatedVirtualReserveA }}
          </div>
          <div class="text-gray-400 text-xs" title="Virtual reserve Level 1">
            {{ aggregatedVirtualReserveAL1 }}
          </div>
          <div class="text-gray-400 text-xs" title="Virtual reserve Level 2">
            {{ aggregatedVirtualReserveAL2 }}
          </div>
          <div>
            <router-link
              :to="{
                name: 'AssetDetails',
                params: { assetId: state.aggregated.assetIdA },
              }"
              class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
            >
              <img
                :src="`https://algorand-trades.de-4.biatec.io/api/asset/image/${state.aggregated.assetIdA}`"
                class="inline-block w-10 h-10 mt-3"
              />
            </router-link>
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-400">{{ $t('poolsByAssets.totalReserveB') }}</div>
          <div class="text-white" title="Real reserve">
            <router-link
              :to="{
                name: 'AggregatedPoolsByAsset',
                params: { asset1: state.aggregated.assetIdB },
              }"
              class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
            >
              {{ aggregatedReserveB }}
            </router-link>
          </div>
          <div
            class="text-gray-400 text-xs"
            title="Virtual reserve"
            v-if="aggregatedVirtualReserveB != aggregatedReserveB"
          >
            {{ aggregatedVirtualReserveB }}
          </div>
          <div class="text-gray-400 text-xs" title="Virtual reserve Level 1">
            {{ aggregatedVirtualReserveBL1 }}
          </div>
          <div class="text-gray-400 text-xs" title="Virtual reserve Level 2">
            {{ aggregatedVirtualReserveBL2 }}
          </div>

          <div>
            <router-link
              :to="{
                name: 'AssetDetails',
                params: { assetId: state.aggregated.assetIdB },
              }"
              class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
            >
              <img
                :src="`https://algorand-trades.de-4.biatec.io/api/asset/image/${state.aggregated.assetIdB}`"
                class="inline-block w-10 h-10 mt-3"
              />
            </router-link>
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-400 text-right">Pools</div>
          <div class="text-white text-right">
            {{ state.aggregated.poolCount }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="state.loading" class="text-gray-400">{{ $t('poolsByAssets.loadingPools') }}</div>
    <div v-else-if="state.error" class="text-red-400">{{ state.error }}</div>

    <div v-else class="space-y-1">
      <div
        class="hidden md:grid md:grid-cols-12 gap-3 px-2 text-xs text-gray-400"
      >
        <div>Protocol</div>
        <div>Type</div>
        <div>Address</div>
        <div class="text-right">Pool ID</div>
        <div class="text-right">LP Fee</div>
        <div class="text-right">Protocol Fee</div>
        <div class="text-right">Price Min</div>
        <div class="text-right">Price</div>
        <div class="text-right">Price Max</div>
        <div class="text-right">Reserve A</div>
        <div class="text-right">Reserve B</div>
        <div class="text-right">Time</div>
      </div>
      <PoolRow v-for="p in state.pools" :key="p.poolAddress ?? ''" :pool="p" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed, reactive, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import PoolRow from "../components/PoolRow.vue";
import { getAVMTradeReporterAPI } from "../api";
import { assetService } from "../services/assetService";
import FormattedTime from "../components/FormattedTime.vue";
import { Pool, AggregatedPool } from "../api/models";
import { signalrService } from "../services/signalrService";

const { t } = useI18n();

const route = useRoute();

const state = reactive({
  asset1: BigInt((route.params.asset1 as string) || 0),
  asset2: BigInt((route.params.asset2 as string) || 0),
  size: 10000,
  pools: [] as Pool[],
  loading: false,
  error: "",
  forceUpdate: 0,
  aggregated: null as AggregatedPool | null,
});

const api = getAVMTradeReporterAPI();

const isSingleAsset = computed(() => !route.params.asset2);

async function fetchPools() {
  state.loading = true;
  state.error = "";
  try {
    let pools: Pool[] = [];
    if (isSingleAsset.value) {
      const a1 = Number(state.asset1);
      // Query pools where asset is on either side and merge unique by poolAddress
      const [resA, resB] = await Promise.all([
        api.getApiPool({ assetIdA: a1, size: state.size }),
        api.getApiPool({ assetIdB: a1, size: state.size }),
      ]);
      const map = new Map<string, Pool>();
      for (const p of resA.data as Pool[]) {
        if (p.poolAddress) map.set(p.poolAddress, p);
      }
      for (const p of resB.data as Pool[]) {
        if (p.poolAddress && !map.has(p.poolAddress)) map.set(p.poolAddress, p);
      }
      pools = Array.from(map.values());
    } else {
      const a1 = Number(state.asset1);
      const a2 = Number(state.asset2);
      const res = await api.getApiPool({
        assetIdA: a1,
        assetIdB: a2,
        size: state.size,
      });
      pools = res.data as Pool[];
    }
    // sort pools by the selected asset's real amount (descending)
    const aSel = Number(state.asset1);
    pools.sort((a, b) => {
      const aval =
        (a.assetIdA === aSel ? (a.realAmountA ?? 0) : (a.realAmountB ?? 0)) ||
        0;
      const bval =
        (b.assetIdA === aSel ? (b.realAmountA ?? 0) : (b.realAmountB ?? 0)) ||
        0;
      return bval - aval;
    });
    state.pools = pools;
  } catch (e: any) {
    state.error = e?.message ?? "Failed to load pools";
  } finally {
    state.loading = false;
  }
}

async function fetchAggregated() {
  try {
    if (isSingleAsset.value) {
      state.aggregated = null;
      return;
    }
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
      state.aggregated = assetService.reverseAggregatedPool(raw);
    } else {
      state.aggregated = raw;
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
  if (!isSingleAsset.value) {
    if (assetService.needToReverseAssets(asset1Id.value, asset2Id.value)) {
      [state.asset1, state.asset2] = [state.asset2, state.asset1];
    }
  }

  await Promise.all([fetchPools(), fetchAggregated()]);

  signalrService.onAggregatedPoolReceived(poolUpdateEvent);
  var addresses = state.pools.map((p) => p.poolAddress ?? "");
  var aggregatedIds = [] as string[];
  if (state.aggregated?.id) aggregatedIds.push(state.aggregated.id);
  signalrService.subscribe({
    PoolsAddresses: addresses,
    AggregatedPoolsIds: aggregatedIds,
    AssetIds: [
      state.asset1 !== 0n ? state.asset1.toString() : null,
      state.asset2 !== 0n ? state.asset2.toString() : null,
    ].filter((v) => v !== null),
    MainAggregatedPools: false,
    RecentAggregatedPool: false,
    RecentBlocks: false,
    RecentLiquidity: false,
    RecentAssets: false,
    RecentPool: false,
    RecentTrades: false,
  });
});
onUnmounted(() => {
  signalrService.unsubscribeFromAggregatedPoolUpdates(poolUpdateEvent);
  signalrService.unsubscribe();
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
    state.aggregated = assetService.reverseAggregatedPool(pool);
  }
};
watch(
  () => route.params,
  (p) => {
    state.asset1 = BigInt((p.asset1 as string) || 0);
    state.asset2 = BigInt((p.asset2 as string) || 0);
    if (!isSingleAsset.value) {
      if (assetService.needToReverseAssets(asset1Id.value, asset2Id.value)) {
        [state.asset1, state.asset2] = [state.asset2, state.asset1];
      }
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
    return t('common.loading');
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
// Aggregated display helpers
const aggregatedVirtualReserveA = computed(() => {
  if (!state.aggregated) return "—";
  if (
    state.aggregated.assetIdA === undefined ||
    state.aggregated.assetIdA === null
  )
    return "—";
  const aid = BigInt(state.aggregated.assetIdA);
  const bal = BigInt(Math.trunc(state.aggregated.virtualSumA || 0));
  return assetService.formatAssetBalance(bal, aid, false);
});
const aggregatedVirtualReserveAL1 = computed(() => {
  if (!state.aggregated) return "—";
  if (
    state.aggregated.assetIdA === undefined ||
    state.aggregated.assetIdA === null
  )
    return "—";
  const aid = BigInt(state.aggregated.assetIdA);
  const bal = BigInt(Math.trunc(state.aggregated.virtualSumALevel1 || 0));
  return assetService.formatAssetBalance(bal, aid, false);
});
const aggregatedVirtualReserveAL2 = computed(() => {
  if (!state.aggregated) return "—";
  if (
    state.aggregated.assetIdA === undefined ||
    state.aggregated.assetIdA === null
  )
    return "—";
  const aid = BigInt(state.aggregated.assetIdA);
  const bal = BigInt(Math.trunc(state.aggregated.virtualSumALevel2 || 0));
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
const aggregatedVirtualReserveB = computed(() => {
  if (!state.aggregated) return "—";
  if (
    state.aggregated.assetIdB === undefined ||
    state.aggregated.assetIdB === null
  )
    return "—";
  const bid = BigInt(state.aggregated.assetIdB);
  const bal = BigInt(Math.trunc(state.aggregated.virtualSumB || 0));
  return assetService.formatAssetBalance(bal, bid, false);
});
const aggregatedVirtualReserveBL1 = computed(() => {
  if (!state.aggregated) return "—";
  if (
    state.aggregated.assetIdB === undefined ||
    state.aggregated.assetIdB === null
  )
    return "—";
  const bid = BigInt(state.aggregated.assetIdB);
  const bal = BigInt(Math.trunc(state.aggregated.virtualSumBLevel1 || 0));
  return assetService.formatAssetBalance(bal, bid, false);
});
const aggregatedVirtualReserveBL2 = computed(() => {
  if (!state.aggregated) return "—";
  if (
    state.aggregated.assetIdB === undefined ||
    state.aggregated.assetIdB === null
  )
    return "—";
  const bid = BigInt(state.aggregated.assetIdB);
  const bal = BigInt(Math.trunc(state.aggregated.virtualSumBLevel2 || 0));
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
  const a = BigInt(Math.trunc(state.aggregated.virtualSumA || 0));
  const b = BigInt(Math.trunc(state.aggregated.virtualSumB || 0));
  return assetService.formatPairBalance(a, aid, b, bid, false);
});
</script>

<style scoped></style>
