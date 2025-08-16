<template>
  <div class="card border-l-4 border-l-amber-500">
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-gray-400">
        <FormattedTime
          :timestamp="state.pool.lastUpdated || new Date().toISOString()"
        />
      </span>
      <span class="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">
        {{ state.pool.poolCount }} pools
      </span>
    </div>

    <div class="">
      <div class="grid grid-cols-1 gap-2">
        <div class="text-lg text-white text-center">
          <RouterLink
            :to="`/pools/${state.pool.assetIdA}/${state.pool.assetIdB}`"
          >
            {{ formattedPrice }}
          </RouterLink>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="text-center">
          <div class="text-xs text-white">
            <RouterLink :to="`/asset/${state.pool.assetIdA}`">
              {{ formattedTVLA }}
            </RouterLink>
          </div>
        </div>
        <div class="text-center">
          <div class="text-xs text-white">
            <RouterLink :to="`/asset/${state.pool.assetIdB}`">
              {{ formattedTVLB }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from "vue";
import { assetService } from "../services/assetService";
import type { AMMAggregatedPool } from "../types/AMMAggregatedPool";
import FormattedTime from "./FormattedTime.vue";
import { signalrService } from "../services/signalrService";

const props = defineProps<{ pool: AMMAggregatedPool }>();

const state = reactive({
  forceUpdate: 0,
  pool: props.pool,
});

onMounted(() => {
  // Trigger reactivity when assets are loaded
  state.forceUpdate++;

  if (
    assetService.needToReverseAssets(
      BigInt(props.pool.assetIdA ?? 0n),
      BigInt(props.pool.assetIdB ?? 0n)
    )
  ) {
    state.pool = reversePool(props.pool);
  }
  signalrService.onAggregatedPoolReceived(poolUpdateEvent);
});
onUnmounted(() => {
  signalrService.unsubscribeFromAggregatedPoolUpdates(poolUpdateEvent);
});

const reversePool = (pool: AMMAggregatedPool): AMMAggregatedPool => {
  return {
    ...pool,
    assetIdA: pool.assetIdB,
    assetIdB: pool.assetIdA,
    a: pool.b,
    b: pool.a,
    tvL_A: pool.tvL_B,
    tvL_B: pool.tvL_A,
  };
};
const poolUpdateEvent = (pool: AMMAggregatedPool) => {
  if (
    pool.assetIdA === state.pool.assetIdA &&
    pool.assetIdB == state.pool.assetIdB
  ) {
    state.pool = pool;
  }
  if (
    pool.assetIdA === state.pool.assetIdB &&
    pool.assetIdB == state.pool.assetIdA
  ) {
    state.pool = reversePool(pool);
  }
};
const formattedTVLA = computed(() => {
  void state.forceUpdate;
  return assetService.formatAssetBalance(
    props.pool.tvL_A,
    BigInt(props.pool.assetIdA)
  );
});

const formattedTVLB = computed(() => {
  void state.forceUpdate;
  return assetService.formatAssetBalance(
    props.pool.tvL_B,
    BigInt(props.pool.assetIdB)
  );
});

const formattedPrice = computed(() => {
  // price = B/A with 6 decimals
  return assetService.formatPairBalance(
    props.pool.tvL_A,
    BigInt(props.pool.assetIdA),
    props.pool.tvL_B,
    BigInt(props.pool.assetIdB),
    false
  );
});
</script>
