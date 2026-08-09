import type { FilterableTransaction } from "./txFilter";

/**
 * Net raw-unit balance change per asset (0 = ALGO) for `address`, considering
 * only top-level pay/axfer transactions with round-time >= sinceSeconds.
 * Fees are only charged to the transaction's `sender` (the fee payer).
 * Does not account for inner transactions, rewards, or asset close-to.
 */
export function computeBalanceDeltas(
  transactions: FilterableTransaction[],
  address: string,
  sinceSeconds: number,
): Map<number, number> {
  const deltas = new Map<number, number>();
  const add = (assetId: number, amount: number) => {
    deltas.set(assetId, (deltas.get(assetId) ?? 0) + amount);
  };

  for (const tx of transactions) {
    const roundTime = tx["round-time"];
    if (roundTime === undefined || roundTime < sinceSeconds) continue;

    const isSender = tx.sender === address;
    if (isSender && tx.fee) add(0, -tx.fee);

    if (tx["tx-type"] === "pay") {
      const pay = tx["payment-transaction"];
      if (!pay) continue;
      const amount = pay.amount ?? 0;
      if (isSender) add(0, -amount);
      if (pay.receiver === address) add(0, amount);
    } else if (tx["tx-type"] === "axfer") {
      const axfer = tx["asset-transfer-transaction"];
      if (!axfer) continue;
      const assetId = axfer["asset-id"] ?? 0;
      const amount = axfer.amount ?? 0;
      if (isSender) add(assetId, -amount);
      if (axfer.receiver === address) add(assetId, amount);
    }
  }

  return deltas;
}
