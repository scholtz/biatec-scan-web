<template>
  <span v-if="loading" class="inline-block w-[112px] h-[28px] rounded bg-gray-800/60 animate-pulse align-middle"></span>
  <MiniOhlcChart v-else :series="candles" :label="label" />
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { AssetTimeseries7D, TimeseriesCandles } from "../../api/models";
import { timeseriesService } from "../../services/timeseriesService";
import MiniOhlcChart from "./MiniOhlcChart.vue";

/**
 * Table-cell wrapper that fetches an asset's 7d timeseries (batched + cached in
 * timeseriesService) and renders one of its two series as a mini OHLC chart.
 */

const props = defineProps<{
  assetId: number;
  /** Which of the asset's series to draw: USD price or real TVL. */
  series: "price" | "tvl";
  /** Accessible label for the chart, e.g. the column name. */
  label?: string;
}>();

const loading = ref(true);
const candles = ref<TimeseriesCandles | null>(null);

watch(
  () => [props.assetId, props.series] as const,
  async ([assetId, kind]) => {
    loading.value = true;
    let data: AssetTimeseries7D | null = null;
    try {
      data = await timeseriesService.get(assetId);
    } finally {
      // Only apply if the props haven't changed while awaiting.
      if (assetId === props.assetId && kind === props.series) {
        candles.value = (kind === "price" ? data?.price : data?.tvl) ?? null;
        loading.value = false;
      }
    }
  },
  { immediate: true },
);
</script>
