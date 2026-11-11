<template>
  <div class="text-gray-100">
    <p class="text-sm text-gray-400 mb-4">
      {{ $t("poolDetails.liquidityDistributionHelp") }}
    </p>

    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-300 mb-3">
      <span>
        {{ $t("poolDetails.rangesCount", { count: bars.length }) }}
      </span>
      <span class="flex items-center gap-2">
        <span class="inline-block w-3 h-3 rounded-sm" :style="{ background: ACTIVE_COLOR }"></span>
        {{ $t("poolDetails.activeRange") }}
      </span>
      <span v-if="currentPrice" class="flex items-center gap-2">
        <span class="inline-block w-3 border-t-2 border-dashed border-gray-300"></span>
        {{ $t("poolDetails.currentPriceMarker") }}:
        <FormattedNumber :value="currentPrice" :maximum-significant-digits="6" />
        {{ unitB }} / {{ unitA }}
      </span>
    </div>

    <div class="relative" @mouseleave="hovered = null">
      <svg
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        class="w-full h-56"
        preserveAspectRatio="none"
        role="img"
        :aria-label="$t('poolDetails.liquidityDistribution')"
      >
        <!-- baseline -->
        <line :x1="0" :x2="WIDTH" :y1="PLOT_BOTTOM" :y2="PLOT_BOTTOM" stroke="#334155" stroke-width="1" />
        <g v-for="bar in bars" :key="bar.key">
          <path
            :d="barPath(bar, PLOT_BOTTOM, RADIUS)"
            :fill="bar.active ? ACTIVE_COLOR : BAR_COLOR"
            :data-testid="bar.active ? 'liquidity-bar-active' : 'liquidity-bar'"
          />
          <!-- hit target larger than the mark: the full column height -->
          <rect
            :x="bar.x"
            :y="0"
            :width="Math.max(bar.width, 6)"
            :height="PLOT_BOTTOM"
            fill="transparent"
            @mouseenter="hovered = bar"
          />
        </g>
        <line
          v-if="priceX !== null"
          :x1="priceX"
          :x2="priceX"
          :y1="0"
          :y2="PLOT_BOTTOM"
          stroke="#cbd5e1"
          stroke-width="1.5"
          stroke-dasharray="4 3"
          vector-effect="non-scaling-stroke"
          data-testid="liquidity-price-marker"
        />
      </svg>

      <div
        v-if="hovered"
        data-testid="liquidity-tooltip"
        class="absolute top-0 z-10 pointer-events-none rounded-md border border-dark-600 bg-dark-900/95 px-3 py-2 text-xs text-gray-100 shadow-lg"
        :style="tooltipStyle"
      >
        <div class="font-medium mb-1">
          {{ $t("poolDetails.priceRange") }}:
          <FormattedNumber :value="hovered.range.pMin" :maximum-significant-digits="6" /> –
          <FormattedNumber :value="hovered.range.pMax" :maximum-significant-digits="6" />
          {{ unitB }} / {{ unitA }}
        </div>
        <div class="text-gray-300">
          {{ $t("poolDetails.liquidity") }}:
          <FormattedNumber :value="hovered.range.liquidity" compact :maximum-significant-digits="4" />
        </div>
        <div class="text-gray-300">
          {{ $t("poolDetails.holds") }}:
          <FormattedNumber :value="amount(hovered.range.a, decimalsA)" :maximum-significant-digits="6" />
          {{ unitA }} +
          <FormattedNumber :value="amount(hovered.range.b, decimalsB)" :maximum-significant-digits="6" />
          {{ unitB }}
        </div>
        <div v-if="hovered.active" class="mt-1 text-gray-100">{{ $t("poolDetails.activeRange") }}</div>
      </div>
    </div>

    <!-- price axis: the ends and the current price (log scale) -->
    <div class="flex justify-between text-xs text-gray-400 mt-1">
      <FormattedNumber :value="domain?.min" :maximum-significant-digits="4" />
      <span>{{ unitB }} / {{ unitA }} ({{ $t("poolDetails.logScale") }})</span>
      <FormattedNumber :value="domain?.max" :maximum-significant-digits="4" />
    </div>

    <button
      type="button"
      data-testid="liquidity-table-toggle"
      class="mt-4 text-sm text-blue-400 hover:text-blue-300"
      @click="showTable = !showTable"
    >
      {{ showTable ? $t("poolDetails.hideTable") : $t("poolDetails.showTable") }}
    </button>
    <div v-if="showTable" class="mt-2 max-h-80 overflow-auto">
      <table class="w-full text-xs text-gray-100">
        <thead class="text-gray-400 text-left">
          <tr>
            <th class="py-1 pr-3 font-medium">{{ $t("poolDetails.priceRange") }} ({{ unitB }} / {{ unitA }})</th>
            <th class="py-1 pr-3 font-medium text-right">{{ $t("poolDetails.liquidity") }}</th>
            <th class="py-1 pr-3 font-medium text-right">{{ unitA }}</th>
            <th class="py-1 font-medium text-right">{{ unitB }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="bar in bars"
            :key="bar.key"
            data-testid="liquidity-table-row"
            class="border-t border-dark-700/60"
            :class="bar.active ? 'bg-blue-500/10' : ''"
          >
            <td class="py-1 pr-3">
              <FormattedNumber :value="bar.range.pMin" :maximum-significant-digits="6" /> –
              <FormattedNumber :value="bar.range.pMax" :maximum-significant-digits="6" />
            </td>
            <td class="py-1 pr-3 text-right">
              <FormattedNumber :value="bar.range.liquidity" compact :maximum-significant-digits="4" />
            </td>
            <td class="py-1 pr-3 text-right">
              <FormattedNumber :value="amount(bar.range.a, decimalsA)" :maximum-significant-digits="6" />
            </td>
            <td class="py-1 text-right">
              <FormattedNumber :value="amount(bar.range.b, decimalsB)" :maximum-significant-digits="6" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { PoolLiquidityRange } from "../api/models";
import FormattedNumber from "./FormattedNumber.vue";
import {
  barPath,
  buildLiquidityBars,
  isBoundedPrice,
  priceDomain,
  priceToX,
  type LiquidityBar,
} from "../utils/liquidityDistribution";

const props = defineProps<{
  ranges: PoolLiquidityRange[];
  /** Current price of 1 A in B (decimals adjusted). */
  currentPrice?: number;
  unitA: string;
  unitB: string;
  decimalsA: number;
  decimalsB: number;
}>();

// one hue, two ordinal steps (validated against the dark card surface): ranges, and the range holding the price
const BAR_COLOR = "#2563eb";
const ACTIVE_COLOR = "#93c5fd";
const WIDTH = 1000;
const HEIGHT = 220;
const PLOT_BOTTOM = HEIGHT - 1;
const RADIUS = 4; // rounded data end

const hovered = ref<LiquidityBar | null>(null);
const showTable = ref(false);

const domain = computed(() => priceDomain(props.ranges));
const bars = computed(() => buildLiquidityBars(props.ranges, props.currentPrice, WIDTH, PLOT_BOTTOM - 8));

const priceX = computed(() =>
  isBoundedPrice(props.currentPrice) && domain.value ? priceToX(props.currentPrice, domain.value, WIDTH) : null
);

const amount = (base: number | undefined, decimals: number): number => (base ?? 0) / Math.pow(10, decimals);

const tooltipStyle = computed(() => {
  if (!hovered.value) return {};
  const center = ((hovered.value.x + hovered.value.width / 2) / WIDTH) * 100;
  // keep the tooltip inside the chart: anchor left of the bar in the right half
  return center > 50
    ? { right: `${100 - center}%`, maxWidth: "20rem" }
    : { left: `${center}%`, maxWidth: "20rem" };
});
</script>
