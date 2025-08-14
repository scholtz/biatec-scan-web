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

    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Pair:</span>
        <span class="text-sm text-white">
          {{ assetNameA }} / {{ assetNameB }}
          <span class="text-xs text-gray-400"
            >({{ pool.assetIdA }}-{{ pool.assetIdB }})</span
          >
        </span>
      </div>

      <div class="grid grid-cols-3 gap-2 mt-2">
        <div class="text-center">
          <div class="text-xs text-gray-400">Reserve A</div>
          <div class="text-sm text-white">{{ formattedA }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400">Reserve B</div>
          <div class="text-sm text-white">{{ formattedB }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400">Price</div>
          <div class="text-sm text-white">{{ formattedPrice }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-700">
        <div class="text-center">
          <div class="text-xs text-gray-400">TVL A</div>
          <div class="text-sm text-white">{{ formattedTVLA }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400">TVL B</div>
          <div class="text-sm text-white">{{ formattedTVLB }}</div>
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

const assetNameA = computed(() => {
  void state.forceUpdate;
  const info = assetService.getAssetInfo(BigInt(props.pool.assetIdA));
  if (!info) {
    assetService.requestAsset(
      BigInt(props.pool.assetIdA),
      () => state.forceUpdate++
    );
    return "Loading...";
  }
  return info.unitName || info.name || `Asset ${props.pool.assetIdA}`;
});

const assetNameB = computed(() => {
  void state.forceUpdate;
  const info = assetService.getAssetInfo(BigInt(props.pool.assetIdB));
  if (!info) {
    assetService.requestAsset(
      BigInt(props.pool.assetIdB),
      () => state.forceUpdate++
    );
    return "Loading...";
  }
  return info.unitName || info.name || `Asset ${props.pool.assetIdB}`;
});

const formattedA = computed(() => {
  void state.forceUpdate;
  return assetService.formatAssetBalance(
    props.pool.a,
    BigInt(props.pool.assetIdA)
  );
});

const formattedB = computed(() => {
  void state.forceUpdate;
  return assetService.formatAssetBalance(
    props.pool.b,
    BigInt(props.pool.assetIdB)
  );
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
  if (!props.pool.a || !props.pool.b) return "0";
  const price = Number(props.pool.b) / Number(props.pool.a);
  if (!isFinite(price) || isNaN(price)) return "0";
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
});
</script>
