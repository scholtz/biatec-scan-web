// src/swap/amounts.ts - Pure bigint helpers for converting between the
// decimal strings users type and on-chain base units, plus slippage maths.
// Deliberately float-free so 0.1 + 0.2 style rounding can never change the
// amount a user signs.

const DECIMAL_INPUT = /^\d*(?:[.,]\d*)?$/;

/**
 * Parse a user-typed decimal string ("1.5", "0,25", "100") into base units.
 * Returns undefined for empty/invalid input or more fractional digits than
 * the asset supports.
 */
export function parseAmountToBaseUnits(
  input: string,
  decimals: number
): bigint | undefined {
  const trimmed = input.trim();
  if (!trimmed || !DECIMAL_INPUT.test(trimmed)) return undefined;
  const [wholeRaw, fractionRaw = ""] = trimmed.replace(",", ".").split(".");
  const whole = wholeRaw || "0";
  if (fractionRaw.length > decimals) return undefined;
  const fraction = fractionRaw.padEnd(decimals, "0");
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "");
  return BigInt(digits || "0");
}

/** Format base units as a plain decimal string without exponent notation. */
export function formatBaseUnits(
  amount: bigint,
  decimals: number,
  maxFractionDigits: number = decimals
): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const str = abs.toString().padStart(decimals + 1, "0");
  const whole = str.slice(0, str.length - decimals);
  let fraction = decimals > 0 ? str.slice(str.length - decimals) : "";
  fraction = fraction.slice(0, Math.max(0, maxFractionDigits));
  fraction = fraction.replace(/0+$/, "");
  const wholeGrouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const body = fraction ? `${wholeGrouped}.${fraction}` : wholeGrouped;
  return negative ? `-${body}` : body;
}

/** Base units -> JS number (only for display / price maths, never for signing). */
export function baseUnitsToNumber(amount: bigint, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}

/**
 * Minimum output after applying a slippage tolerance in basis points.
 * 10000 bps (100%) means "no protection" and yields 0.
 */
export function applySlippage(outputAmount: bigint, slippageBps: number): bigint {
  const bps = BigInt(Math.max(0, Math.min(10000, Math.round(slippageBps))));
  if (bps >= 10000n) return 0n;
  return (outputAmount * (10000n - bps)) / 10000n;
}

/** Percent ("1", "0.5") -> basis points, clamped to 0..10000. */
export function percentToBps(percent: string | number): number {
  const value = typeof percent === "number" ? percent : Number(percent);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10000, Math.round(value * 100)));
}

/**
 * Price of one whole unit of the input asset expressed in the output asset,
 * derived from the two base-unit amounts. Returns undefined if input is 0.
 */
export function computeUnitPrice(
  inputAmount: bigint,
  inputDecimals: number,
  outputAmount: bigint,
  outputDecimals: number
): number | undefined {
  if (inputAmount <= 0n) return undefined;
  return (
    baseUnitsToNumber(outputAmount, outputDecimals) /
    baseUnitsToNumber(inputAmount, inputDecimals)
  );
}
