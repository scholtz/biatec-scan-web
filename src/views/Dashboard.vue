<template>
  <div class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header Stats -->
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 mb-8"
    >
      <StyledBox class="text-center">
        <h3 class="text-2xl font-bold text-white" v-if="state.algoPrice">
          <div
            v-if="state.algoPrice.virtualSumA && state.algoPrice.virtualSumB"
          >
            <RouterLink
              :to="`/pools/${state.algoPrice.assetIdA}/${state.algoPrice.assetIdB}`"
              class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
            >
              <FormattedNumber
                :value="
                  state.algoPrice.virtualSumB / state.algoPrice.virtualSumA
                "
                type="number"
                :minimum-fraction-digits="2"
                :maximum-fraction-digits="6"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </RouterLink>
          </div>
        </h3>
        <h3 class="text-2xl font-bold text-gray-400" v-else>
          <RouterLink
            :to="`/pools/0/31566704`"
            class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            {{ $t("common.loading") }}
          </RouterLink>
        </h3>
        <p class="text-gray-400">{{ $t("dashboard.algoUsd") }}</p>
      </StyledBox>
      <StyledBox class="text-center">
        <h3 class="text-2xl font-bold text-white">
          <RouterLink
            :to="`/block/${state.latestBlocks[0]?.round}`"
            class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            {{ state.latestBlocks[0]?.round.toLocaleString() || "..." }}
          </RouterLink>
        </h3>
        <p class="text-gray-400">{{ $t("dashboard.latestBlock") }}</p>
      </StyledBox>
      <StyledBox class="text-center">
        <h3 class="text-2xl font-bold text-white">
          {{
            state.latestBlocks[0]?.totalTransactions.toLocaleString() || "..."
          }}
        </h3>
        <p class="text-gray-400">{{ $t("dashboard.totalTransactions") }}</p>
      </StyledBox>
      <StyledBox class="text-center">
        <h3 class="text-2xl font-bold" :class="networkStatus.color">
          {{ networkStatus.status }}
        </h3>
        <p class="text-gray-400">{{ $t("dashboard.connectionStatus") }}</p>
      </StyledBox>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-6 gap-8">
      <!-- Assets Updates Sidebar -->
      <div>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">
            {{ $t("dashboard.assets") }}
          </h2>
        </div>

        <div v-if="!state.recentAssets.length" class="card text-center py-8">
          <p class="text-gray-400">
            {{
              state.connectionStatus
                ? $t("dashboard.waitingForAggregatedPools")
                : $t("dashboard.connectingToFeed")
            }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <AssetCard
            v-for="(asset, index) in state.recentAssets"
            :key="`asset-${asset.index || index}-${index}`"
            :asset="asset"
          />
        </div>
      </div>
      <!-- Latest Blocks -->
      <div class="">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-white">
            {{ $t("dashboard.latestBlocks") }}
          </h2>
        </div>

        <div
          v-if="state.isLoading && !state.latestBlocks.length"
          class="flex justify-center py-12"
        >
          <div class="loading-spinner"></div>
        </div>
        <div v-else class="space-y-4 overflow-y-auto">
          <BlockCard
            v-for="block in state.latestBlocks"
            :key="block.round.toString()"
            :block="block"
          />
        </div>
      </div>

      <!-- AMM Trades Sidebar -->
      <div>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">
            {{ $t("dashboard.liveAmmTrades") }}
          </h2>
        </div>

        <div v-if="!state.recentTrades.length" class="card text-center py-8">
          <p class="text-gray-400">
            {{
              state.connectionStatus
                ? $t("dashboard.waitingForTrades")
                : $t("dashboard.connectingToFeed")
            }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <TradeCard
            v-for="(trade, index) in state.recentTrades.slice(0, 10)"
            :key="`trade-${trade.txId || index}-${index}`"
            :trade="trade"
            :show-fees="false"
            price-mode="both"
          />
        </div>
      </div>

      <!-- Liquidity Updates Sidebar -->
      <div>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">
            {{ $t("dashboard.liquidityUpdates") }}
          </h2>
        </div>

        <div v-if="!state.recentLiquidity.length" class="card text-center py-8">
          <p class="text-gray-400">
            {{
              state.connectionStatus
                ? $t("dashboard.waitingForLiquidity")
                : $t("dashboard.connectingToFeed")
            }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <LiquidityCard
            v-for="(liquidity, index) in state.recentLiquidity.slice(0, 10)"
            :key="`liquidity-${liquidity.txId || index}-${index}`"
            :liquidity="liquidity"
          />
        </div>
      </div>

      <!-- Pool Updates Sidebar -->
      <div>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">
            {{ $t("dashboard.poolUpdates") }}
          </h2>
        </div>

        <div v-if="!state.recentPools.length" class="card text-center py-8">
          <p class="text-gray-400">
            {{
              state.connectionStatus
                ? $t("dashboard.waitingForPoolUpdates")
                : $t("dashboard.connectingToFeed")
            }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <PoolCard
            v-for="(pool, index) in state.recentPools.slice(0, 10)"
            :key="`pool-${pool.poolAppId || index}-${index}`"
            :pool="pool"
          />
        </div>
      </div>

      <!-- Aggregated Pool Updates Sidebar -->
      <div>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">
            {{ $t("dashboard.aggregatedPools") }}
          </h2>
        </div>

        <div
          v-if="!filteredAggregatedPools.length"
          class="card text-center py-8"
        >
          <p class="text-gray-400">
            {{
              state.connectionStatus
                ? $t("dashboard.waitingForAggregatedPools")
                : $t("dashboard.connectingToFeed")
            }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <AggregatedPoolCard
            v-for="(pool, index) in filteredAggregatedPools"
            :key="`aggpool-${pool.id || index}-${index}`"
            :pool="pool"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { signalrService } from "../services/signalrService";
import type {
  AlgorandTransaction,
  AMMLiquidity,
  AMMTrade,
} from "../types/algorand";
import BlockCard from "../components/BlockCard.vue";
import TradeCard from "../components/TradeCard.vue";
import LiquidityCard from "../components/LiquidityCard.vue";
import PoolCard from "../components/PoolCard.vue";
import AggregatedPoolCard from "../components/AggregatedPoolCard.vue";
import AssetCard from "../components/AssetCard.vue";
import { BiatecBlock } from "../types/BiatecBlock";
import { AggregatedPool, BiatecAsset, Pool } from "../api/models";
import StyledBox from "../components/StyledBox.vue";
import FormattedNumber from "../components/FormattedNumber.vue";
import { createDashboardSubscriptionFilter } from "../types/SubscriptionFilter";

const { t } = useI18n();

const state = reactive({
  latestBlocks: [] as BiatecBlock[],
  recentTransactions: [] as AlgorandTransaction[],
  recentTrades: [] as AMMTrade[],
  recentLiquidity: [] as AMMLiquidity[],
  recentAssets: [] as BiatecAsset[],
  recentPools: [] as Pool[],
  recentAggregatedPools: [] as AggregatedPool[],
  aggregatedPoolsMap: {} as Record<string, AggregatedPool>,
  isLoading: true,
  isLoadingTransactions: true,
  connectionStatus: false,
  mounted: true,
  tokensToLoad: [] as bigint[],
  algoPrice: null as AggregatedPool | null,
});

// Top Aggregated Pools: only asset A = 0 (ALGO), sorted by reserve A desc, top 10
const filteredAggregatedPools = computed(() => {
  const all = Object.values(state.aggregatedPoolsMap);
  return all
    .filter((p) => p.assetIdA === 0)
    .sort((x, y) => (y.tvL_A ?? 0) - (x.tvL_A ?? 0))
    .slice(0, 10);
});

// Reactive current time for network status calculation
const currentTime = ref(Date.now());
let timeInterval: number | null = null;

const networkStatus = computed(() => {
  if (state.latestBlocks.length === 0)
    return { status: t("status.offline"), color: "text-red-400" };

  const latestBlock = state.latestBlocks[0];
  const now = new Date();
  const blockTime = new Date(latestBlock.timestamp);
  const timeDiff = now.getTime() - blockTime.getTime();

  // If latest block is less than 60 seconds old, consider network online
  if (timeDiff < 60000) {
    return { status: t("status.online"), color: "text-green-400" };
  } else {
    return { status: t("status.offline"), color: "text-red-400" };
  }
});

onMounted(async () => {
  // Set up SignalR for AMM trades

  signalrService.onBlockReceived(onBlockReceivedEvent);
  signalrService.onAggregatedPoolReceived(onAggregatedPoolReceivedEvent);
  signalrService.onTradeReceived(onTradeReceivedEvent);
  signalrService.onLiquidityReceived(onLiquidityReceivedEvent);
  signalrService.onPoolReceived(onPoolReceivedEvent);
  signalrService.onAssetReceived(onAssetReceivedEvent);

  await signalrService.subscribe(createDashboardSubscriptionFilter());
  state.mounted = true;

  // Update current time every second for network status calculation
  timeInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000) as unknown as number;
});

const onPoolReceivedEvent = (pool: Pool) => {
  try {
    if (pool && pool.poolAppId) {
      // Check if pool already exists in the list
      const existingIndex = state.recentPools.findIndex(
        (existingPool) => existingPool.poolAppId == pool.poolAppId
      );

      if (existingIndex !== -1) {
        // Pool already exists, replace it
        //console.log(`Updating existing pool ${pool.poolAppId}`);
        state.recentPools[existingIndex] = pool;
      } else {
        // New pool, add to beginning of list
        console.log(`Adding new pool ${pool.poolAppId}`);
        state.recentPools.unshift(pool);
        if (state.recentPools.length > 20) {
          state.recentPools = state.recentPools.slice(0, 20);
        }
      }
    }
  } catch (e) {
    console.error("Error handling pool update:", e);
  }
};
const onLiquidityReceivedEvent = (liquidity: AMMLiquidity) => {
  try {
    if (liquidity && liquidity.txId) {
      state.recentLiquidity.unshift(liquidity);
      if (state.recentLiquidity.length > 20) {
        state.recentLiquidity = state.recentLiquidity.slice(0, 20);
      }
    }
  } catch (e) {
    console.error("Error handling liquidity update:", e);
  }
};
const onAssetReceivedEvent = (asset: BiatecAsset) => {
  try {
    console.log("Asset received in dashboard:", asset);

    const existingIndex = state.recentAssets.findIndex(
      (t) => t.index === asset.index
    );

    if (existingIndex !== -1) {
      state.recentAssets[existingIndex] = asset;
    } else {
      state.recentAssets.unshift(asset);
      if (state.recentAssets.length > 20) {
        state.recentAssets = state.recentAssets.slice(0, 20);
      }
    }
  } catch (e) {
    console.error("Error handling asset update:", e);
  }
};
const onTradeReceivedEvent = (trade: AMMTrade) => {
  try {
    if (trade && trade.txId) {
      // Check if trade with same txId already exists
      const existingIndex = state.recentTrades.findIndex(
        (t) => t.txId === trade.txId
      );

      if (existingIndex !== -1) {
        // Trade already exists
        if (trade.tradeState === "Confirmed") {
          // Replace the existing trade with confirmed version
          // console.log(
          //   `Replacing existing trade ${trade.txId} with confirmed state`
          // );
          state.recentTrades[existingIndex] = trade;
        } else if (trade.tradeState === "TxPool") {
          // Ignore TxPool updates if trade already exists
          // console.log(
          //   `Ignoring TxPool update for existing trade ${trade.txId}`
          // );
          return;
        } else {
          // For any other state, replace the existing trade
          // console.log(
          //   `Replacing existing trade ${trade.txId} with state ${trade.tradeState}`
          // );
          state.recentTrades[existingIndex] = trade;
        }
      } else {
        // New trade, add to beginning of list
        // console.log(
        //   `Adding new trade ${trade.txId} with state ${trade.tradeState}`
        // );
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) {
          state.recentTrades = state.recentTrades.slice(0, 50);
        }
      }
    }
  } catch (e) {
    console.error("Error handling trade update:", e);
  }
};
const onAggregatedPoolReceivedEvent = (pool: AggregatedPool) => {
  try {
    //console.log("onAggregatedPoolReceived.pool", pool.id, pool);
    if (pool.id == "0-31566704") {
      // algo-usdc
      state.algoPrice = pool;
      console.log("Received aggregated pool algo-usdc:", pool);
    }
    // Store/update in dictionary for global lookup and filtering
    state.aggregatedPoolsMap[pool.id ?? ""] = pool;
    // Keep a recent list of aggregated pool updates
    const idx = state.recentAggregatedPools.findIndex((p) => p.id === pool.id);
    if (idx !== -1) {
      state.recentAggregatedPools[idx] = pool;
      // move updated item to front to reflect recency
      const updated = state.recentAggregatedPools.splice(idx, 1)[0];
      state.recentAggregatedPools.unshift(updated);
    } else {
      state.recentAggregatedPools.unshift(pool);
    }
    if (state.recentAggregatedPools.length > 50) {
      state.recentAggregatedPools = state.recentAggregatedPools.slice(0, 50);
    }
  } catch (e) {
    console.error("Error handling aggregated pool update:", e);
  }
};

const onBlockReceivedEvent = (block: BiatecBlock) => {
  try {
    console.log("onBlockReceived.block", block.round, block);
    state.latestBlocks = [block, ...state.latestBlocks.slice(0, 9)];
  } catch (error) {
    console.error("Error handling block update:", error);
  }
};
onUnmounted(async () => {
  signalrService.unsubscribeFromPoolUpdates(onPoolReceivedEvent);
  signalrService.unsubscribeFromLiquidityUpdates(onLiquidityReceivedEvent);
  signalrService.unsubscribeFromTradeUpdates(onTradeReceivedEvent);
  signalrService.unsubscribeFromAssetUpdates(onAssetReceivedEvent);
  signalrService.unsubscribeFromAggregatedPoolUpdates(
    onAggregatedPoolReceivedEvent
  );
  signalrService.unsubscribeFromBlockUpdates(onBlockReceivedEvent);

  if (timeInterval) {
    clearInterval(timeInterval);
  }
  await signalrService.unsubscribe();
  state.mounted = false;
});
</script>
