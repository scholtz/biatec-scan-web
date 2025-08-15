<template>
  <div class="card border-l-4 border-l-blue-500">
    <div class="text-center" v-if="formattedPrice">
      <span class="text-white text-lg font-bold">{{ formattedPrice }}</span>
    </div>
    <div class="flex flex-row w-full">
      <div class="text-right w-full flex-grow">
        <p class="text-xs text-gray-400 mb-1">
          <router-link
            :to="{ name: 'AddressDetails', params: { address: trade.trader } }"
            class="text-blue-400 hover:text-blue-300 transition-colors duration-200"
            :title="trade.trader"
          >
            {{ algorandService.formatAddress(trade.trader) }}
          </router-link>
          Sold
        </p>
        <p class="text-white text-sm">
          {{ formattedAssetIn }}
        </p>
        <p class="text-xs text-gray-500">ID: {{ trade.assetIdIn }}</p>
      </div>
      <div
        class="flex flex-col min-w-20 items-center justify-center"
        style="width: 1.5rem"
      >
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center"
          :class="
            props.trade.tradeState === 'TxPool' ? 'bg-red-600' : 'bg-blue-600'
          "
        >
          <span class="text-white text-xs font-bold">⇄</span>
        </div>
        <p class="text-xs text-gray-400 text-center mt-2">
          <FormattedTime :timestamp="trade.timestamp" />
        </p>
      </div>
      <div class="w-full flex-grow">
        <p class="text-xs text-gray-400 mb-1 flex">
          <span>Bought</span>
          <router-link
            :to="{ name: 'TransactionDetails', params: { txId: trade.txId } }"
            class="text-primary-400 hover:text-primary-300 text-xs transition-colors duration-200 ml-2"
          >
            View Tx
          </router-link>
        </p>
        <p class="text-white text-sm">
          {{ formattedAssetOut }}
        </p>
        <p class="text-xs text-gray-500">ID: {{ trade.assetIdOut }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import type { AMMTrade } from "../types/algorand";
import { algorandService } from "../services/algorandService";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";

const state = reactive({
  forceUpdate: 0, // Used to trigger reactivity when assets are loaded
});

const props = defineProps<{
  trade: AMMTrade;
}>();

const formattedAssetIn = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  return formatAssetBalance(
    props.trade.assetAmountIn,
    BigInt(props.trade.assetIdIn)
  );
});

const formattedAssetOut = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;

  if (props.trade.tradeState === "TxPool") {
    return "Trade is in the mempool";
  }

  return formatAssetBalance(
    props.trade.assetAmountOut,
    BigInt(props.trade.assetIdOut)
  );
});

const formattedPrice = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;

  if (props.trade.tradeState === "TxPool") {
    return "";
  }
  if (
    assetService.needToReverseAssets(
      props.trade.assetIdIn,
      props.trade.assetIdOut
    )
  ) {
    return formatSwapPrice(
      props.trade.assetAmountOut,
      props.trade.assetAmountIn,
      BigInt(props.trade.assetIdOut),
      BigInt(props.trade.assetIdIn)
    );
  }
  return formatSwapPrice(
    props.trade.assetAmountIn,
    props.trade.assetAmountOut,
    BigInt(props.trade.assetIdIn),
    BigInt(props.trade.assetIdOut)
  );
});

const formatSwapPrice = (
  balanceIn: bigint | number,
  balanceOut: bigint | number,
  assetIdIn: bigint,
  assetIdOut: bigint
): string => {
  if (
    balanceIn === 0n ||
    balanceIn === 0 ||
    balanceOut === 0n ||
    balanceOut === 0
  )
    return "0";

  const assetInfoIn = assetService.getAssetInfo(assetIdIn);
  const assetInfoOut = assetService.getAssetInfo(assetIdOut);
  if (!assetInfoIn) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(assetIdIn, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  if (!assetInfoOut) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(assetIdOut, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  const priceAssetIn = Number(balanceIn) / 10 ** assetInfoIn.decimals;
  const priceAssetOut = Number(balanceOut) / 10 ** assetInfoOut.decimals;

  const swapPrice = priceAssetIn / priceAssetOut;
  if (isNaN(swapPrice) || !isFinite(swapPrice)) {
    return "Invalid Price";
  }
  // round to 4 digits os significant figures
  // find significant figures .. calculate zeroes to the right, and add 4 digits
  // for example, if swapPrice is
  //  19 significantIndex = 2
  //  10 significantIndex = 2
  //  1 significantIndex = 1
  //  0 significantIndex = 0
  //  0.1 significantIndex = -1
  //  0.9 significantIndex = -1
  //  0.001 significantIndex = -3

  const significantIndex = Math.floor(Math.log10(swapPrice));
  const roundPlaces = Math.max(0, -1 * (significantIndex - 4));
  const priceStr = swapPrice.toFixed(roundPlaces);
  return `${priceStr} ${assetInfoOut.unitName ?? assetInfoOut.name}/${assetInfoIn.unitName ?? assetInfoIn.name}`;
};

const formatAssetBalance = (
  balance: bigint | number,
  assetId: bigint
): string => {
  if (balance === 0n || balance === 0) return "0";

  const assetInfo = assetService.getAssetInfo(assetId);
  if (!assetInfo) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(assetId, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }

  return assetService.formatAssetBalance(balance, assetId);
};
</script>
