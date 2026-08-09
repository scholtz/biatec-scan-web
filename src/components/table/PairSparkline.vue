<template>
  <span v-if="loading" class="inline-block w-[112px] h-[28px] rounded bg-gray-800/60 animate-pulse align-middle"></span>
  <MiniOhlcChart v-else :series="candles" :label="label" />
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { TimeseriesCandles } from "../../api/models";
import { timeseriesService } from "../../services/timeseriesService";
import { derivePairPriceCandles } from "../../utils/pairCandles";
import MiniOhlcChart from "./MiniOhlcChart.vue";

/**
 * Table-cell wrapper that renders the 7d price history of a trading pair — the
 * base asset priced in the quote asset — as a mini OHLC chart. Both assets'
 * per-asset USD series come from timeseriesService (batched + cached), and the
 * pair series is derived client-side (see derivePairPriceCandles).
 */

const props = defineProps<{
  /** The asset being priced (chart goes up when it gains against the quote). */
  baseAssetId: number;
  /** The asset the price is expressed in. */
  quoteAssetId: number;
  /** Accessible label for the chart, e.g. the column name. */
  label?: string;
}>();

const loading = ref(true);
const candles = ref<TimeseriesCandles | null>(null);

watch(
  () => [props.baseAssetId, props.quoteAssetId] as const,
  async ([baseId, quoteId]) => {
    loading.value = true;
    let derived: TimeseriesCandles | null = null;
    try {
      const [base, quote] = await Promise.all([
        timeseriesService.get(baseId),
        timeseriesService.get(quoteId),
      ]);
      derived = derivePairPriceCandles(base?.price, quote?.price);
    } finally {
      // Only apply if the props haven't changed while awaiting.
      if (baseId === props.baseAssetId && quoteId === props.quoteAssetId) {
        candles.value = derived;
        loading.value = false;
      }
    }
  },
  { immediate: true },
);
</script>
