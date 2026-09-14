// src/swap/bestQuote.ts - Picks the route to recommend. Pure functions so the
// selection rule is unit-tested independently of the UI.
import type { RouterQuoteResult } from "./types";

/**
 * The output amount a router's result should be judged by: the simulated
 * (ledger-computed) amount when simulation ran successfully, otherwise the
 * router's advertised quote. A failed simulation disqualifies the route.
 */
export function effectiveOutputAmount(
  result: RouterQuoteResult
): bigint | undefined {
  if (result.status !== "ok" || !result.quote) return undefined;
  if (result.simulation) {
    if (!result.simulation.success) return undefined;
    if (result.simulation.netReceived !== undefined) {
      return result.simulation.netReceived;
    }
  }
  return result.quote.outputAmount;
}

/** Id of the router with the highest effective output, or undefined if none. */
export function pickBestRouterId(
  results: readonly RouterQuoteResult[]
): string | undefined {
  let best: { id: string; amount: bigint } | undefined;
  for (const result of results) {
    const amount = effectiveOutputAmount(result);
    if (amount === undefined || amount <= 0n) continue;
    if (!best || amount > best.amount) {
      best = { id: result.router.id, amount };
    }
  }
  return best?.id;
}

/**
 * How much worse (in percent, >= 0) a route is versus the best one. Returns
 * undefined when either side has no effective amount.
 */
export function percentBelowBest(
  result: RouterQuoteResult,
  results: readonly RouterQuoteResult[]
): number | undefined {
  const bestId = pickBestRouterId(results);
  if (!bestId) return undefined;
  const best = results.find((r) => r.router.id === bestId);
  const bestAmount = best ? effectiveOutputAmount(best) : undefined;
  const own = effectiveOutputAmount(result);
  if (bestAmount === undefined || own === undefined || bestAmount === 0n) {
    return undefined;
  }
  // Scaled integer maths keeps bigint precision until the final division.
  const diffMicroPercent = ((bestAmount - own) * 1_000_000n) / bestAmount;
  return Number(diffMicroPercent) / 10_000;
}
