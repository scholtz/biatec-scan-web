<template>
  <div class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header Stats -->
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-8"
    >
      <div class="card text-center">
        <h3 class="text-2xl font-bold text-white mb-2">
          {{ state.latestBlocks[0]?.round.toLocaleString() || "..." }}
        </h3>
        <p class="text-gray-400">Latest Block</p>
      </div>
      <div class="card text-center">
        <h3 class="text-2xl font-bold text-white mb-2">
          {{ totalTransactions.toLocaleString() }}
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

    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
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
            v-for="(block, idx) in state.latestBlocks"
            :key="block.round.toString()"
            :block="block"
            :previousBlock="
              state.latestBlocks.length > idx
                ? state.latestBlocks[idx + 1]
                : null
            "
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, reactive, ref } from "vue";
import { algorandService } from "../services/algorandService";
import { signalrService } from "../services/signalrService";
import type {
  AlgorandTransaction,
  AMMLiquidity,
  AMMTrade,
} from "../types/algorand";
import BlockCard from "../components/BlockCard.vue";
import TradeCard from "../components/TradeCard.vue";
import LiquidityCard from "../components/LiquidityCard.vue";
import algosdk from "algosdk";
import { getTokenFromLocalStorage } from "../scripts/algo/getTokenFromLocalStorage";

const state = reactive({
  latestBlocks: [] as algosdk.BlockHeader[],
  recentTransactions: [] as AlgorandTransaction[],
  recentTrades: [] as AMMTrade[],
  recentLiquidity: [] as AMMLiquidity[],
  isLoading: true,
  isLoadingTransactions: true,
  connectionStatus: false,
  mounted: true,
  tokensToLoad: [] as bigint[],
});

// Reactive current time for network status calculation
const currentTime = ref(Date.now());
let refreshInterval: number | null = null;
let timeInterval: number | null = null;

const totalTransactions = computed(() => {
  // Return the total transaction count from the latest block (txnCounter is cumulative from inception)
  return state.latestBlocks.length > 0
    ? Number(state.latestBlocks[0].txnCounter)
    : 0;
});

const networkStatus = computed(() => {
  if (state.latestBlocks.length === 0)
    return { status: "OFFLINE", color: "text-red-400" };

  const latestBlock = state.latestBlocks[0];
  const now = Math.floor(currentTime.value / 1000);
  const blockTime = Number(latestBlock.timestamp);
  const timeDiff = now - blockTime;

  // If latest block is less than 60 seconds old, consider network online
  if (timeDiff < 60) {
    return { status: "ONLINE", color: "text-green-400" };
  } else {
    return { status: "OFFLINE", color: "text-red-400" };
  }
});

const formatAssetBalance = (balance: bigint, assetId: bigint): string => {
  if (balance === 0n) return "0";
  const assetInfo = getTokenFromLocalStorage(assetId);
  if (assetInfo == null) {
    if (state.tokensToLoad.find((t) => t === assetId) == null) {
      state.tokensToLoad.push(assetId);
    }
    return "Loading asset info...";
  }

  return `${(balance / BigInt(10 ** assetInfo.decimals)).toLocaleString()} ${assetInfo.unitName ?? assetInfo.name}`;
};

const refreshBlocks = async () => {
  state.isLoading = true;
  try {
    const blocks = await algorandService.getLatestBlocks(11);
    if (blocks) {
      state.latestBlocks = blocks;
    }
    // Load transactions for the latest few blocks
    if (blocks.length > 0) {
      state.isLoadingTransactions = true;
      const txPromises = blocks
        .slice(0, 5)
        .map((block) => algorandService.getBlockTransactions(block.round));
      const txResults = await Promise.all(txPromises);
      const allTransactions: AlgorandTransaction[] = [];
      txResults.forEach((txArray) => allTransactions.push(...txArray));
      state.recentTransactions = allTransactions.slice(0, 50);
      state.isLoadingTransactions = false;
    }
  } catch (error) {
    console.error("Error refreshing blocks:", error);
  }
  state.isLoading = false;
};

onMounted(async () => {
  await refreshBlocks();

  // Set up real-time updates
  //refreshInterval = setInterval(refreshBlocks, 30000) as unknown as number; // Refresh every 30 seconds

  // Set up SignalR for AMM trades
  try {
    signalrService.onTradeReceived((trade: AMMTrade) => {
      if (trade && trade.txId) {
        state.recentTrades.unshift(trade);
        if (state.recentTrades.length > 50) {
          state.recentTrades = state.recentTrades.slice(0, 50);
        }
      }
    });
  } catch (error) {
    console.error("Error setting up SignalR trade handler:", error);
  }
  try {
    signalrService.onLiquidityReceived((liquidity: AMMLiquidity) => {
      if (liquidity && liquidity.txId) {
        state.recentLiquidity.unshift(liquidity);
        if (state.recentLiquidity.length > 50) {
          state.recentLiquidity = state.recentLiquidity.slice(0, 50);
        }
      }
    });
  } catch (error) {
    console.error("Error setting up SignalR liquidity handler:", error);
  }
  // Check connection status
  // setInterval(() => {
  //   try {
  //     const status = signalrService?.getConnectionState();
  //     if (status !== null) {
  //       state.connectionStatus = status;
  //     }
  //   } catch (error) {
  //     console.error("Error checking connection status:", error);
  //     state.connectionStatus = false;
  //   }
  // }, 5000);
  state.mounted = true;

  // Update current time every second for network status calculation
  timeInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000) as unknown as number;

  await refreshData(); // run async function without waiting on purpose
});

async function refreshData() {
  let latest = state.latestBlocks[0]?.round;
  while (state.mounted) {
    const block = await algorandService.getBlock(latest + 1n);
    if (block && block.round == latest + 1n) {
      state.latestBlocks = [block, ...state.latestBlocks.slice(0, 9)];
      latest = state.latestBlocks[0]?.round;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 5 seconds before next refresh
  }
}

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  if (timeInterval) {
    clearInterval(timeInterval);
  }
  state.mounted = false;
});
</script>
