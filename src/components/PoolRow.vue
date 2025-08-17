<template>
  <div
    class="grid grid-cols-1 md:grid-cols-8 gap-3 items-center p-2 rounded bg-gray-800/40 hover:bg-gray-800/60"
  >
    <!-- Protocol -->
    <div class="order-2 md:order-none">
      <span class="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
        {{ state.pool.protocol }}
      </span>
    </div>

    <!-- Pool ID -->
    <div class="order-1 md:order-none">
      <router-link
        v-if="state.pool.poolAppId"
        :to="{
          name: 'PoolDetails',
          params: { poolAddress: state.pool.poolAddress },
        }"
        class="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
      >
        {{ state.pool.poolAppId.toString() }}
      </router-link>
    </div>

    <!-- Price -->
    <div class="order-3 md:order-none text-sm text-white">
      {{ formattedAssetA }}
      <span class="text-gray-400">/</span>
      {{ formattedAssetB }}
      <div class="text-xs text-gray-400">
        ({{ state.pool.assetIdA ?? "—" }} / {{ state.pool.assetIdB ?? "—" }})
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
        v-if="state.pool.poolAddress"
        :to="{
          name: 'AddressDetails',
          params: { address: state.pool.poolAddress },
        }"
        class="text-xs text-blue-400 hover:text-blue-300 font-mono truncate transition-colors duration-200"
        :title="state.pool.poolAddress"
      >
        {{ formatAddress(state.pool.poolAddress) }}
      </router-link>
    </div>

    <!-- Time -->
    <div class="order-8 md:order-none text-right md:text-left">
      <span class="text-xs text-gray-400">
        <FormattedTime
          :timestamp="state.pool.timestamp || Date.now().toString()"
        />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted } from "vue";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";
import { signalrService } from "../services/signalrService";
import { Pool } from "../api/models";

interface Props {
  pool: Pool;
}

const props = defineProps<Props>();

const state = reactive({ forceUpdate: 0, pool: props.pool });
onMounted(() => {
  state.pool = props.pool;
  if (
    assetService.needToReverseAssets(
      BigInt(props.pool.assetIdA ?? 0n),
      BigInt(props.pool.assetIdB ?? 0n)
    )
  ) {
    state.pool = reversePool(props.pool);
  }

  signalrService.onPoolReceived(poolUpdateEvent);
});

onUnmounted(() => {
  signalrService.unsubscribeFromPoolUpdates(poolUpdateEvent);
});

const reversePool = (pool: Pool): Pool => {
  return {
    ...pool,
    assetIdA: pool.assetIdB,
    assetIdB: pool.assetIdA,
    a: pool.b,
    b: pool.a,
    l: pool.l,
  };
};

const poolUpdateEvent = (pool: Pool) => {
  if (
    pool.poolAppId === state.pool.poolAppId &&
    state.pool.poolAddress == pool.poolAddress
  ) {
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

const formattedAssetA = computed(() =>
  getAssetName(BigInt(state.pool.assetIdA ?? 0))
);
const formattedAssetB = computed(() =>
  getAssetName(BigInt(state.pool.assetIdB ?? 0))
);

const formattedReserveA = computed(() => {
  void state.forceUpdate;
  if (
    !state.pool.a ||
    state.pool.assetIdA === undefined ||
    state.pool.assetIdA === null
  )
    return "0";
  return assetService.formatAssetBalance(
    state.pool.a,
    state.pool.assetIdA ?? 0
  );
});

const formattedReserveB = computed(() => {
  void state.forceUpdate;
  if (
    !state.pool.b ||
    state.pool.assetIdB === undefined ||
    state.pool.assetIdB === null
  )
    return "0";
  return assetService.formatAssetBalance(
    state.pool.b,
    state.pool.assetIdB ?? 0
  );
});

const formattedLPSupply = computed(() => {
  void state.forceUpdate;
  if (
    !state.pool.l ||
    state.pool.assetIdLP === undefined ||
    state.pool.assetIdLP === null
  )
    return "0";
  return assetService.formatAssetBalance(state.pool.l, state.pool.assetIdLP);
});

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
</script>

<style scoped></style>
