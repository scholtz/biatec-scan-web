<template>
  <div class="card border-l-4 border-l-purple-500">
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-gray-400">
        <FormattedTime :timestamp="pool.timestamp || Date.now().toString()" />
      </span>
      <span class="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
        {{ pool.protocol }}
      </span>
    </div>

    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Pool ID:</span>
        <router-link
          :to="{
            name: 'PoolDetails',
            params: { poolAddress: pool.poolAddress },
          }"
          class="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
        >
          {{ pool.poolAppId.toString() }}
        </router-link>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Asset A:</span>
        <span class="text-sm text-white">
          {{ formattedAssetA }}
          <span class="text-xs text-gray-400">({{ pool.assetIdA }})</span>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Asset B:</span>
        <span class="text-sm text-white">
          {{ formattedAssetB }}
          <span class="text-xs text-gray-400">({{ pool.assetIdB }})</span>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">LP Token:</span>
        <span class="text-sm text-white">
          {{ formattedAssetLP }}
          <span class="text-xs text-gray-400">({{ pool.assetIdLP }})</span>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Pool Address:</span>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: pool.poolAddress },
          }"
          class="text-xs text-blue-400 hover:text-blue-300 font-mono truncate ml-2 transition-colors duration-200"
          :title="pool.poolAddress"
        >
          {{ formatAddress(pool.poolAddress) }}
        </router-link>
      </div>

      <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-700">
        <div class="text-center">
          <div class="text-xs text-gray-400">Reserve A</div>
          <div class="text-sm text-white">{{ formattedReserveA }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400">Reserve B</div>
          <div class="text-sm text-white">{{ formattedReserveB }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400">LP Supply</div>
          <div class="text-sm text-white">{{ formattedLPSupply }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";
import type { AMMPool } from "../types/algorand";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";

interface Props {
  pool: AMMPool;
}

const props = defineProps<Props>();

const state = reactive({
  forceUpdate: 0, // Used to trigger reactivity when assets are loaded
});

const formattedAssetA = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  if (props.pool.assetIdA === undefined) return "N/A";
  return getAssetName(props.pool.assetIdA);
});

const formattedAssetB = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  if (props.pool.assetIdB === undefined) return "N/A";
  return getAssetName(props.pool.assetIdB);
});

const formattedAssetLP = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  if (!props.pool.assetIdLP) return "N/A";
  return getAssetName(props.pool.assetIdLP);
});

const formattedReserveA = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  if (!props.pool.a || props.pool.assetIdA == undefined) return "0";
  return assetService.formatAssetBalance(props.pool.a, props.pool.assetIdA);
});

const formattedReserveB = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  //console.log("props.pool", props.pool);
  if (!props.pool.b || props.pool.assetIdB == undefined) return "0";
  return assetService.formatAssetBalance(props.pool.b, props.pool.assetIdB);
});

const formattedLPSupply = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  if (!props.pool.l || props.pool.assetIdLP == undefined) return "0";
  return assetService.formatAssetBalance(props.pool.l, props.pool.assetIdLP);
});

const getAssetName = (assetId: bigint): string => {
  const assetInfo = assetService.getAssetInfo(assetId);
  if (!assetInfo) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(assetId, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  return assetInfo.name || assetInfo.unitName || `Asset ${assetId}`;
};

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
</script>
