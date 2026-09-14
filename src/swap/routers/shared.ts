// src/swap/routers/shared.ts - Small helpers every router adapter needs so the
// adapters stay focused on their own API's shape.
import algosdk from "algosdk";
import { Buffer } from "buffer";
import { SwapRouterError } from "../errors";

/** Decode base64 unsigned transactions; throws `noTransactions` when empty. */
export function decodeUnsignedTransactions(
  encoded: readonly string[] | null | undefined
): algosdk.Transaction[] {
  if (!Array.isArray(encoded) || encoded.length === 0) {
    throw new SwapRouterError("noTransactions");
  }
  return encoded.map((b64) =>
    algosdk.decodeUnsignedTransaction(new Uint8Array(Buffer.from(b64, "base64")))
  );
}

/** Router-reported number -> bigint (rounded), or undefined when absent. */
export function toBigInt(value: number | undefined | null): bigint | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? BigInt(Math.round(value))
    : undefined;
}

/** Router-reported fraction (0.01 = 1%) -> percent, or undefined when absent. */
export function fractionToPercent(value: number | undefined | null): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value * 100 : undefined;
}

/**
 * Convert a bigint amount to a JS number for APIs whose schema only accepts
 * numbers; refuses anything that cannot be represented exactly rather than
 * silently signing a rounded amount.
 */
export function toSafeNumber(amount: bigint): number {
  if (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount < 0n) {
    throw new SwapRouterError("amountTooLarge");
  }
  return Number(amount);
}

/** Throw `cancelled` when the caller aborted the quote round. */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new SwapRouterError("cancelled");
}

/** Reject quotes whose output is zero - they can never be a valid route. */
export function assertPositiveOutput(outputAmount: bigint): void {
  if (outputAmount <= 0n) throw new SwapRouterError("emptyQuote");
}
