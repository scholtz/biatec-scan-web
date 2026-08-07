<template>
  <svg
    v-if="drawn.length"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    class="inline-block align-middle"
    role="img"
    :aria-label="ariaLabel"
  >
    <g v-for="(c, i) in drawn" :key="i">
      <title>{{ c.tooltip }}</title>
      <line
        :x1="c.x + candleWidth / 2"
        :x2="c.x + candleWidth / 2"
        :y1="c.wickTop"
        :y2="c.wickBottom"
        :stroke="c.color"
        stroke-width="1"
        stroke-opacity="0.7"
      />
      <rect
        :x="c.x + 0.5"
        :y="c.bodyTop"
        :width="candleWidth - 1"
        :height="c.bodyHeight"
        :fill="c.color"
        rx="0.5"
      />
    </g>
  </svg>
  <span v-else class="text-gray-500">-</span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TimeseriesCandles } from "../../api/models";

/**
 * Tiny inline OHLC candlestick sparkline for table cells (7d price / TVL columns).
 *
 * The API delivers up to 168 hourly candles; at sparkline size a 1px candle is
 * unreadable, so consecutive hourly candles are aggregated into `targetCandles`
 * larger buckets (default 28 ≙ 6h candles over 7 days) before drawing. Direction
 * is encoded redundantly — color (project-wide green/red delta convention) AND
 * candle geometry (close vs open position) — so the chart stays readable for
 * colorblind users. Each candle carries a native <title> tooltip with its
 * date range and O/H/L/C values.
 */

const props = withDefaults(
  defineProps<{
    /** Hourly OHLC series in the API's parallel-array shape. */
    series?: TimeseriesCandles | null;
    width?: number;
    height?: number;
    /** How many candles to draw after aggregating the hourly input. */
    targetCandles?: number;
    /** Label prefix for the aria description, e.g. "Price 7d". */
    label?: string;
  }>(),
  { series: null, width: 112, height: 28, targetCandles: 28, label: "" },
);

const UP_COLOR = "#4ade80"; // tailwind green-400, matches ChangeCell positive
const DOWN_COLOR = "#f87171"; // tailwind red-400, matches ChangeCell negative
const FLAT_COLOR = "#9ca3af"; // tailwind gray-400

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
  if (abs >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (abs >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return v.toLocaleString(undefined, { maximumSignificantDigits: 4 });
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
    const from = new Date(b.t * 1000).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    });
    return {
      x: i * w,
      bodyTop,
      bodyHeight,
      wickTop: scale(b.h),
      wickBottom: scale(b.l),
      color: b.c > b.o ? UP_COLOR : b.c < b.o ? DOWN_COLOR : FLAT_COLOR,
      tooltip: `${from} — O ${formatValue(b.o)} H ${formatValue(b.h)} L ${formatValue(b.l)} C ${formatValue(b.c)}`,
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
