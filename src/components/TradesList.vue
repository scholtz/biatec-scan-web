<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <router-link
        v-if="props.assetId"
        :to="{ name: 'TradesByAsset', params: { assetId1: props.assetId } }"
        class="text-lg font-semibold text-white hover:text-blue-300 transition-colors"
      >
        {{ $t("assetDetails.recentTrades") }}
      </router-link>
      <h3 v-else class="text-lg font-semibold text-white">
        {{ $t("poolDetails.recentTrades") }}
      </h3>
      <div v-if="loading" class="text-sm text-gray-400">
        {{ $t("common.loading") }}...
      </div>
    </div>

    <div v-if="error" class="text-red-400 text-sm bg-red-900/20 p-3 rounded">
      {{ error }}
    </div>

    <div
      v-if="!loading && trades.length === 0"
      class="text-gray-400 text-center py-8"
    >
      {{
        props.assetId ? $t("assetDetails.noTrades") : $t("poolDetails.noTrades")
      }}
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="trade in trades"
        :key="`${trade.txId}-${trade.timestamp}`"
        class="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800/70 transition-colors"
      >
        <TradeCard
          :trade="convertToAMMTrade(trade)"
          :extendedDisplay="true"
          :price-mode="props.assetId ? 'selected' : 'both'"
          :selected-asset-id="props.assetId"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import type { Trade } from "../api/models";
import { getAVMTradeReporterAPI } from "../api";
import { signalrService } from "../services/signalrService";
import type { AMMTrade } from "../types/algorand";
import type { SubscriptionFilter } from "../types/SubscriptionFilter";
import TradeCard from "./TradeCard.vue";

const { t } = useI18n();

// Either assetId or poolAddress must be provided: assetId scopes the list to
// trades touching an asset, poolAddress scopes it to a single pool.
const props = defineProps<{
  assetId?: string;
  poolAddress?: string;
}>();

const trades = ref<Trade[]>([]);
const loading = ref(false);
const error = ref<string>("");
let subscriptionFilter: SubscriptionFilter | null = null;

// Convert Trade API model to AMMTrade interface expected by TradeCard
function convertToAMMTrade(trade: Trade): AMMTrade {
  return {
    assetIdIn: BigInt(trade.assetIdIn ?? 0),
    assetIdOut: BigInt(trade.assetIdOut ?? 0),
    assetAmountIn: trade.assetAmountIn ?? 0,
    assetAmountOut: trade.assetAmountOut ?? 0,
    valueUSD: trade.valueUSD ?? null,
    priceAssetInUSD: trade.priceAssetInUSD ?? null,
    priceAssetOutUSD: trade.priceAssetOutUSD ?? null,
    feesUSD: trade.feesUSD ?? null,
    feesUSDProvider: trade.feesUSDProvider ?? null,
    feesUSDProtocol: trade.feesUSDProtocol ?? null,
    txId: trade.txId ?? "",
    blockId: BigInt(trade.blockId ?? 0),
    txGroup: trade.txGroup ?? "",
    timestamp: trade.timestamp ?? "",
    protocol: trade.protocol ?? "Biatec",
    trader: trade.trader ?? "",
    poolAddress: trade.poolAddress ?? "",
    poolAppId: BigInt(trade.poolAppId ?? 0),
    topTxId: trade.topTxId ?? "",
    tradeState: trade.tradeState ?? "Confirmed",
  };
}

async function fetchTrades() {
  if (props.poolAddress) {
    // Pool mode ignores assetId entirely
  } else if (!props.assetId || props.assetId === "0") {
    return;
  }

  try {
    loading.value = true;
    error.value = "";

    // `assetId` matches trades where the asset is on either side, and (unlike
    // the plain assetIdIn/assetIdOut filters) returns a PagedResult with
    // `items` rather than a bare array.
    const api = getAVMTradeReporterAPI();
    const response = await api.getApiTrade({
      ...(props.poolAddress
        ? { poolAddress: props.poolAddress }
        : { assetId: Number(props.assetId) }),
      size: 20, // Fetch last 20 trades
      sortBy: "timestamp",
      sortDirection: "desc",
    });

    trades.value = response.data?.items || [];
  } catch (err: unknown) {
    console.error("Error fetching trades:", err);
    error.value = t("assetDetails.tradesFetchError");
  } finally {
    loading.value = false;
  }
}

function tradeMatchesScope(trade: AMMTrade): boolean {
  if (props.poolAddress) {
    return trade.poolAddress === props.poolAddress;
  }
  return (
    trade.assetIdIn.toString() === props.assetId ||
    trade.assetIdOut.toString() === props.assetId
  );
}

function handleTradeUpdate(trade: AMMTrade) {
  // Only add trades for this component's asset or pool scope
  if (tradeMatchesScope(trade)) {
    // Convert AMMTrade back to Trade for consistency
    const apiTrade: Trade = {
      assetIdIn: Number(trade.assetIdIn),
      assetIdOut: Number(trade.assetIdOut),
      assetAmountIn: trade.assetAmountIn,
      assetAmountOut: trade.assetAmountOut,
      valueUSD: trade.valueUSD ?? null,
      priceAssetInUSD: trade.priceAssetInUSD ?? null,
      priceAssetOutUSD: trade.priceAssetOutUSD ?? null,
      feesUSD: trade.feesUSD ?? null,
      feesUSDProvider: trade.feesUSDProvider ?? null,
      feesUSDProtocol: trade.feesUSDProtocol ?? null,
      txId: trade.txId,
      blockId: Number(trade.blockId),
      txGroup: trade.txGroup,
      timestamp: trade.timestamp,
      protocol: trade.protocol,
      trader: trade.trader,
      poolAddress: trade.poolAddress,
      poolAppId: Number(trade.poolAppId),
      topTxId: trade.topTxId,
      tradeState: trade.tradeState,
    };

    // Check if trade with same txId already exists
    const existingIndex = trades.value.findIndex(
      (t) => t.txId === apiTrade.txId,
    );

    if (existingIndex !== -1) {
      // Trade already exists
      if (trade.tradeState === "Confirmed") {
        // Replace the existing trade with confirmed version
        trades.value[existingIndex] = apiTrade;
      } else if (trade.tradeState === "TxPool") {
        // Ignore TxPool updates if trade already exists
        return;
      } else {
        // For any other state, replace the existing trade
        trades.value[existingIndex] = apiTrade;
      }
    } else {
      // New trade, add to list, sort by timestamp, and keep only 20 most recent
      const updatedTrades = [apiTrade, ...trades.value];
      updatedTrades.sort(
        (a, b) =>
          new Date(b.timestamp || 0).getTime() -
          new Date(a.timestamp || 0).getTime(),
      );
      trades.value = updatedTrades.slice(0, 20);
    }
  }
}

onMounted(() => {
  fetchTrades();
  signalrService.onTradeReceived(handleTradeUpdate);

  // Subscribe to trades for this component's asset or pool scope
  subscriptionFilter = {
    RecentBlocks: false,
    RecentTrades: true,
    RecentLiquidity: false,
    RecentPool: false,
    RecentAggregatedPool: false,
    RecentAssets: false,
    MainAggregatedPools: false,
    PoolsAddresses: props.poolAddress ? [props.poolAddress] : [],
    AggregatedPoolsIds: [],
    AssetIds: props.poolAddress || !props.assetId ? [] : [props.assetId],
  };
  signalrService.subscribe(subscriptionFilter);
});

onUnmounted(() => {
  signalrService.unsubscribeFromTradeUpdates(handleTradeUpdate);
  if (subscriptionFilter) {
    signalrService.unsubscribeFilter(subscriptionFilter);
  }
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>
