import type { Pool } from "../api/models";

/**
 * `Pool.lpFee` is the *total* swap fee rate (e.g. 0.003 for 0.3%).
 * `Pool.protocolFeePortion` is the fraction of that total fee routed to the
 * protocol rather than liquidity providers (e.g. 0.5 means half of the 0.3%
 * goes to the protocol, half to LPs). See AVMTradeReporter's
 * `Pool.ProtocolFeePortion` doc comment for the authoritative definition.
 */

/** Fraction of trade volume that liquidity providers earn (lpFee * (1 - protocolFeePortion)). */
export function lpFeeRate(p: Pool): number | undefined {
  if (p.lpFee == null) return undefined;
  return p.lpFee * (1 - (p.protocolFeePortion ?? 0));
}

/** Fraction of trade volume routed to the protocol (lpFee * protocolFeePortion). */
export function protocolFeeRate(p: Pool): number | undefined {
  if (p.lpFee == null) return undefined;
  return p.lpFee * (p.protocolFeePortion ?? 0);
}

/** USD fees earned by liquidity providers over the trailing 24 hours. */
export function lpFeesCollected24H(p: Pool): number | undefined {
  const rate = lpFeeRate(p);
  if (rate == null || p.volume24H == null) return undefined;
  return rate * p.volume24H;
}

/** USD fees earned by the protocol over the trailing 24 hours. */
export function protocolFeesCollected24H(p: Pool): number | undefined {
  const rate = protocolFeeRate(p);
  if (rate == null || p.volume24H == null) return undefined;
  return rate * p.volume24H;
}

/** USD fees earned by liquidity providers over the trailing 7 days. */
export function lpFeesCollected7D(p: Pool): number | undefined {
  const rate = lpFeeRate(p);
  if (rate == null || p.volume7D == null) return undefined;
  return rate * p.volume7D;
}

/** USD fees earned by the protocol over the trailing 7 days. */
export function protocolFeesCollected7D(p: Pool): number | undefined {
  const rate = protocolFeeRate(p);
  if (rate == null || p.volume7D == null) return undefined;
  return rate * p.volume7D;
}

/** Total USD value locked in the pool (both sides). */
export function poolTvlUsd(p: Pool): number | undefined {
  if (p.totalTVLAssetAInUSD == null && p.totalTVLAssetBInUSD == null) return undefined;
  return (p.totalTVLAssetAInUSD ?? 0) + (p.totalTVLAssetBInUSD ?? 0);
}

const DAYS_PER_YEAR = 365;

/**
 * Annualized APR for liquidity providers, derived from the trailing 24h LP
 * fees relative to TVL: (fees24H / TVL) * 365. Returned as a fraction (0.12
 * = 12%), matching FormattedNumber's `type="percent"` input convention.
 */
export function dailyApr(p: Pool): number | undefined {
  const fees = lpFeesCollected24H(p);
  const tvl = poolTvlUsd(p);
  if (fees == null || tvl == null || tvl <= 0) return undefined;
  return (fees / tvl) * DAYS_PER_YEAR;
}

/**
 * Annualized APR for liquidity providers, derived from the trailing 7-day LP
 * fees relative to TVL: (fees7D / TVL) * (365 / 7). Smooths out single-day
 * volume spikes compared to `dailyApr`. Returned as a fraction.
 */
export function weeklyApr(p: Pool): number | undefined {
  const fees = lpFeesCollected7D(p);
  const tvl = poolTvlUsd(p);
  if (fees == null || tvl == null || tvl <= 0) return undefined;
  return (fees / tvl) * (DAYS_PER_YEAR / 7);
}
