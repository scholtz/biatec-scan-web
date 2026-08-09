import type { FilterableTransaction } from "./txFilter";

export interface AssetFlow {
  received: number; // raw units gained
  spent: number; // raw units lost (including fees, for asset 0)
}

/**
 * Gross received/spent raw units per asset (0 = ALGO) for `address`,
 * considering pay/axfer transactions (including inner transactions produced
 * by app calls) with round-time >= sinceSeconds. Inner transactions inherit
 * their parent's round-time, since the indexer does not stamp one on them
 * individually. Fees are only charged to the top-level transaction's
 * `sender` (the fee payer) — fee pooling means inner transactions don't pay
 * their own fee. Net change is `received - spent`. Does not account for
 * rewards or asset close-to.
 */
export function computeBalanceFlows(
  transactions: FilterableTransaction[],
  address: string,
  sinceSeconds: number,
): Map<number, AssetFlow> {
  const flows = new Map<number, AssetFlow>();
  const flow = (assetId: number): AssetFlow => {
    let f = flows.get(assetId);
    if (!f) {
      f = { received: 0, spent: 0 };
      flows.set(assetId, f);
    }
    return f;
  };

  const visit = (
    tx: FilterableTransaction,
    roundTime: number | undefined,
    isTopLevel: boolean,
  ) => {
    if (roundTime === undefined || roundTime < sinceSeconds) return;

    const isSender = tx.sender === address;
    if (isTopLevel && isSender && tx.fee) flow(0).spent += tx.fee;

    if (tx["tx-type"] === "pay") {
      const pay = tx["payment-transaction"];
      if (pay) {
        const amount = pay.amount ?? 0;
        if (isSender) flow(0).spent += amount;
        if (pay.receiver === address) flow(0).received += amount;
      }
    } else if (tx["tx-type"] === "axfer") {
      const axfer = tx["asset-transfer-transaction"];
      if (axfer) {
        const assetId = axfer["asset-id"] ?? 0;
        const amount = axfer.amount ?? 0;
        if (isSender) flow(assetId).spent += amount;
        if (axfer.receiver === address) flow(assetId).received += amount;
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

  return flows;
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
