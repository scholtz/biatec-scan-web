<template>
  <span
    v-if="drawn.length"
    class="relative inline-block align-middle"
    @mouseleave="hovered = null"
  >
    <svg
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="block"
      role="img"
      :aria-label="ariaLabel"
    >
      <g v-for="(c, i) in drawn" :key="i">
        <rect
          v-if="hovered === i"
          :x="c.x"
          y="0"
          :width="candleWidth"
          :height="height"
          fill="#ffffff"
          fill-opacity="0.12"
          rx="1"
        />
        <line
          :x1="c.x + candleWidth / 2"
          :x2="c.x + candleWidth / 2"
          :y1="c.wickTop"
          :y2="c.wickBottom"
          :stroke="c.color"
          stroke-width="1"
          :stroke-opacity="hovered === i ? 1 : 0.7"
        />
        <rect
          :x="c.x + 0.5"
          :y="c.bodyTop"
          :width="candleWidth - 1"
          :height="c.bodyHeight"
          :fill="c.color"
          rx="0.5"
        />
        <!-- Full-height transparent hit area so hovering anywhere in the column works. -->
        <rect
          :x="c.x"
          y="0"
          :width="candleWidth"
          :height="height"
          fill="transparent"
          @mouseenter="hovered = i"
          @mousemove="onMove"
        />
      </g>
    </svg>

    <Teleport to="body">
      <div
        v-if="hovered !== null && drawn[hovered]"
        class="fixed z-50 pointer-events-none bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 text-xs text-gray-200 w-max max-w-[90vw]"
        :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }"
      >
        <div v-if="label" class="font-semibold text-white mb-1">{{ label }}</div>
        <div class="text-gray-400 mb-1.5 whitespace-nowrap">
          {{ t("miniChart.range", { from: drawn[hovered].from, until: drawn[hovered].until }) }}
        </div>
        <table class="w-full">
          <tbody>
            <tr>
              <td class="pr-4 text-gray-400">{{ t("miniChart.open") }}</td>
              <td class="text-right font-mono text-gray-100">{{ drawn[hovered].openText }}</td>
            </tr>
            <tr>
              <td class="pr-4 text-gray-400">{{ t("miniChart.high") }}</td>
              <td class="text-right font-mono text-green-400">{{ drawn[hovered].highText }}</td>
            </tr>
            <tr>
              <td class="pr-4 text-gray-400">{{ t("miniChart.low") }}</td>
              <td class="text-right font-mono text-red-400">{{ drawn[hovered].lowText }}</td>
            </tr>
            <tr>
              <td class="pr-4 text-gray-400">{{ t("miniChart.close") }}</td>
              <td class="text-right font-mono" :style="{ color: drawn[hovered].color }">
                {{ drawn[hovered].closeText }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Teleport>
  </span>
  <span v-else class="text-gray-500">-</span>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { TimeseriesCandles } from "../../api/models";

/**
 * Tiny inline OHLC candlestick sparkline for table cells (7d price / TVL columns).
 *
 * The API delivers up to 168 hourly candles; at sparkline size a 1px candle is
 * unreadable, so consecutive hourly candles are aggregated into `targetCandles`
 * larger buckets (default 28 ≙ 6h candles over 7 days) before drawing. Direction
 * is encoded redundantly — color (project-wide green/red delta convention) AND
 * candle geometry (close vs open position) — so the chart stays readable for
 * colorblind users. Hovering a candle highlights it and shows a tooltip
 * (teleported to <body> so table-cell overflow clipping can't cut it off) with
 * the bucket's date range and O/H/L/C values in USD.
 */

const props = withDefaults(
  defineProps<{
    /** Hourly OHLC series in the API's parallel-array shape. */
    series?: TimeseriesCandles | null;
    width?: number;
    height?: number;
    /** How many candles to draw after aggregating the hourly input. */
    targetCandles?: number;
    /** Label prefix for the aria description and tooltip header, e.g. "Price 7d". */
    label?: string;
  }>(),
  { series: null, width: 112, height: 28, targetCandles: 28, label: "" },
);

const { t } = useI18n();

const UP_COLOR = "#4ade80"; // tailwind green-400, matches ChangeCell positive
const DOWN_COLOR = "#f87171"; // tailwind red-400, matches ChangeCell negative
const FLAT_COLOR = "#9ca3af"; // tailwind gray-400

const hovered = ref<number | null>(null);
const tooltipPos = ref({ x: 0, y: 0 });

const TOOLTIP_EST_WIDTH = 240;
const TOOLTIP_EST_HEIGHT = 140;

function onMove(e: MouseEvent) {
  // Follow the cursor with a small offset, flipping to the other side when the
  // tooltip would run past the viewport edge.
  let x = e.clientX + 14;
  let y = e.clientY + 14;
  if (x + TOOLTIP_EST_WIDTH > window.innerWidth) x = e.clientX - 14 - TOOLTIP_EST_WIDTH;
  if (y + TOOLTIP_EST_HEIGHT > window.innerHeight) y = e.clientY - 14 - TOOLTIP_EST_HEIGHT;
  tooltipPos.value = { x: Math.max(4, x), y: Math.max(4, y) };
}

interface Bucket {
  t: number;
  tEnd: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

const buckets = computed<Bucket[]>(() => {
  const s = props.series;
  const n = s?.t?.length ?? 0;
  if (!s || !s.t || !s.o || !s.h || !s.l || !s.c || n === 0) return [];

  const chunk = Math.max(1, Math.ceil(n / props.targetCandles));
  const out: Bucket[] = [];
  for (let i = 0; i < n; i += chunk) {
    const end = Math.min(i + chunk, n);
    let h = -Infinity;
    let l = Infinity;
    for (let j = i; j < end; j++) {
      if (s.h[j] > h) h = s.h[j];
      if (s.l[j] < l) l = s.l[j];
    }
    out.push({ t: s.t[i], tEnd: s.t[end - 1] + 3600, o: s.o[i], h, l, c: s.c[end - 1] });
  }
  return out;
});

const candleWidth = computed(() => (buckets.value.length ? props.width / buckets.value.length : 0));

function formatValue(v: number): string {
  if (!isFinite(v)) return "-";
  const abs = Math.abs(v);
  if (abs >= 1000) return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (abs >= 1) return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return "$" + v.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const drawn = computed(() => {
  const list = buckets.value;
  if (list.length === 0) return [];

  let min = Infinity;
  let max = -Infinity;
  for (const b of list) {
    if (b.l < min) min = b.l;
    if (b.h > max) max = b.h;
  }
  // Pad the range so extremes don't touch the edges; give a flat series an
  // artificial range so it renders as a visible mid-line instead of nothing.
  const span = max - min;
  const pad = span > 0 ? span * 0.05 : Math.abs(max) * 0.05 || 1;
  min -= pad;
  max += pad;
  const scale = (v: number) => props.height - ((v - min) / (max - min)) * props.height;

  const w = candleWidth.value;
  return list.map((b, i) => {
    const yOpen = scale(b.o);
    const yClose = scale(b.c);
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));
    return {
      x: i * w,
      bodyTop,
      bodyHeight,
      wickTop: scale(b.h),
      wickBottom: scale(b.l),
      color: b.c > b.o ? UP_COLOR : b.c < b.o ? DOWN_COLOR : FLAT_COLOR,
      from: formatDateTime(b.t),
      until: formatDateTime(b.tEnd),
      openText: formatValue(b.o),
      highText: formatValue(b.h),
      lowText: formatValue(b.l),
      closeText: formatValue(b.c),
    };
  });
});

const ariaLabel = computed(() => {
  const list = buckets.value;
  if (list.length === 0) return props.label;
  const first = list[0];
  const last = list[list.length - 1];
  return `${props.label} ${formatValue(first.o)} → ${formatValue(last.c)}`.trim();
});
</script>
