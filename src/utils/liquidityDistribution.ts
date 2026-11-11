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
  /** Hover target: the bar plus half of the gaps around it - contiguous with the neighbours, never overlapping. */
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

/**
 * The backend clamps prices outside the decimal range (extreme ticks) to 0 / decimal.MaxValue, meaning "unbounded".
 */
export function isBoundedPrice(price: number | null | undefined): price is number {
  return price !== undefined && price !== null && Number.isFinite(price) && price > 0 && price < 1e28;
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
  const bounds = (concentrated.length > 0 ? concentrated : ranges)
    .flatMap((r) => [r.pMin, r.pMax])
    .filter(isBoundedPrice);
  if (bounds.length === 0) return null;
  // the current price is always on the axis, so its marker never sits at a misleading edge
  if (isBoundedPrice(currentPrice)) bounds.push(currentPrice);
  const min = Math.min(...bounds);
  const max = Math.max(...bounds);
  if (isBoundedPrice(currentPrice)) {
    const windowMin = Math.max(min, currentPrice / DOMAIN_WINDOW_FACTOR);
    const windowMax = Math.min(max, currentPrice * DOMAIN_WINDOW_FACTOR);
    const anyRangeInWindow = bounds.some((b) => b !== currentPrice && b >= windowMin && b <= windowMax);
    if (anyRangeInWindow && windowMax > windowMin) return { min: windowMin, max: windowMax };
  }
  return max > min ? { min, max } : { min: min / 1.01, max: max * 1.01 };
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
    const low = isBoundedPrice(r.pMin) ? r.pMin : r.pMin === 0 ? 0 : undefined;
    const high = isBoundedPrice(r.pMax) ? r.pMax : r.pMax !== undefined && r.pMax > 0 ? Infinity : undefined;
    if (low === undefined || high === undefined) return false;
    return high > domain.min && low < domain.max && (isBoundedPrice(r.pMin) || isBoundedPrice(r.pMax));
  });
  const maxLiquidity = Math.max(0, ...visible.map((r) => r.liquidity ?? 0));
  if (maxLiquidity <= 0) return [];
  const bars = visible
    .map((range) => {
      const left = priceToX(isBoundedPrice(range.pMin) ? range.pMin : domain.min, domain, width);
      const right = priceToX(isBoundedPrice(range.pMax) ? range.pMax : domain.max, domain, width);
      return {
        key: `${range.tickLow}-${range.tickHigh}`,
        range,
        x: Math.min(left, right) + gap / 2,
        width: Math.max(1, Math.abs(right - left) - gap),
        height: Math.max(1, ((range.liquidity ?? 0) / maxLiquidity) * maxHeight),
        active: isActiveRange(range, currentPrice, currentTick),
        hitX: Math.min(left, right),
        hitWidth: Math.max(1, Math.abs(right - left)),
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
