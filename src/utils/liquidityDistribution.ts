import type { PoolLiquidityRange } from "../api/models";

/**
 * Geometry of the liquidity distribution chart of a tick based CLAMM pool (Pact CLAMM): one bar per liquidity range
 * (a run of ticks with equal liquidity, read by the backend from the pool's box storage), placed on a log price axis
 * (tick prices are geometric) with a height proportional to the range's liquidity.
 */

export interface LiquidityBar {
  key: string;
  range: PoolLiquidityRange;
  /** Left edge in chart units (0..width). */
  x: number;
  width: number;
  /** Bar height in chart units. */
  height: number;
  /** The range holding the current price. */
  active: boolean;
  /**
   * Hover target: the range's own price span plus half of the gaps around it - contiguous with the neighbours, never
   * overlapping (a bar thinner than 1 unit is drawn wider than its target).
   */
  hitX: number;
  hitWidth: number;
}

export interface PriceDomain {
  min: number;
  max: number;
}

/**
 * The chart shows at most this factor below and above the current price: a single very wide position must not squash
 * every concentrated range into a sliver. Ranges outside stay in the table view.
 */
export const DOMAIN_WINDOW_FACTOR = 100;

/** A range whose upper bound is more than this factor above its lower one does not size the axis. */
export const WIDE_RANGE_RATIO = 10;

/** decimal.MaxValue (~7.9228e28) - the backend's clamp for "unbounded above"; anything this large is that clamp. */
const DECIMAL_MAX_CLAMP = 7.92e28;
/** decimal.MaxValue as a JS number (the nearest double; how the JSON value parses). */
const DECIMAL_MAX = 7.922816251426434e28;

/** True for the backend's "unbounded above" clamp (decimal.MaxValue). */
export function isUnboundedAbove(price: number | null | undefined): boolean {
  return price !== undefined && price !== null && (!Number.isFinite(price) || price >= DECIMAL_MAX_CLAMP);
}

/**
 * The backend clamps prices outside the decimal range (extreme ticks) to 0 / decimal.MaxValue, meaning "unbounded":
 * true for a real (bounded) price.
 */
export function isBoundedPrice(price: number | null | undefined): price is number {
  return price !== undefined && price !== null && Number.isFinite(price) && price > 0 && price < DECIMAL_MAX_CLAMP;
}

/**
 * The price interval a range covers, the clamped ends read as 0 / Infinity. Null for a range without bounds or one
 * clamped at both ends (0..0, max..max): it lies off any axis and covers no price.
 */
export function rangeBounds(range: PoolLiquidityRange): { low: number; high: number } | null {
  if (range.pMin === undefined || range.pMax === undefined) return null;
  const read = (price: number): number => (isUnboundedAbove(price) ? Infinity : isBoundedPrice(price) ? price : 0);
  const low = read(range.pMin);
  const high = read(range.pMax);
  return high > low ? { low, high } : null;
}

/**
 * The price span of the concentrated ranges (else all ranges with a bounded end) and the current price, limited to
 * {@link DOMAIN_WINDOW_FACTOR} around the current price - unless no range is within that window, then unlimited.
 */
export function priceDomain(ranges: PoolLiquidityRange[], currentPrice?: number): PriceDomain | null {
  // the concentrated ranges span the axis; a wide position (e.g. near full range) just extends to its edges
  const concentrated = ranges.filter(
    (r) => isBoundedPrice(r.pMin) && isBoundedPrice(r.pMax) && r.pMax / r.pMin <= WIDE_RANGE_RATIO
  );
  const candidates = concentrated.length > 0 ? concentrated : ranges;
  const bounds = candidates
    .flatMap((r) => [r.pMin, r.pMax])
    .filter(isBoundedPrice);
  if (bounds.length === 0) {
    // only unbounded (full range) liquidity: show the window around the price, the ranges span all of it
    return isBoundedPrice(currentPrice)
      ? { min: currentPrice / DOMAIN_WINDOW_FACTOR, max: currentPrice * DOMAIN_WINDOW_FACTOR }
      : null;
  }
  // the current price is always on the axis, so its marker never sits at a misleading edge
  if (isBoundedPrice(currentPrice)) bounds.push(currentPrice);
  const min = Math.min(...bounds);
  const max = Math.max(...bounds);
  if (isBoundedPrice(currentPrice)) {
    const windowMin = Math.max(min, currentPrice / DOMAIN_WINDOW_FACTOR);
    const windowMax = Math.min(max, currentPrice * DOMAIN_WINDOW_FACTOR);
    // any range overlapping the window counts, also a wide one straddling all of it
    const anyRangeInWindow = ranges.some((r) => {
      const bounds = rangeBounds(r);
      return bounds !== null && bounds.low < windowMax && bounds.high > windowMin;
    });
    if (anyRangeInWindow && windowMax > windowMin) {
      return padPriceEdge({ min: windowMin, max: windowMax }, ranges, currentPrice);
    }
  }
  return max > min ? { min, max } : { min: min / 1.01, max: max * 1.01 };
}

/**
 * When the price sits on an end of the axis (every concentrated range lies on one side of it) while a range holds
 * liquidity beyond it, that end is pushed out by a tenth of the axis span (log scale, within the covering range and
 * the price window), so the marker never sits on a misleading edge with the liquidity next to it cut off.
 */
function padPriceEdge(domain: PriceDomain, ranges: PoolLiquidityRange[], currentPrice: number): PriceDomain {
  const pad = Math.max(1.01, Math.pow(domain.max / domain.min, 0.1));
  let { min, max } = domain;
  for (const r of ranges) {
    const covered = rangeBounds(r);
    if (!covered || covered.low > currentPrice || covered.high < currentPrice) continue;
    if (currentPrice >= domain.max && covered.high > currentPrice) {
      max = Math.max(max, Math.min(covered.high, currentPrice * pad, currentPrice * DOMAIN_WINDOW_FACTOR));
    }
    if (currentPrice <= domain.min && covered.low < currentPrice) {
      min = Math.min(min, Math.max(covered.low, currentPrice / pad, currentPrice / DOMAIN_WINDOW_FACTOR));
    }
  }
  return { min, max };
}

/** Position of a price on the log axis, clamped to [0, width]. */
export function priceToX(price: number, domain: PriceDomain, width: number): number {
  if (domain.max <= domain.min) return 0;
  const t = (Math.log(price) - Math.log(domain.min)) / (Math.log(domain.max) - Math.log(domain.min));
  return Math.min(width, Math.max(0, t * width));
}

/**
 * The range holding the current price. The contract's current tick decides when known (as on the backend: exact also
 * on a tick boundary, where two ranges share the boundary price); the price is the fallback.
 */
export function isActiveRange(
  range: PoolLiquidityRange,
  currentPrice: number | undefined,
  currentTick?: number | null
): boolean {
  if (currentTick !== undefined && currentTick !== null && range.tickLow !== undefined && range.tickHigh !== undefined) {
    return range.tickLow <= currentTick && currentTick <= range.tickHigh;
  }
  // half open, like a tick: a price on the boundary shared by two ranges belongs to the upper one only
  return (
    currentPrice !== undefined &&
    range.pMin !== undefined &&
    range.pMax !== undefined &&
    currentPrice >= range.pMin &&
    currentPrice < range.pMax
  );
}

/**
 * Bars ordered left to right. Adjacent bars keep a `gap` of chart units between them; every bar is at least 1 unit
 * wide and tall so a thin range stays visible. Ranges entirely outside the domain - including those with both ends
 * clamped to "unbounded" - are not drawn.
 */
export function buildLiquidityBars(
  ranges: PoolLiquidityRange[],
  currentPrice: number | undefined,
  width: number,
  maxHeight: number,
  gap = 2,
  currentTick?: number | null,
  domain: PriceDomain | null = priceDomain(ranges, currentPrice)
): LiquidityBar[] {
  if (!domain) return [];
  const visible = ranges.filter((r) => {
    const bounds = rangeBounds(r);
    return bounds !== null && bounds.high > domain.min && bounds.low < domain.max;
  });
  const maxLiquidity = Math.max(0, ...visible.map((r) => r.liquidity ?? 0));
  if (maxLiquidity <= 0) return [];
  const bars = visible
    .map((range, index) => {
      const left = priceToX(isBoundedPrice(range.pMin) ? range.pMin : domain.min, domain, width);
      const right = priceToX(isBoundedPrice(range.pMax) ? range.pMax : domain.max, domain, width);
      const span = Math.abs(right - left);
      // the gap comes off both sides; a range thinner than the gap is a 1 unit bar centred on its span
      const barWidth = Math.max(1, span - gap);
      return {
        key: rangeKey(range, index),
        range,
        x: Math.min(left, right) + (span - barWidth) / 2,
        width: barWidth,
        height: Math.max(1, ((range.liquidity ?? 0) / maxLiquidity) * maxHeight),
        active: isActiveRange(range, currentPrice, currentTick),
        hitX: Math.min(left, right),
        hitWidth: span,
      };
    })
    .sort((a, b) => a.x - b.x);
  // hover targets tile the axis: each range's price span, extended to the midpoint of any gap to its neighbours
  const spans = bars.map((b) => ({ left: b.hitX, right: b.hitX + b.hitWidth }));
  for (let i = 0; i < bars.length; i++) {
    const start = i === 0 ? 0 : (spans[i - 1].right + spans[i].left) / 2;
    const end = i === bars.length - 1 ? width : (spans[i].right + spans[i + 1].left) / 2;
    bars[i].hitX = Math.min(start, spans[i].left);
    bars[i].hitWidth = Math.max(end, spans[i].right) - bars[i].hitX;
  }
  return bars;
}

/** Stable key of a range: its tick bounds (unique per pool), the index for a range without them. */
export function rangeKey(range: PoolLiquidityRange, index: number): string {
  return range.tickLow !== undefined && range.tickHigh !== undefined ? `${range.tickLow}-${range.tickHigh}` : `#${index}`;
}

/**
 * The same range seen from the other asset, as the backend's PoolLiquidityRange.Reverse(): prices inverted (the
 * clamped ends 0 and decimal.MaxValue map onto each other), amounts swapped, tick bounds kept.
 */
export function reverseLiquidityRange(range: PoolLiquidityRange): PoolLiquidityRange {
  const invert = (price: number | undefined): number | undefined => {
    if (price === undefined) return undefined;
    if (isUnboundedAbove(price)) return 0;
    return isBoundedPrice(price) ? 1 / price : DECIMAL_MAX;
  };
  return { ...range, pMin: invert(range.pMax), pMax: invert(range.pMin), a: range.b, b: range.a };
}

/** SVG path of a bar with rounded top corners, square at the baseline. */
export function barPath(bar: LiquidityBar, baseline: number, radius = 4): string {
  const top = baseline - bar.height;
  const r = Math.min(radius, bar.width / 2, bar.height);
  const { x, width } = bar;
  return (
    `M${x},${baseline} L${x},${top + r} Q${x},${top} ${x + r},${top} ` +
    `L${x + width - r},${top} Q${x + width},${top} ${x + width},${top + r} L${x + width},${baseline} Z`
  );
}
