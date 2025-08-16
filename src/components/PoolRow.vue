<template>
  <div
    class="grid grid-cols-1 md:grid-cols-8 gap-3 items-center p-2 rounded bg-gray-800/40 hover:bg-gray-800/60"
  >
    <!-- Protocol -->
    <div class="order-2 md:order-none">
      <span
        class="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300"
        >{{ pool.protocol }}</span
      >
    </div>

    <!-- Pool ID -->
    <div class="order-1 md:order-none">
      <router-link
        :to="{ name: 'PoolDetails', params: { poolAddress: pool.poolAddress } }"
        class="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
      >
        {{ pool.poolAppId.toString() }}
      </router-link>
    </div>

    <!-- Pair -->
    <div class="order-3 md:order-none text-sm text-white">
      {{ formattedAssetA }}
      <span class="text-gray-400">/</span>
      {{ formattedAssetB }}
      <div class="text-xs text-gray-400">
        ({{ pool.assetIdA ?? "—" }} / {{ pool.assetIdB ?? "—" }})
      </div>
    </div>

    <!-- Reserve A -->
    <div class="order-4 md:order-none text-sm text-white">
      {{ formattedReserveA }}
    </div>

    <!-- Reserve B -->
    <div class="order-5 md:order-none text-sm text-white">
      {{ formattedReserveB }}
    </div>

    <!-- LP Supply -->
    <div class="order-6 md:order-none text-sm text-white">
      {{ formattedLPSupply }}
    </div>

    <!-- Address -->
    <div class="order-7 md:order-none">
      <router-link
        :to="{ name: 'AddressDetails', params: { address: pool.poolAddress } }"
        class="text-xs text-blue-400 hover:text-blue-300 font-mono truncate transition-colors duration-200"
        :title="pool.poolAddress"
      >
        {{ formatAddress(pool.poolAddress) }}
      </router-link>
    </div>

    <!-- Time -->
    <div class="order-8 md:order-none text-right md:text-left">
      <span class="text-xs text-gray-400">
        <FormattedTime :timestamp="pool.timestamp || Date.now().toString()" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted } from "vue";
import type { AMMPool } from "../types/algorand";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";
import { signalrService } from "../services/signalrService";

interface Props {
  pool: AMMPool;
}

const props = defineProps<Props>();

const state = reactive({ forceUpdate: 0, pool: props.pool });
onMounted(() => {
  state.pool = props.pool;
  if (
    assetService.needToReverseAssets(
      state.pool.assetIdA ?? 0n,
      state.pool.assetIdB ?? 0n
    )
  ) {
    const temp = state.pool.assetIdA;
    state.pool.assetIdA = state.pool.assetIdB;
    state.pool.assetIdB = temp;

    const tmpAmount = state.pool.a;
    state.pool.a = state.pool.b;
    state.pool.b = tmpAmount;

    const tmpLP = state.pool.l;
    state.pool.l = state.pool.b;
    state.pool.b = tmpLP;

    state.pool.isReversed = true;
  }

  signalrService.onPoolReceived(poolUpdate);
});

onUnmounted(() => {
  signalrService.unsubscribeFromPoolUpdates(poolUpdate);
});

const poolUpdate = (pool: AMMPool) => {
  if (pool.poolAppId === state.pool.poolAppId) {
    state.pool = pool;
  }
};

const getAssetName = (assetId?: bigint): string => {
  if (assetId === undefined || assetId === null) return "N/A";
  // force re-compute when asset arrives
  void state.forceUpdate;
  const info = assetService.getAssetInfo(assetId);
  if (!info) {
    assetService.requestAsset(assetId, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  return info.name || info.unitName || `Asset ${assetId}`;
};

const formattedAssetA = computed(() => getAssetName(props.pool.assetIdA));
const formattedAssetB = computed(() => getAssetName(props.pool.assetIdB));

const formattedReserveA = computed(() => {
  void state.forceUpdate;
  if (!props.pool.a || props.pool.assetIdA === undefined) return "0";
  return assetService.formatAssetBalance(props.pool.a, props.pool.assetIdA);
});

const formattedReserveB = computed(() => {
  void state.forceUpdate;
  if (!props.pool.b || props.pool.assetIdB === undefined) return "0";
  return assetService.formatAssetBalance(props.pool.b, props.pool.assetIdB);
});

const formattedLPSupply = computed(() => {
  void state.forceUpdate;
  if (!props.pool.l || props.pool.assetIdLP === undefined) return "0";
  return assetService.formatAssetBalance(props.pool.l, props.pool.assetIdLP);
});

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
</script>

<style scoped></style>
