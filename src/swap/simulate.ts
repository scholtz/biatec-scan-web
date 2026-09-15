// src/swap/simulate.ts - Dry-runs a quote's prepared groups against algod so
// the UI can show the ledger-computed outcome instead of the router's own
// advertised estimate. Ported from Biatec Wallet (scripts/aggregators/
// simulate.ts) and generalised over SwapTransactionGroup.
import algosdk from "algosdk";
import type {
  SwapQuote,
  SwapSimulationResult,
  SwapTransactionGroup,
} from "./types";

/** Encode a prepared group into the bytes algod's simulate endpoint expects. */
export function encodeGroupForSimulation(
  group: SwapTransactionGroup
): Uint8Array[] {
  return group.transactions.map((tx, index) => {
    const presigned = group.presigned.get(index);
    return presigned ?? algosdk.encodeUnsignedSimulateTransaction(tx);
  });
}

interface AssetDelta {
  received: bigint;
  sent: bigint;
}

function walkAssetDelta(
  result: algosdk.modelsv2.PendingTransactionResponse | undefined,
  address: string,
  assetId: bigint,
  acc: AssetDelta
): void {
  const txn = result?.txn?.txn;
  if (txn) {
    const sender = txn.sender?.toString();
    if (assetId === 0n) {
      if (txn.payment) {
        const receiver = txn.payment.receiver?.toString();
        if (receiver === address) acc.received += txn.payment.amount;
        if (sender === address) acc.sent += txn.payment.amount;
      }
    } else if (
      txn.assetTransfer &&
      BigInt(txn.assetTransfer.assetIndex) === assetId
    ) {
      const receiver = txn.assetTransfer.receiver?.toString();
      if (receiver === address) acc.received += txn.assetTransfer.amount;
      if (sender === address) acc.sent += txn.assetTransfer.amount;
    }
  }
  for (const inner of result?.innerTxns ?? []) {
    walkAssetDelta(inner, address, assetId, acc);
  }
}

/** Reduce a simulate response into the net asset movement for `address`. */
export function summarizeSimulation(
  response: algosdk.modelsv2.SimulateResponse,
  address: string,
  fromAssetId: bigint,
  toAssetId: bigint
): SwapSimulationResult {
  const toDelta: AssetDelta = { received: 0n, sent: 0n };
  const fromDelta: AssetDelta = { received: 0n, sent: 0n };
  let failureMessage: string | undefined;

  for (const group of response.txnGroups) {
    if (group.failedAt) {
      failureMessage = group.failureMessage || "Simulation failed";
    }
    for (const txnResult of group.txnResults) {
      walkAssetDelta(txnResult.txnResult, address, toAssetId, toDelta);
      walkAssetDelta(txnResult.txnResult, address, fromAssetId, fromDelta);
    }
  }

  if (failureMessage) {
    return { success: false, failureMessage };
  }
  return {
    success: true,
    netReceived: toDelta.received - toDelta.sent,
    netSent: fromDelta.sent - fromDelta.received,
  };
}

/** Simulate every group of a quote and summarise the sender's net outcome. */
export async function simulateQuote(
  algod: algosdk.Algodv2,
  quote: SwapQuote,
  sender: string,
  fromAssetId: bigint,
  toAssetId: bigint
): Promise<SwapSimulationResult> {
  const txnGroups = quote.groups.map(
    (group) =>
      new algosdk.modelsv2.SimulateRequestTransactionGroup({
        txns: encodeGroupForSimulation(group).map((bytes) =>
          algosdk.decodeSignedTransaction(bytes)
        ),
      })
  );
  const request = new algosdk.modelsv2.SimulateRequest({
    txnGroups,
    allowEmptySignatures: true,
    allowUnnamedResources: true,
    fixSigners: true,
  });
  const response = await algod.simulateTransactions(request).do();
  return summarizeSimulation(response, sender, fromAssetId, toAssetId);
}
