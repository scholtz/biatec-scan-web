<template>
  <StyledBox>
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
            class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            {{ formattedPrice }}
          </RouterLink>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="text-center">
          <div class="text-xs text-white">
            <RouterLink
              :to="`/asset/${state.pool.assetIdA}`"
              class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
            >
              {{ formattedTVLA }}
            </RouterLink>
          </div>
        </div>
        <div class="text-center">
          <div class="text-xs text-white">
            <RouterLink
              :to="`/asset/${state.pool.assetIdB}`"
              class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
            >
              {{ formattedTVLB }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </StyledBox>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from "vue";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";
import { signalrService } from "../services/signalrService";
import { AggregatedPool } from "../api/models";
import StyledBox from "./StyledBox.vue";

const props = defineProps<{ pool: AggregatedPool }>();

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
    state.pool = assetService.reverseAggregatedPool(props.pool);
  }
  signalrService.onAggregatedPoolReceived(poolUpdateEvent);
});
onUnmounted(() => {
  signalrService.unsubscribeFromAggregatedPoolUpdates(poolUpdateEvent);
});

const poolUpdateEvent = (pool: AggregatedPool) => {
  if (
    (pool.assetIdA === state.pool.assetIdA &&
      pool.assetIdB == state.pool.assetIdB) ||
    (pool.assetIdA === state.pool.assetIdB &&
      pool.assetIdB == state.pool.assetIdA)
  ) {
    if (
      assetService.needToReverseAssets(
        BigInt(pool.assetIdA ?? 0n),
        BigInt(pool.assetIdB ?? 0n)
      )
    ) {
      state.pool = assetService.reverseAggregatedPool(pool);
    } else {
      state.pool = pool;
    }
  }
};
const formattedTVLA = computed(() => {
  void state.forceUpdate;
  if (
    state.pool.tvL_A === undefined ||
    state.pool.tvL_A === null ||
    state.pool.assetIdA === undefined ||
    state.pool.assetIdA === null
  )
    return "-";
  const assetInfoA = assetService.getAssetInfo(state.pool.assetIdA);
  if (!assetInfoA) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(state.pool.assetIdA, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  return assetService.formatAssetBalance(
    state.pool.tvL_A,
    BigInt(state.pool.assetIdA ?? 0),
    false
  );
});

const formattedTVLB = computed(() => {
  void state.forceUpdate;
  if (
    state.pool.tvL_B === undefined ||
    state.pool.tvL_B === null ||
    state.pool.assetIdB === undefined ||
    state.pool.assetIdB === null
  )
    return "-";

  const assetInfoB = assetService.getAssetInfo(state.pool.assetIdB);
  if (!assetInfoB) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(state.pool.assetIdB, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }

  return assetService.formatAssetBalance(
    state.pool.tvL_B,
    BigInt(state.pool.assetIdB),
    false
  );
});

const formattedPrice = computed(() => {
  // price = B/A with 6 decimals
  if (state.pool.assetIdA === undefined || state.pool.assetIdA === null)
    return "-";
  if (state.pool.assetIdB === undefined || state.pool.assetIdB === null)
    return "-";
  if (state.pool.tvL_A === undefined || state.pool.tvL_A === null) return "-";
  if (state.pool.virtualSumB === undefined || state.pool.virtualSumB === null)
    return "-";
  const assetInfoA = assetService.getAssetInfo(state.pool.assetIdA);
  if (!assetInfoA) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(state.pool.assetIdA, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }
  const assetInfoB = assetService.getAssetInfo(state.pool.assetIdB);
  if (!assetInfoB) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(state.pool.assetIdB, () => {
      state.forceUpdate++;
    });
    return "Loading...";
  }

  return assetService.formatPairBalance(
    state.pool.virtualSumA ?? 0,
    BigInt(state.pool.assetIdA ?? 0),
    state.pool.virtualSumB ?? 0,
    BigInt(state.pool.assetIdB ?? 0),
    false
  );
});
</script>
