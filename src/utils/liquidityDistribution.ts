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
}

export interface PriceDomain {
  min: number;
  max: number;
}

/**
 * The backend clamps prices outside the decimal range (extreme ticks) to 0 / decimal.MaxValue, meaning "unbounded".
 */
export function isBoundedPrice(price: number | null | undefined): price is number {
  return price !== undefined && price !== null && Number.isFinite(price) && price > 0 && price < 1e28;
}

export function priceDomain(ranges: PoolLiquidityRange[]): PriceDomain | null {
  const bounds = ranges.flatMap((r) => [r.pMin, r.pMax]).filter(isBoundedPrice);
  if (bounds.length === 0) return null;
  return { min: Math.min(...bounds), max: Math.max(...bounds) };
}

/** Position of a price on the log axis, clamped to [0, width]. */
export function priceToX(price: number, domain: PriceDomain, width: number): number {
  if (domain.max <= domain.min) return 0;
  const t = (Math.log(price) - Math.log(domain.min)) / (Math.log(domain.max) - Math.log(domain.min));
  return Math.min(width, Math.max(0, t * width));
}

export function isActiveRange(range: PoolLiquidityRange, currentPrice: number | undefined): boolean {
  return (
    currentPrice !== undefined &&
    range.pMin !== undefined &&
    range.pMax !== undefined &&
    currentPrice >= range.pMin &&
    currentPrice <= range.pMax
  );
}

/**
 * Bars ordered left to right. Adjacent bars keep a `gap` of chart units between them; every bar is at least 1 unit
 * wide and tall so a thin range stays visible.
 */
export function buildLiquidityBars(
  ranges: PoolLiquidityRange[],
  currentPrice: number | undefined,
  width: number,
  maxHeight: number,
  gap = 2
): LiquidityBar[] {
  const domain = priceDomain(ranges);
  if (!domain) return [];
  const maxLiquidity = Math.max(0, ...ranges.map((r) => r.liquidity ?? 0));
  if (maxLiquidity <= 0) return [];
  return ranges
    .map((range) => {
      const left = priceToX(isBoundedPrice(range.pMin) ? range.pMin : domain.min, domain, width);
      const right = priceToX(isBoundedPrice(range.pMax) ? range.pMax : domain.max, domain, width);
      return {
        key: `${range.tickLow}-${range.tickHigh}`,
        range,
        x: Math.min(left, right) + gap / 2,
        width: Math.max(1, Math.abs(right - left) - gap),
        height: Math.max(1, ((range.liquidity ?? 0) / maxLiquidity) * maxHeight),
        active: isActiveRange(range, currentPrice),
      };
    })
    .sort((a, b) => a.x - b.x);
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
