<template>
  <div class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header Stats -->
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 mb-8"
    >
      <div class="card text-center">
        <h3 class="text-2xl font-bold text-white" v-if="state.algoPrice">
          <div>
            {{
              new Number(state.algoPrice.b / state.algoPrice.a).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 6,
                  maximumFractionDigits: 6,
                }
              )
            }}
          </div>
        </h3>
        <h3 class="text-2xl font-bold text-gray-400" v-else>Loading...</h3>
        <p class="text-gray-400">ALGO/USD</p>
      </div>
      <div class="card text-center">
        <h3 class="text-2xl font-bold text-white mb-2">
          {{ state.latestBlocks[0]?.round.toLocaleString() || "..." }}
        </h3>
        <p class="text-gray-400">Latest Block</p>
      </div>
      <div class="card text-center">
        <h3 class="text-2xl font-bold text-white mb-2">
          {{
            state.latestBlocks[0]?.totalTransactions.toLocaleString() || "..."
          }}
        </h3>
        <p class="text-gray-400">Total Transactions</p>
      </div>
      <div class="card text-center">
        <h3 class="text-2xl font-bold" :class="networkStatus.color">
          {{ networkStatus.status }}
        </h3>
        <p class="text-gray-400">Network Status</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-8">
      <!-- Latest Blocks -->
      <div class="">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-white">Latest Blocks</h2>
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
          <h2 class="text-xl font-bold text-white">Live AMM Trades</h2>
        </div>

        <div v-if="!state.recentTrades.length" class="card text-center py-8">
          <p class="text-gray-400">
            {{
              state.connectionStatus
                ? "Waiting for trades..."
                : "Connecting to live feed..."
            }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <TradeCard
            v-for="(trade, index) in state.recentTrades.slice(0, 10)"
            :key="`trade-${trade.txId || index}-${index}`"
            :trade="trade"
          />
        </div>
      </div>

      <!-- Liquidity Updates Sidebar -->
      <div>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">Liquidity Updates</h2>
        </div>

        <div v-if="!state.recentLiquidity.length" class="card text-center py-8">
          <p class="text-gray-400">
            {{
              state.connectionStatus
                ? "Waiting for liquidity updates..."
                : "Connecting to live feed..."
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
          <h2 class="text-xl font-bold text-white">Pool Updates</h2>
        </div>

        <div v-if="!state.recentPools.length" class="card text-center py-8">
          <p class="text-gray-400">
            {{
              state.connectionStatus
                ? "Waiting for pool updates..."
                : "Connecting to live feed..."
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
          <h2 class="text-xl font-bold text-white">Aggregated Pools</h2>
        </div>

        <div
          v-if="!filteredAggregatedPools.length"
          class="card text-center py-8"
        >
          <p class="text-gray-400">
            {{
              state.connectionStatus
                ? "Waiting for aggregated pool updates..."
                : "Connecting to live feed..."
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
import { signalrService } from "../services/signalrService";
import type {
  AlgorandTransaction,
  AMMLiquidity,
  AMMTrade,
  AMMPool,
} from "../types/algorand";
import BlockCard from "../components/BlockCard.vue";
import TradeCard from "../components/TradeCard.vue";
import LiquidityCard from "../components/LiquidityCard.vue";
import PoolCard from "../components/PoolCard.vue";
import AggregatedPoolCard from "../components/AggregatedPoolCard.vue";
import { AMMAggregatedPool } from "../types/AMMAggregatedPool";
import { BiatecBlock } from "../types/BiatecBlock";

const state = reactive({
  latestBlocks: [] as BiatecBlock[],
  recentTransactions: [] as AlgorandTransaction[],
  recentTrades: [] as AMMTrade[],
  recentLiquidity: [] as AMMLiquidity[],
  recentPools: [] as AMMPool[],
  recentAggregatedPools: [] as AMMAggregatedPool[],
  aggregatedPoolsMap: {} as Record<string, AMMAggregatedPool>,
  isLoading: true,
  isLoadingTransactions: true,
  connectionStatus: false,
  mounted: true,
  tokensToLoad: [] as bigint[],
  algoPrice: null as AMMAggregatedPool | null,
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
    return { status: "OFFLINE", color: "text-red-400" };

  const latestBlock = state.latestBlocks[0];
  const now = new Date();
  const blockTime = new Date(latestBlock.timestamp);
  const timeDiff = now.getTime() - blockTime.getTime();

  // If latest block is less than 60 seconds old, consider network online
  if (timeDiff < 60000) {
    return { status: "ONLINE", color: "text-green-400" };
  } else {
    return { status: "OFFLINE", color: "text-red-400" };
  }
});

onMounted(async () => {
  // Set up SignalR for AMM trades

  signalrService.onBlockReceived(onBlockReceivedEvent);
  signalrService.onAggregatedPoolReceived(onAggregatedPoolReceivedEvent);
  signalrService.onTradeReceived(onTradeReceivedEvent);
  signalrService.onLiquidityReceived(onLiquidityReceivedEvent);
  signalrService.onPoolReceived(onPoolReceivedEvent);

  await signalrService.subscribeToTrades("");
  state.mounted = true;

  // Update current time every second for network status calculation
  timeInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000) as unknown as number;
});

const onPoolReceivedEvent = (pool: AMMPool) => {
  try {
    if (pool && pool.poolAppId) {
      // Check if pool already exists in the list
      const existingIndex = state.recentPools.findIndex(
        (existingPool) => existingPool.poolAppId === pool.poolAppId
      );

      if (existingIndex !== -1) {
        // Pool already exists, replace it
        //console.log(`Updating existing pool ${pool.poolAppId}`);
        state.recentPools[existingIndex] = pool;
      } else {
        // New pool, add to beginning of list
        console.log(`Adding new pool ${pool.poolAppId}`);
        state.recentPools.unshift(pool);
        if (state.recentPools.length > 50) {
          state.recentPools = state.recentPools.slice(0, 50);
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
      if (state.recentLiquidity.length > 50) {
        state.recentLiquidity = state.recentLiquidity.slice(0, 50);
      }
    }
  } catch (e) {
    console.error("Error handling liquidity update:", e);
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
const onAggregatedPoolReceivedEvent = (pool: AMMAggregatedPool) => {
  try {
    //console.log("onAggregatedPoolReceived.pool", pool.id, pool);
    if (pool.id == "0-31566704") {
      // algo-usdc
      state.algoPrice = pool;
      console.log("Received aggregated pool algo-usdc:", pool);
    }
    // Store/update in dictionary for global lookup and filtering
    state.aggregatedPoolsMap[pool.id] = pool;
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
  signalrService.unsubscribeFromAggregatedPoolUpdates(
    onAggregatedPoolReceivedEvent
  );
  signalrService.unsubscribeFromBlockUpdates(onBlockReceivedEvent);

  if (timeInterval) {
    clearInterval(timeInterval);
  }
  await signalrService.unsubscribeToTrades("");
  state.mounted = false;
});
</script>
