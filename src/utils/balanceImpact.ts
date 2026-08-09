import algosdk from "algosdk";

export interface AssetChange {
  assetId: string;
  amount: bigint;
}

export interface AddressImpact {
  address: string;
  changes: AssetChange[];
  fee: bigint;
}

/**
 * Accumulates per-address, per-asset balance deltas (raw units, asset id "0"
 * = ALGO) caused by a transaction and all of its inner transactions into
 * `balances`, and per-address fees into `fees`. Shared between the single
 * transaction balance-impact card and the transaction-group page.
 */
export const collectImpacts = (
  tx: algosdk.indexerModels.Transaction,
  balances: Map<string, Map<string, bigint>>,
  fees: Map<string, bigint>
) => {
  const add = (address: string | undefined, assetId: string, delta: bigint) => {
    if (!address || delta === 0n) return;
    let perAsset = balances.get(address);
    if (!perAsset) {
      perAsset = new Map();
      balances.set(address, perAsset);
    }
    perAsset.set(assetId, (perAsset.get(assetId) ?? 0n) + delta);
  };

  const sender = tx.sender?.toString();
  const fee = BigInt(tx.fee ?? 0);
  if (fee > 0n && sender) {
    add(sender, "0", -fee);
    fees.set(sender, (fees.get(sender) ?? 0n) + fee);
  }

  const pay = tx.paymentTransaction;
  if (pay) {
    const receiver = pay.receiver?.toString();
    const amount = BigInt(pay.amount ?? 0);
    add(sender, "0", -amount);
    add(receiver, "0", amount);
    const closeAmount = BigInt(pay.closeAmount ?? 0);
    if (pay.closeRemainderTo && closeAmount > 0n) {
      add(sender, "0", -closeAmount);
      add(pay.closeRemainderTo.toString(), "0", closeAmount);
    }
  }

  const axfer = tx.assetTransferTransaction;
  if (axfer) {
    const assetId = axfer.assetId.toString();
    // Clawback transfers move assets from axfer.sender, not the tx sender
    const source = axfer.sender?.toString() || sender;
    const receiver = axfer.receiver?.toString();
    const amount = BigInt(axfer.amount ?? 0);
    add(source, assetId, -amount);
    add(receiver, assetId, amount);
    const closeAmount = BigInt(axfer.closeAmount ?? 0);
    if (axfer.closeTo && closeAmount > 0n) {
      add(source, assetId, -closeAmount);
      add(axfer.closeTo.toString(), assetId, closeAmount);
    }
  }

  const acfg = tx.assetConfigTransaction;
  if (acfg && !acfg.assetId && tx.createdAssetIndex && acfg.params) {
    // Asset creation mints the whole supply to the creator
    add(sender, tx.createdAssetIndex.toString(), BigInt(acfg.params.total ?? 0));
  }

  if (tx.innerTxns) {
    for (const inner of tx.innerTxns) {
      collectImpacts(inner, balances, fees);
    }
  }
};

/**
 * Computes sorted per-address impacts for a set of transactions (each with
 * its inner transactions). ALGO first, then assets in numeric order.
 */
export function computeAddressImpacts(
  transactions: algosdk.indexerModels.Transaction[]
): AddressImpact[] {
  const balances = new Map<string, Map<string, bigint>>();
  const fees = new Map<string, bigint>();
  for (const tx of transactions) {
    collectImpacts(tx, balances, fees);
  }

  const result: AddressImpact[] = [];
  for (const [address, perAsset] of balances) {
    const changes = [...perAsset.entries()]
      .map(([assetId, amount]) => ({ assetId, amount }))
      .sort((a, b) => {
        if (a.assetId === "0") return -1;
        if (b.assetId === "0") return 1;
        return a.assetId.localeCompare(b.assetId, undefined, {
          numeric: true,
        });
      });
    result.push({ address, changes, fee: fees.get(address) ?? 0n });
  }
  return result;
}
