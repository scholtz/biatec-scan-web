// src/swap/executeSwap.ts - Wallet-agnostic execution of a prepared quote:
// validate every group, sign every group, and only then submit them in
// order and wait for confirmation - so a rejected wallet prompt can never
// leave an earlier group already on chain. No router-specific code here.
import algosdk from "algosdk";
import { errorMessage } from "./errors";
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
    /** Transactions already submitted before the failure, if any. */
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

async function stage<T>(
  name: SwapExecutionStage,
  txIds: string[],
  run: () => Promise<T> | T
): Promise<T> {
  try {
    return await run();
  } catch (error: unknown) {
    throw new SwapExecutionError(name, errorMessage(error), txIds);
  }
}

export async function executeSwapQuote(
  quote: SwapQuote,
  sender: string,
  signer: SwapSigner,
  algod: algosdk.Algodv2
): Promise<SwapExecutionResult> {
  const txIds: string[] = [];

  await stage("validate", txIds, () => {
    for (const group of quote.groups) {
      assertSwapGroupSafe(group.transactions, group.presigned, sender);
    }
  });

  const signedGroups = await stage("sign", txIds, async () => {
    const groups: Uint8Array[][] = [];
    for (const group of quote.groups) {
      const indexesToSign = group.transactions
        .map((_, index) => index)
        .filter((index) => !group.presigned.has(index));
      const signed = await signer(group.transactions, indexesToSign);
      groups.push(
        group.transactions.map((_, index) => {
          const bytes = group.presigned.get(index) ?? signed[index];
          if (!bytes) {
            throw new Error(
              `Wallet did not return a signature for transaction ${index + 1}.`
            );
          }
          return bytes;
        })
      );
    }
    return groups;
  });

  let confirmedRound: bigint | undefined;
  for (const bytes of signedGroups) {
    const txId = await stage("submit", txIds, async () => {
      const response = await algod.sendRawTransaction(bytes).do();
      txIds.push(response.txid);
      return response.txid;
    });
    await stage("confirm", txIds, async () => {
      const confirmation = await algosdk.waitForConfirmation(
        algod,
        txId,
        CONFIRMATION_WAIT_ROUNDS
      );
      confirmedRound = confirmation.confirmedRound ?? confirmedRound;
    });
  }
  return { txIds, confirmedRound };
}
