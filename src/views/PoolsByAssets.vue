<template>
  <div class="p-4 space-y-4">
    <div
      class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
    >
      <h1 class="text-xl font-semibold text-white">
        {{
          isSingleAsset
            ? $t("poolsByAssets.poolsContaining", { assetName: asset1Name })
            : $t("poolsByAssets.poolsFor", { asset1Name, asset2Name })
        }}
      </h1>
      <router-link
        v-if="!isSingleAsset"
        :to="{
          name: 'TradesByPair',
          params: {
            assetId1: state.asset1.toString(),
            assetId2: state.asset2.toString(),
          },
        }"
        class="btn-secondary text-sm self-start md:self-auto"
      >
        {{ $t("poolsByAssets.viewTrades") }}
      </router-link>
    </div>

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <span>{{ $t("poolsByAssets.showingUpTo", { size: state.size }) }}</span>
      <button
        class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs transition-colors"
        @click="refresh"
      >
        {{ $t("poolsByAssets.refresh") }}
      </button>
      <ColumnSettingsPanel :columns="tableColumns" class="ml-auto" />
    </div>

    <!-- Aggregated Pool Summary -->
    <div class="card" v-if="state.aggregated && !isSingleAsset">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-xs text-gray-400">
            {{ $t("poolsByAssets.aggregated") }}
          </div>
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
          <div class="text-xs text-gray-400">
            {{ $t("poolsByAssets.totalReserveA") }}
          </div>
          <div class="text-white" title="Real reserve">
            <router-link
              :to="{
                name: 'AggregatedPoolsByAsset',
                params: { assetId: state.aggregated.assetIdA ?? 0 },
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
                params: { assetId: state.aggregated.assetIdA ?? 0 },
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
          <div class="text-xs text-gray-400">
            {{ $t("poolsByAssets.totalReserveB") }}
          </div>
          <div class="text-white" title="Real reserve">
            <router-link
              :to="{
                name: 'AggregatedPoolsByAsset',
                params: { assetId: state.aggregated.assetIdB ?? 0 },
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
                params: { assetId: state.aggregated.assetIdB ?? 0 },
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

    <div v-if="state.loading" class="text-gray-400">
      {{ $t("poolsByAssets.loadingPools") }}
    </div>
    <div v-else-if="state.error" class="text-red-400">{{ state.error }}</div>

    <div v-else>
      <DataTable
        :table-columns="tableColumns"
        :rows="state.pools"
        :row-key="(p: Pool) => p.poolAddress ?? ''"
        :sort-fns="sortFns"
        :on-row-click="(p: Pool) => goToPoolDetails(p)"
      >
        <template #cell-address="{ row: p }">
          <div class="flex items-center gap-1 min-w-0">
            <router-link
              v-if="p.poolAddress"
              :to="{
                name: 'AddressDetails',
                params: { address: p.poolAddress },
              }"
              class="text-xs text-blue-100 hover:text-blue-300 font-mono truncate transition-colors duration-200"
              :title="p.poolAddress"
              @click.stop
            >
              {{ formatAddress(p.poolAddress) }}
            </router-link>
            <CopyToClipboard
              @click.stop
              :text="p.poolAddress ?? ''"
              :toast-message="`Copied pool address: ${formatAddress(p.poolAddress ?? '')}`"
              title="Copy pool address to clipboard"
              class="p-1 text-gray-400 hover:text-white transition-colors shrink-0"
            />
          </div>
        </template>

        <template #cell-protocol="{ row: p }">
          <span class="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
            {{ p.protocol }}
          </span>
        </template>

        <template #cell-type="{ row: p }">
          <span
            class="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300"
            v-if="p.ammType == AMMType.StableSwap"
          >
            Stable swap
          </span>
          <span
            class="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-300"
            v-else-if="p.ammType == 'OldAMM'"
          >
            Traditional AMM
          </span>
          <span
            class="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300"
            v-else-if="p.ammType == 'ConcentratedLiquidityAMM'"
          >
            Concentrated liquidity
          </span>
          <span class="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-300" v-else>
            {{ p.ammType }}
          </span>
        </template>

        <template #cell-poolId="{ row: p }">
          <div class="flex items-center justify-end gap-1">
            <router-link
              v-if="p.poolAppId"
              :to="{
                name: 'PoolDetails',
                params: { poolAddress: p.poolAddress },
              }"
              class="text-sm text-blue-100 hover:text-blue-300 transition-colors duration-200"
              @click.stop
            >
              {{ p.poolAppId.toString() }}
            </router-link>
            <CopyToClipboard
              @click.stop
              :text="p.poolAppId?.toString() ?? ''"
              :toast-message="`Copied pool app ID: ${p.poolAppId?.toString() ?? ''}`"
              title="Copy pool app id to clipboard"
              class="p-1 text-gray-400 hover:text-white transition-colors"
            />
          </div>
        </template>

        <template #cell-lpFee="{ row: p }">
          <template v-if="(p.lpFee ?? 0) > 0">{{ Number((p.lpFee ?? 0) * 100).toLocaleString() }} %</template>
          <template v-else>-</template>
        </template>

        <template #cell-protocolFee="{ row: p }">
          <template v-if="(p.protocolFeePortion ?? 0) > 0"
            >{{ Number((p.protocolFeePortion ?? 0) * 100).toLocaleString() }} %</template
          >
          <template v-else>-</template>
        </template>

        <template #cell-priceMin="{ row: p }">
          {{ formattedPriceMin(p) }}
        </template>

        <template #cell-price="{ row: p }">
          <router-link
            :to="{
              name: 'PoolsByAssets',
              params: { asset1: p.assetIdA, asset2: p.assetIdB },
            }"
            class="text-sm text-blue-100 hover:text-blue-300 transition-colors duration-200"
            @click.stop
          >
            {{ formattedPrice(p) }}
          </router-link>
        </template>

        <template #cell-priceMax="{ row: p }">
          {{ formattedPriceMax(p) }}
        </template>

        <template #cell-reserveA="{ row: p }">
          <div title="Real reserve">
            <router-link
              :to="{ name: 'AssetDetails', params: { assetId: p.assetIdA } }"
              class="text-sm text-blue-100 hover:text-blue-300 transition-colors duration-200"
              @click.stop
            >
              {{ formattedReserveA(p) }}
            </router-link>
          </div>
          <div title="Virtual reserve" class="text-xs text-gray-400">{{ formattedVirtualReserveA(p) }}</div>
        </template>

        <template #cell-reserveB="{ row: p }">
          <div title="Real reserve">
            <router-link
              :to="{ name: 'AssetDetails', params: { assetId: p.assetIdB } }"
              class="text-sm text-blue-100 hover:text-blue-300 transition-colors duration-200"
              @click.stop
            >
              {{ formattedReserveB(p) }}
            </router-link>
          </div>
          <div title="Virtual reserve" class="text-xs text-gray-400">{{ formattedVirtualReserveB(p) }}</div>
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

        <template #cell-time="{ row: p }">
          <FormattedTime :timestamp="p.timestamp || Date.now().toString()" />
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed, reactive, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { getAVMTradeReporterAPI } from "../api";
import { assetService } from "../services/assetService";
import FormattedTime from "../components/FormattedTime.vue";
import FormattedNumber from "../components/FormattedNumber.vue";
import CopyToClipboard from "../components/CopyToClipboard.vue";
import DataTable from "../components/table/DataTable.vue";
import ColumnSettingsPanel from "../components/table/ColumnSettingsPanel.vue";
import { useTableColumns, type ColumnDef } from "../composables/useTableColumns";
import { AMMType, Pool, AggregatedPool } from "../api/models";
import { signalrService } from "../services/signalrService";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();

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

const poolColumns: ColumnDef[] = [
  { key: "address", labelKey: "poolsByAssets.address", pinned: true, descriptionKey: "poolsByAssets.addressHelp" },
  {
    key: "protocol",
    labelKey: "poolsByAssets.protocol",
    sortable: true,
    descriptionKey: "poolsByAssets.protocolHelp",
  },
  { key: "type", labelKey: "poolsByAssets.type", sortable: true, descriptionKey: "poolsByAssets.typeHelp" },
  {
    key: "poolId",
    labelKey: "poolsByAssets.poolId",
    align: "right",
    sortable: true,
    descriptionKey: "poolsByAssets.poolIdHelp",
  },
  {
    key: "lpFee",
    labelKey: "poolsByAssets.lpFee",
    align: "right",
    sortable: true,
    descriptionKey: "poolsByAssets.lpFeeHelp",
  },
  {
    key: "protocolFee",
    labelKey: "poolsByAssets.protocolFee",
    align: "right",
    sortable: true,
    descriptionKey: "poolsByAssets.protocolFeeHelp",
  },
  {
    key: "priceMin",
    labelKey: "poolsByAssets.priceMin",
    align: "right",
    sortable: true,
    descriptionKey: "poolsByAssets.priceMinHelp",
  },
  {
    key: "price",
    labelKey: "poolsByAssets.price",
    align: "right",
    sortable: true,
    descriptionKey: "poolsByAssets.priceHelp",
  },
  {
    key: "priceMax",
    labelKey: "poolsByAssets.priceMax",
    align: "right",
    sortable: true,
    descriptionKey: "poolsByAssets.priceMaxHelp",
  },
  {
    key: "reserveA",
    labelKey: "poolsByAssets.reserveA",
    align: "right",
    sortable: true,
    descriptionKey: "poolsByAssets.reserveAHelp",
  },
  {
    key: "reserveB",
    labelKey: "poolsByAssets.reserveB",
    align: "right",
    sortable: true,
    descriptionKey: "poolsByAssets.reserveBHelp",
  },
  {
    key: "volume24H",
    labelKey: "poolsByAssets.volume24H",
    align: "right",
    sortable: true,
    descriptionKey: "poolsByAssets.volume24HHelp",
  },
  { key: "time", labelKey: "poolsByAssets.time", align: "right", sortable: true, descriptionKey: "poolsByAssets.timeHelp" },
];

const tableColumns = useTableColumns("pools-by-assets", poolColumns);

const sortFns: Partial<Record<string, (p: Pool) => number | string>> = {
  protocol: (p) => p.protocol ?? "",
  type: (p) => p.ammType ?? "",
  poolId: (p) => (p.poolAppId !== undefined ? Number(p.poolAppId) : Number.NEGATIVE_INFINITY),
  lpFee: (p) => p.lpFee ?? Number.NEGATIVE_INFINITY,
  protocolFee: (p) => p.protocolFeePortion ?? Number.NEGATIVE_INFINITY,
  priceMin: (p) => p.pMin ?? Number.NEGATIVE_INFINITY,
  price: (p) => (p.virtualAmountA && p.virtualAmountB ? p.virtualAmountA / p.virtualAmountB : Number.NEGATIVE_INFINITY),
  priceMax: (p) => p.pMax ?? Number.POSITIVE_INFINITY,
  reserveA: (p) => p.realAmountA ?? Number.NEGATIVE_INFINITY,
  reserveB: (p) => p.realAmountB ?? Number.NEGATIVE_INFINITY,
  volume24H: (p) => p.volume24H ?? Number.NEGATIVE_INFINITY,
  time: (p) => p.timestamp ?? "",
};

function normalizePool(p: Pool): Pool {
  if (
    assetService.needToReverseAssets(
      BigInt(p.assetIdA ?? 0n),
      BigInt(p.assetIdB ?? 0n),
    )
  ) {
    return assetService.reversePool(p);
  }
  return p;
}

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
    pools = pools.map(normalizePool);
    // Default sort by the selected asset's real amount (descending); overridden by user's chosen column sort.
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
        BigInt(raw.assetIdB ?? 0n),
      )
    ) {
      // Reverse the aggregated pool if needed
      state.aggregated = assetService.reverseAggregatedPool(raw);
    } else {
      state.aggregated = raw;
    }
  } catch {
    // silent fail for aggregated; page still shows pools
    state.aggregated = null;
  }
}

async function refresh() {
  await Promise.all([fetchPools(), fetchAggregated()]);
}

// Clicking a pool row opens that pool's details page.
function goToPoolDetails(p: Pool) {
  if (!p.poolAddress) return;
  router.push({ name: "PoolDetails", params: { poolAddress: p.poolAddress } });
}

onMounted(async () => {
  if (!isSingleAsset.value) {
    if (assetService.needToReverseAssets(asset1Id.value, asset2Id.value)) {
      [state.asset1, state.asset2] = [state.asset2, state.asset1];
    }
  }

  await Promise.all([fetchPools(), fetchAggregated()]);

  signalrService.onPoolReceived(poolRowUpdateEvent);
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
  signalrService.unsubscribeFromPoolUpdates(poolRowUpdateEvent);
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

const poolRowUpdateEvent = (pool: Pool) => {
  const idx = state.pools.findIndex(
    (x) => x.poolAppId === pool.poolAppId && x.poolAddress === pool.poolAddress,
  );
  if (idx === -1) return;
  state.pools[idx] = normalizePool(pool);
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
  },
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
    return t("common.loading");
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
  const bal = state.aggregated.tvL_A || 0;
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
  const bal = state.aggregated.virtualSumA || 0;
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
  const bal = state.aggregated.virtualSumALevel1 || 0;
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
  const bal = state.aggregated.virtualSumALevel2 || 0;
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
  const bal = state.aggregated.tvL_B || 0;
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
  const bal = state.aggregated.virtualSumB || 0;
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
  const bal = state.aggregated.virtualSumBLevel1 || 0;
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
  const bal = state.aggregated.virtualSumBLevel2 || 0;
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
  const a = state.aggregated.virtualSumA || 0;
  const b = state.aggregated.virtualSumB || 0;
  return assetService.formatPairBalance(a, aid, b, bid, false);
});

// Per-pool cell formatting (folded in from the old PoolRow.vue component)
function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formattedPrice(p: Pool): string {
  if (!p.virtualAmountA || !p.virtualAmountB || p.assetIdA === undefined || p.assetIdA === null) return "0";
  return assetService.formatPairBalance(p.virtualAmountA, p.assetIdA ?? 0, p.virtualAmountB, p.assetIdB ?? 0, false);
}
function formattedPriceMin(p: Pool): string {
  if (!p.pMin) return "0";
  return assetService.formatPairBalanceWithRealValue(p.pMin, p.assetIdA ?? 0, p.assetIdB ?? 0);
}
function formattedPriceMax(p: Pool): string {
  if (!p.pMax) return "∞";
  return assetService.formatPairBalanceWithRealValue(p.pMax, p.assetIdA ?? 0, p.assetIdB ?? 0);
}
function formattedReserveA(p: Pool): string {
  if (!p.realAmountA || p.assetIdA === undefined || p.assetIdA === null) return "0";
  return assetService.formatAssetBalance(p.realAmountA, p.assetIdA ?? 0, false);
}
function formattedReserveB(p: Pool): string {
  if (!p.realAmountB || p.assetIdB === undefined || p.assetIdB === null) return "0";
  return assetService.formatAssetBalance(p.realAmountB, p.assetIdB ?? 0, false);
}
function formattedVirtualReserveA(p: Pool): string {
  if (p.ammType === AMMType.OldAMM && p.virtualAmountA == p.realAmountA) return "";
  if (!p.virtualAmountA || p.assetIdA === undefined || p.assetIdA === null) return "0";
  return assetService.formatAssetBalance(p.virtualAmountA, p.assetIdA ?? 0, false);
}
function formattedVirtualReserveB(p: Pool): string {
  if (p.ammType === AMMType.OldAMM && p.virtualAmountB == p.realAmountB) return "";
  if (!p.virtualAmountB || p.assetIdB === undefined || p.assetIdB === null) return "0";
  return assetService.formatAssetBalance(p.virtualAmountB, p.assetIdB ?? 0, false);
}
</script>

<style scoped></style>
