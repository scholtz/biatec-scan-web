import { AMMType, Pool } from "../api/models";

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
 * All other pools price as virtualAmountB / virtualAmountA.
 */
export function poolSpotPrice(p: Pool): number | undefined {
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
