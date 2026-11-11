<template>
  <div class="text-gray-100">
    <p class="text-sm text-gray-400 mb-4">
      {{ $t("poolDetails.liquidityDistributionHelp") }}
    </p>

    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-300 mb-3">
      <span>
        {{ $t("poolDetails.rangesCount", { count: ranges.length }) }}
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

    <div ref="plot" class="relative" @mouseleave="hovered = null">
      <svg
        :viewBox="`0 0 ${width} ${HEIGHT}`"
        class="w-full h-56"
        preserveAspectRatio="none"
        role="img"
        :aria-label="$t('poolDetails.liquidityDistribution')"
      >
        <!-- baseline -->
        <line :x1="0" :x2="width" :y1="PLOT_BOTTOM" :y2="PLOT_BOTTOM" stroke="#334155" stroke-width="1" />
        <g v-for="bar in bars" :key="bar.key">
          <path
            :d="barPath(bar, PLOT_BOTTOM, RADIUS)"
            :fill="bar.active ? ACTIVE_COLOR : BAR_COLOR"
            :data-testid="bar.active ? 'liquidity-bar-active' : 'liquidity-bar'"
            pointer-events="none"
          />
          <!-- hit target larger than the mark: the full column height, tiling the axis with its neighbours -->
          <rect
            :x="bar.hitX"
            :y="0"
            :width="bar.hitWidth"
            :height="PLOT_BOTTOM"
            fill="transparent"
            @pointerenter="onPointerEnter($event, bar)"
            @pointerup="onPointerUp($event, bar)"
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
          pointer-events="none"
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
          <template v-if="isUnboundedAbove(hovered.range.pMin)">∞</template>
          <FormattedNumber v-else :value="boundValue(hovered.range.pMin)" :maximum-significant-digits="6" /> –
          <template v-if="isUnboundedAbove(hovered.range.pMax)">∞</template>
          <FormattedNumber v-else :value="boundValue(hovered.range.pMax)" :maximum-significant-digits="6" />
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
            v-for="row in tableRows"
            :key="row.key"
            data-testid="liquidity-table-row"
            class="border-t border-dark-700/60"
            :class="row.active ? 'bg-blue-500/10' : ''"
          >
            <td class="py-1 pr-3">
              <template v-if="isUnboundedAbove(row.range.pMin)">∞</template>
              <FormattedNumber v-else :value="boundValue(row.range.pMin)" :maximum-significant-digits="6" /> –
              <template v-if="isUnboundedAbove(row.range.pMax)">∞</template>
              <FormattedNumber v-else :value="boundValue(row.range.pMax)" :maximum-significant-digits="6" />
            </td>
            <td class="py-1 pr-3 text-right">
              <FormattedNumber :value="row.range.liquidity" compact :maximum-significant-digits="4" />
            </td>
            <td class="py-1 pr-3 text-right">
              <FormattedNumber :value="amount(row.range.a, decimalsA)" :maximum-significant-digits="6" />
            </td>
            <td class="py-1 text-right">
              <FormattedNumber :value="amount(row.range.b, decimalsB)" :maximum-significant-digits="6" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PoolLiquidityRange } from "../api/models";
import FormattedNumber from "./FormattedNumber.vue";
import {
  barPath,
  buildLiquidityBars,
  isActiveRange,
  isBoundedPrice,
  isUnboundedAbove,
  priceDomain,
  priceToX,
  rangeKey,
  type LiquidityBar,
} from "../utils/liquidityDistribution";

const props = defineProps<{
  ranges: PoolLiquidityRange[];
  /** Current price of 1 A in B (decimals adjusted). */
  currentPrice?: number;
  /** The contract's current tick: decides the active range (as on the backend), the price is the fallback. */
  currentTick?: number | null;
  unitA: string;
  unitB: string;
  /** Undefined while unknown: the amounts are shown as a placeholder rather than in base units. */
  decimalsA?: number;
  decimalsB?: number;
}>();

// one hue, two ordinal steps (validated against the dark card surface): ranges, and the range holding the price
const BAR_COLOR = "#2563eb";
const ACTIVE_COLOR = "#93c5fd";
// the viewBox follows the rendered width, so one chart unit is one pixel: the minimum bar width and the rounded
// corners keep their size at any screen width (the height is fixed, so nothing is squashed)
const width = ref(1000);
const plot = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  if (!plot.value || typeof ResizeObserver === "undefined") return;
  resizeObserver = new ResizeObserver((entries) => {
    const measured = Math.round(entries[0]?.contentRect.width ?? 0);
    if (measured > 0) width.value = measured;
  });
  resizeObserver.observe(plot.value);
});
// touch / pen: a tap anywhere outside the chart closes the tooltip (there is no mouseleave)
const onDocumentPointerDown = (event: PointerEvent) => {
  if (event.pointerType === "mouse" || !hovered.value) return;
  if (plot.value && event.target instanceof Node && !plot.value.contains(event.target)) hovered.value = null;
};
onMounted(() => document.addEventListener("pointerdown", onDocumentPointerDown));
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  document.removeEventListener("pointerdown", onDocumentPointerDown);
});
const HEIGHT = 224; // = h-56: with the measured width, one chart unit is one pixel both ways
const PLOT_BOTTOM = HEIGHT - 1;
const RADIUS = 4; // rounded data end

const hovered = ref<LiquidityBar | null>(null);
const showTable = ref(false);

const domain = computed(() => priceDomain(props.ranges, props.currentPrice));
const bars = computed(() =>
  buildLiquidityBars(props.ranges, props.currentPrice, width.value, PLOT_BOTTOM - 8, 2, props.currentTick, domain.value)
);
// a tooltip of a range that is gone must not linger; a resize keeps it (on the re-laid-out bar)
watch(bars, (next) => {
  hovered.value = hovered.value ? (next.find((bar) => bar.key === hovered.value?.key) ?? null) : null;
});

// the table lists every range - also those outside the chart's price window - lowest price first
const tableRows = computed(() =>
  [...props.ranges]
    .sort((a, b) => (a.pMin ?? 0) - (b.pMin ?? 0))
    .map((range, index) => ({
      key: rangeKey(range, index),
      range,
      active: isActiveRange(range, props.currentPrice, props.currentTick),
    }))
);

const priceX = computed(() =>
  isBoundedPrice(props.currentPrice) && domain.value ? priceToX(props.currentPrice, domain.value, width.value) : null
);

// the backend clamps unbounded ends to 0 / decimal.MaxValue: each bound shows as 0, its price, or ∞ (template)
const boundValue = (price: number | undefined): number => (isBoundedPrice(price) ? price : 0);

// a mouse hovers; a tap (touch / pen: no hover, and no mouseleave to close it) toggles the bar's tooltip
const onPointerEnter = (event: PointerEvent, bar: LiquidityBar) => {
  if (event.pointerType === "mouse") hovered.value = bar;
};
const onPointerUp = (event: PointerEvent, bar: LiquidityBar) => {
  if (event.pointerType === "mouse") {
    hovered.value = bar; // a click never hides what the hover shows
    return;
  }
  hovered.value = hovered.value?.key === bar.key ? null : bar;
};

const amount = (base: number | undefined, decimals: number | undefined): number | undefined =>
  decimals === undefined ? undefined : (base ?? 0) / Math.pow(10, decimals);


const tooltipStyle = computed(() => {
  if (!hovered.value) return {};
  const center = ((hovered.value.x + hovered.value.width / 2) / width.value) * 100;
  // keep the tooltip inside the chart: anchor left of the bar in the right half
  return center > 50
    ? { right: `${100 - center}%`, maxWidth: "20rem" }
    : { left: `${center}%`, maxWidth: "20rem" };
});
</script>
