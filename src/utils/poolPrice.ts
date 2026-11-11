import { AMMType, AggregatedPool, Pool } from "../api/models";

/**
 * Spot price of a pool in assetB-per-assetA terms, mirroring
 * BiatecClammPool.algo.ts `calculatePrice`.
 *
 * Concentrated-liquidity pools with a flat price range (pMin === pMax) trade
 * at exactly that wall price by definition — the contract special-cases this
 * before the virtual-reserve formula, because the virtual-reserve quotient is
 * degenerate for a zero-width range. The AVMTradeReporter backend currently
 * misses that special case and reports raw balances as the virtual amounts
 * for such pools (see scholtz/AVMTradeReporter#17), so dividing them yields
 * garbage; the range price is the authoritative value here.
 *
 * Tick based CLAMM pools (Pact CLAMM) carry the contract price (`currentPrice`, from the pool's sqrt price) - the
 * exact value the reserves are derived from - unless they hold nothing: a pool whose liquidity was fully withdrawn
 * keeps its last contract price, which must not price anything.
 *
 * All other pools price as virtualAmountB / virtualAmountA.
 *
 * Scam-zeroed pools get no price. The backend zeroes their balances but keeps `currentPrice` (follow-up: null it in
 * AVMTradeReporter ScamRatingPolicy.ApplyBalanceRule too), hence the threshold check here.
 */
/** Mirrors the backend ScamRatingPolicy.ZeroBalancesThreshold: above it a pool contributes no price anywhere. */
export const SCAM_ZERO_BALANCES_THRESHOLD = 80;

export function poolSpotPrice(p: Pool): number | undefined {
  if ((p.scamRating ?? 0) > SCAM_ZERO_BALANCES_THRESHOLD) return undefined;
  if (p.ammType === AMMType.TickBasedCLAMM && p.currentPrice != null && p.currentPrice > 0) {
    return (p.a ?? 0) > 0 || (p.b ?? 0) > 0 ? p.currentPrice : undefined;
  }
  if (
    p.ammType === AMMType.ConcentratedLiquidityAMM &&
    p.pMin != null &&
    p.pMax != null &&
    p.pMin === p.pMax &&
    p.pMin > 0
  ) {
    return p.pMin;
  }
  if (!p.virtualAmountA || !p.virtualAmountB) return undefined;
  return p.virtualAmountB / p.virtualAmountA;
}

/**
 * Spot price of an aggregated pool: how many units of asset B one unit of
 * asset A is worth (the value the UI labels "unitA/unitB").
 *
 * Prefers the backend's `virtualSum*Level1ForPrice` sums, which exclude
 * concentrated-liquidity pools whose current price sits outside their
 * [pMin, pMax] range — such pools hold one-sided liquidity that says nothing
 * about the current market price, and folding their balances into the plain
 * `virtualSumA/B` totals skews the quotient (e.g. GoldDAO/USDC read ~0.9986
 * from the raw sums while the true price from in-range pools was ~0.965).
 * Falls back to the raw sums for aggregates that predate the ForPrice fields.
 */
export function aggregatedPoolSpotPrice(p: AggregatedPool): number | undefined {
  const aForPrice = p.virtualSumALevel1ForPrice;
  const bForPrice = p.virtualSumBLevel1ForPrice;
  if (aForPrice != null && bForPrice != null && aForPrice > 0 && bForPrice > 0) {
    return bForPrice / aForPrice;
  }
  if (!p.virtualSumA || !p.virtualSumB) return undefined;
  return p.virtualSumB / p.virtualSumA;
}
