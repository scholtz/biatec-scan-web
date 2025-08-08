<template>
  <div class="card">
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-gray-400">
        <FormattedTime :timestamp="liquidity.timestamp" />
      </span>
      <span
        class="text-xs px-2 py-1 rounded"
        :class="
          liquidity.direction === 'Add'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        "
      >
        {{ liquidity.direction }} LP
      </span>
    </div>

    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Pool:</span>
        <span class="text-sm text-white truncate ml-2">
          {{ liquidity.poolAppId }}
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Asset A:</span>
        <span class="text-sm text-white">
          {{ formattedAssetA }}
          <span class="text-xs text-gray-400">({{ liquidity.assetIdA }})</span>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Asset B:</span>
        <span class="text-sm text-white">
          {{ formattedAssetB }}
          <span class="text-xs text-gray-400">({{ liquidity.assetIdB }})</span>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">LP Tokens:</span>
        <span class="text-sm text-white">
          {{ formattedAssetLP }}
          <span class="text-xs text-gray-400">({{ liquidity.assetIdLP }})</span>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Provider:</span>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: liquidity.liquidityProvider },
          }"
          class="text-xs text-blue-400 hover:text-blue-300 font-mono truncate ml-2 transition-colors duration-200"
          :title="liquidity.liquidityProvider"
        >
          {{ formatAddress(liquidity.liquidityProvider) }}
        </router-link>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Protocol:</span>
        <span class="text-xs text-purple-400">
          {{ liquidity.protocol }}
        </span>
      </div>
    </div>

    <div class="mt-3 pt-3 border-t border-gray-700">
      <div class="text-xs text-gray-500 truncate">TX: {{ liquidity.txId }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";
import type { AMMLiquidity } from "../types/algorand";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";

interface Props {
  liquidity: AMMLiquidity;
}

const props = defineProps<Props>();

const state = reactive({
  forceUpdate: 0, // Used to trigger reactivity when assets are loaded
});

const formattedAssetA = computed(() => {
  void state.forceUpdate;
  const assetInfo = assetService.getAssetInfo(BigInt(props.liquidity.assetIdA));
  if (!assetInfo) {
    assetService.requestAsset(BigInt(props.liquidity.assetIdA), () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  return assetService.formatAssetBalance(
    props.liquidity.assetAmountA,
    BigInt(props.liquidity.assetIdA)
  );
});

const formattedAssetB = computed(() => {
  void state.forceUpdate;
  const assetInfo = assetService.getAssetInfo(BigInt(props.liquidity.assetIdB));
  if (!assetInfo) {
    assetService.requestAsset(BigInt(props.liquidity.assetIdB), () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  return assetService.formatAssetBalance(
    props.liquidity.assetAmountB,
    BigInt(props.liquidity.assetIdB)
  );
});

const formattedAssetLP = computed(() => {
  void state.forceUpdate;
  const assetInfo = assetService.getAssetInfo(
    BigInt(props.liquidity.assetIdLP)
  );
  if (!assetInfo) {
    assetService.requestAsset(BigInt(props.liquidity.assetIdLP), () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  return assetService.formatAssetBalance(
    props.liquidity.assetAmountLP,
    BigInt(props.liquidity.assetIdLP)
  );
});

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
</script>
