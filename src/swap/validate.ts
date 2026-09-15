// src/swap/validate.ts - Safety guard applied to every router-returned
// transaction before the wallet is asked to sign it. Ported from Biatec
// Wallet (AW-2026-043): an aggregator API is an untrusted remote party, and
// a malicious/compromised one could slip a rekey or close-out into an
// otherwise ordinary swap group. None of those have any legitimate role in
// a swap, so the whole batch is rejected rather than sanitised.
import type algosdk from "algosdk";

export class UnsafeSwapTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeSwapTransactionError";
  }
}

export function assertSwapTransactionSafe(
  tx: algosdk.Transaction,
  expectedSender: string
): void {
  const sender = tx.sender.toString();
  if (sender !== expectedSender) {
    throw new UnsafeSwapTransactionError(
      `Refusing to sign swap transaction: sender ${sender} does not match the connected account ${expectedSender}.`
    );
  }
  if (tx.rekeyTo) {
    throw new UnsafeSwapTransactionError(
      "Refusing to sign swap transaction: it attempts to rekey this account."
    );
  }
  if (tx.payment?.closeRemainderTo) {
    throw new UnsafeSwapTransactionError(
      "Refusing to sign swap transaction: it attempts to close the account's native balance."
    );
  }
  if (tx.assetTransfer?.closeRemainderTo) {
    throw new UnsafeSwapTransactionError(
      "Refusing to sign swap transaction: it attempts to close an asset balance."
    );
  }
}

/**
 * Validate every transaction the wallet will sign. Indices present in
 * `presigned` are skipped - they are signed by someone else (logic
 * signatures) and legitimately have a different sender.
 */
export function assertSwapGroupSafe(
  transactions: readonly algosdk.Transaction[],
  presigned: ReadonlyMap<number, Uint8Array>,
  expectedSender: string
): void {
  transactions.forEach((tx, index) => {
    if (presigned.has(index)) return;
    assertSwapTransactionSafe(tx, expectedSender);
  });
}
