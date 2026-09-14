import algosdk from "algosdk";
import { describe, expect, it, vi } from "vitest";
import { executeSwapQuote, SwapExecutionError } from "./executeSwap";
import type { SwapQuote } from "./types";

const user = algosdk.generateAccount();
const other = algosdk.generateAccount();
const params: algosdk.SuggestedParams = {
  fee: 1000n,
  minFee: 1000n,
  flatFee: true,
  firstValid: 1n,
  lastValid: 10n,
  genesisID: "mainnet-v1.0",
  genesisHash: new Uint8Array(32),
};

function txn(sender = user.addr) {
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: other.addr,
    amount: 1,
    suggestedParams: params,
  });
}

function quoteWith(groups: SwapQuote["groups"]): SwapQuote {
  return {
    outputAmount: 1n,
    minimumReceived: 1n,
    route: { paths: [] },
    requiredAppOptIns: [],
    groups,
  };
}

function fakeAlgod(txids: string[] = ["TX1"]) {
  let call = 0;
  const sendRawTransaction = vi.fn(() => ({
    do: () => Promise.resolve({ txid: txids[call++] ?? "TX?" }),
  }));
  const pendingTransactionInformation = vi.fn(() => ({
    do: () =>
      Promise.resolve({ confirmedRound: 5n, poolError: "", txn: {} }),
  }));
  const status = vi.fn(() => ({ do: () => Promise.resolve({ lastRound: 1n }) }));
  // Only the members executeSwapQuote touches are stubbed; the cast is the
  // narrowest way to hand vitest's partial double to a parameter typed as the
  // full algosdk client.
  const algod = {
    sendRawTransaction,
    pendingTransactionInformation,
    status,
  } as unknown as algosdk.Algodv2;
  return { algod, sendRawTransaction };
}

describe("executeSwapQuote", () => {
  it("signs only non-presigned indexes, merges bytes and submits each group", async () => {
    const presignedBytes = new Uint8Array([9, 9, 9]);
    const signedBytes = new Uint8Array([1, 2, 3]);
    const groups: SwapQuote["groups"] = [
      {
        transactions: [txn(other.addr), txn()],
        presigned: new Map([[0, presignedBytes]]),
      },
    ];
    const signer = vi.fn(async (_txns: algosdk.Transaction[], indexes: number[]) =>
      _txns.map((_, i) => (indexes.includes(i) ? signedBytes : null))
    );
    const { algod, sendRawTransaction } = fakeAlgod(["ABC"]);

    const result = await executeSwapQuote(
      quoteWith(groups),
      user.addr.toString(),
      signer,
      algod
    );

    expect(signer).toHaveBeenCalledTimes(1);
    expect(signer.mock.calls[0][1]).toEqual([1]);
    expect(sendRawTransaction).toHaveBeenCalledWith([presignedBytes, signedBytes]);
    expect(result.txIds).toEqual(["ABC"]);
    expect(result.confirmedRound).toBe(5n);
  });

  it("signs every group before submitting any, so a late rejection leaves nothing on chain", async () => {
    const groups: SwapQuote["groups"] = [
      { transactions: [txn()], presigned: new Map() },
      { transactions: [txn()], presigned: new Map() },
    ];
    let calls = 0;
    const signer = vi.fn(async () => {
      calls++;
      if (calls === 2) throw new Error("User rejected");
      return [new Uint8Array([1])];
    });
    const { algod, sendRawTransaction } = fakeAlgod();
    await expect(
      executeSwapQuote(quoteWith(groups), user.addr.toString(), signer, algod)
    ).rejects.toMatchObject({ stage: "sign", txIds: [] });
    expect(sendRawTransaction).not.toHaveBeenCalled();
  });

  it("submits multiple groups in order and reports every tx id", async () => {
    const groups: SwapQuote["groups"] = [
      { transactions: [txn()], presigned: new Map() },
      { transactions: [txn()], presigned: new Map() },
    ];
    const signer = vi.fn(async () => [new Uint8Array([1])]);
    const { algod, sendRawTransaction } = fakeAlgod(["A", "B"]);
    const result = await executeSwapQuote(
      quoteWith(groups),
      user.addr.toString(),
      signer,
      algod
    );
    expect(sendRawTransaction).toHaveBeenCalledTimes(2);
    expect(result.txIds).toEqual(["A", "B"]);
  });

  it("refuses to sign a group containing a foreign sender", async () => {
    const groups: SwapQuote["groups"] = [
      { transactions: [txn(other.addr)], presigned: new Map() },
    ];
    const signer = vi.fn();
    const { algod, sendRawTransaction } = fakeAlgod();
    await expect(
      executeSwapQuote(quoteWith(groups), user.addr.toString(), signer, algod)
    ).rejects.toMatchObject({ stage: "validate" } satisfies Partial<SwapExecutionError>);
    expect(signer).not.toHaveBeenCalled();
    expect(sendRawTransaction).not.toHaveBeenCalled();
  });

  it("reports a signing failure when the wallet returns null", async () => {
    const groups: SwapQuote["groups"] = [
      { transactions: [txn()], presigned: new Map() },
    ];
    const signer = vi.fn(async () => [null]);
    const { algod } = fakeAlgod();
    await expect(
      executeSwapQuote(quoteWith(groups), user.addr.toString(), signer, algod)
    ).rejects.toMatchObject({ stage: "sign" });
  });
});
