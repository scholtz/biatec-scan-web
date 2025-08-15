<template>
  <div class="card border-l-4 border-l-amber-500">
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-gray-400">
        <FormattedTime
          :timestamp="pool.lastUpdated || new Date().toISOString()"
        />
      </span>
      <span class="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">
        {{ pool.poolCount }} pools
      </span>
    </div>

    <div class="">
      <div class="grid grid-cols-1 gap-2">
        <div class="text-lg text-white text-center">
          <RouterLink :to="`/pools/${pool.assetIdA}-${pool.assetIdB}`">
            {{ formattedPrice }}
          </RouterLink>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="text-center">
          <div class="text-xs text-white">
            <RouterLink :to="`/asset/${pool.assetIdA}`">
              {{ formattedTVLA }}
            </RouterLink>
          </div>
        </div>
        <div class="text-center">
          <div class="text-xs text-white">
            <RouterLink :to="`/asset/${pool.assetIdB}`">
              {{ formattedTVLB }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import { assetService } from "../services/assetService";
import type { AMMAggregatedPool } from "../types/AMMAggregatedPool";
import FormattedTime from "./FormattedTime.vue";

const props = defineProps<{ pool: AMMAggregatedPool }>();

const state = reactive({
  forceUpdate: 0,
});

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
