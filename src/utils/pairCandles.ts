import type { TimeseriesCandles } from "../api/models";

/**
 * Derives a 7d hourly candle series for a trading pair — the base asset priced
 * in the quote asset — from the two assets' per-asset USD price series served
 * by the timeseries endpoint (which only stores per-asset candles vs the USD
 * reference, never per-pair history).
 *
 * Semantics per aligned hour (present in both series):
 * - open  = baseOpen / quoteOpen, close = baseClose / quoteClose
 * - high/low use the same-direction ratio estimate (baseHigh / quoteHigh,
 *   baseLow / quoteLow) clamped so the candle stays well-formed
 *   (high >= max(open, close), low <= min(open, close)). The true intra-hour
 *   extremes of a ratio are not recoverable from two independent OHLC series,
 *   so the wicks are an approximation — fine for a sparkline.
 * - hours where the quote has non-positive values are skipped.
 *
 * A missing/empty quote series is treated as the USD unit and the base series
 * is returned as-is: the backend intentionally leaves the USD reference
 * asset's own price series empty (it is $1 by definition), and base/USDC is
 * the most common pair on the page.
 *
 * Returns null when the base series is empty or the two series never overlap.
 */
export function derivePairPriceCandles(
  base: TimeseriesCandles | null | undefined,
  quote: TimeseriesCandles | null | undefined,
): TimeseriesCandles | null {
  if (!hasData(base)) return null;
  if (!hasData(quote)) return base!;

  const quoteByHour = new Map<number, number>();
  quote!.t!.forEach((t, i) => quoteByHour.set(t, i));

  // Required<TimeseriesCandles> would keep the `| null` on each array, so spell out the non-null shape.
  const result: { t: number[]; o: number[]; h: number[]; l: number[]; c: number[] } = {
    t: [],
    o: [],
    h: [],
    l: [],
    c: [],
  };
  base!.t!.forEach((t, i) => {
    const j = quoteByHour.get(t);
    if (j === undefined) return;
    const qo = quote!.o![j];
    const qh = quote!.h![j];
    const ql = quote!.l![j];
    const qc = quote!.c![j];
    if (qo <= 0 || qh <= 0 || ql <= 0 || qc <= 0) return;

    const o = base!.o![i] / qo;
    const c = base!.c![i] / qc;
    const h = Math.max(o, c, base!.h![i] / qh);
    const l = Math.min(o, c, base!.l![i] / ql);
    result.t.push(t);
    result.o.push(o);
    result.h.push(h);
    result.l.push(l);
    result.c.push(c);
  });

  return result.t.length > 0 ? result : null;
}

function hasData(series: TimeseriesCandles | null | undefined): boolean {
  return (
    !!series?.t &&
    series.t.length > 0 &&
    !!series.o &&
    !!series.h &&
    !!series.l &&
    !!series.c
  );
}
