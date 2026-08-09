import type { FilterableTransaction } from "./txFilter";

/**
 * Net raw-unit balance change per asset (0 = ALGO) for `address`, considering
 * pay/axfer transactions (including inner transactions produced by app
 * calls) with round-time >= sinceSeconds. Inner transactions inherit their
 * parent's round-time, since the indexer does not stamp one on them
 * individually. Fees are only charged to the top-level transaction's
 * `sender` (the fee payer) — fee pooling means inner transactions don't pay
 * their own fee. Does not account for rewards or asset close-to.
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

  const visit = (
    tx: FilterableTransaction,
    roundTime: number | undefined,
    isTopLevel: boolean,
  ) => {
    if (roundTime === undefined || roundTime < sinceSeconds) return;

    const isSender = tx.sender === address;
    if (isTopLevel && isSender && tx.fee) add(0, -tx.fee);

    if (tx["tx-type"] === "pay") {
      const pay = tx["payment-transaction"];
      if (pay) {
        const amount = pay.amount ?? 0;
        if (isSender) add(0, -amount);
        if (pay.receiver === address) add(0, amount);
      }
    } else if (tx["tx-type"] === "axfer") {
      const axfer = tx["asset-transfer-transaction"];
      if (axfer) {
        const assetId = axfer["asset-id"] ?? 0;
        const amount = axfer.amount ?? 0;
        if (isSender) add(assetId, -amount);
        if (axfer.receiver === address) add(assetId, amount);
      }
    }

    const innerTxns = tx["inner-txns"];
    if (Array.isArray(innerTxns)) {
      for (const innerTx of innerTxns as FilterableTransaction[]) {
        visit(innerTx, roundTime, false);
      }
    }
  };

  for (const tx of transactions) {
    visit(tx, tx["round-time"], true);
  }

  return deltas;
}

/**
 * Whether a fetched transaction batch reaches back far enough to cover
 * `sinceSeconds`. When the batch wasn't truncated by a fetch cap, it is the
 * address's entire history, so it always "covers" any requested window.
 */
export function historyCoversTime(
  truncated: boolean,
  earliestTime: number | null,
  sinceSeconds: number,
): boolean {
  if (!truncated) return true;
  return earliestTime === null || earliestTime <= sinceSeconds;
}
