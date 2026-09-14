// src/swap/executeSwap.ts - Wallet-agnostic execution of a prepared quote:
// validate, sign through the injected signer (use-wallet's
// `signTransactions`), submit each atomic group in order and wait for
// confirmation. No router-specific code lives here.
import algosdk from "algosdk";
import type { SwapQuote } from "./types";
import { assertSwapGroupSafe } from "./validate";

/**
 * Signs the given transactions for the indices requested and returns an
 * array aligned with `transactions` (null where not signed) - the exact
 * contract of @txnlab/use-wallet's `signTransactions`.
 */
export type SwapSigner = (
  transactions: algosdk.Transaction[],
  indexesToSign: number[]
) => Promise<(Uint8Array | null)[]>;

export type SwapExecutionStage = "validate" | "sign" | "submit" | "confirm";

export class SwapExecutionError extends Error {
  constructor(
    public readonly stage: SwapExecutionStage,
    message: string,
    public readonly txIds: string[] = []
  ) {
    super(message);
    this.name = "SwapExecutionError";
  }
}

export interface SwapExecutionResult {
  txIds: string[];
  confirmedRound?: bigint;
}

const CONFIRMATION_WAIT_ROUNDS = 10;

export async function executeSwapQuote(
  quote: SwapQuote,
  sender: string,
  signer: SwapSigner,
  algod: algosdk.Algodv2
): Promise<SwapExecutionResult> {
  // Validate everything up front so a bad later group never leaves an
  // earlier one already on chain.
  for (const group of quote.groups) {
    try {
      assertSwapGroupSafe(group.transactions, group.presigned, sender);
    } catch (error: unknown) {
      throw new SwapExecutionError(
        "validate",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  const txIds: string[] = [];
  let confirmedRound: bigint | undefined;
  for (const group of quote.groups) {
    const indexesToSign = group.transactions
      .map((_, index) => index)
      .filter((index) => !group.presigned.has(index));

    let signed: (Uint8Array | null)[];
    try {
      signed = await signer(group.transactions, indexesToSign);
    } catch (error: unknown) {
      throw new SwapExecutionError(
        "sign",
        error instanceof Error ? error.message : String(error),
        txIds
      );
    }
    const bytes = group.transactions.map((_, index) => {
      const presigned = group.presigned.get(index);
      if (presigned) return presigned;
      const bytesFromWallet = signed[index];
      if (!bytesFromWallet) {
        throw new SwapExecutionError(
          "sign",
          `Wallet did not return a signature for transaction ${index + 1}.`,
          txIds
        );
      }
      return bytesFromWallet;
    });

    let txId: string;
    try {
      const response = await algod.sendRawTransaction(bytes).do();
      txId = response.txid;
      txIds.push(txId);
    } catch (error: unknown) {
      throw new SwapExecutionError(
        "submit",
        error instanceof Error ? error.message : String(error),
        txIds
      );
    }
    try {
      const confirmation = await algosdk.waitForConfirmation(
        algod,
        txId,
        CONFIRMATION_WAIT_ROUNDS
      );
      confirmedRound = confirmation.confirmedRound ?? confirmedRound;
    } catch (error: unknown) {
      throw new SwapExecutionError(
        "confirm",
        error instanceof Error ? error.message : String(error),
        txIds
      );
    }
  }
  return { txIds, confirmedRound };
}
