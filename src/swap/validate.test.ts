import algosdk from "algosdk";
import { describe, expect, it } from "vitest";
import {
  assertSwapGroupSafe,
  assertSwapTransactionSafe,
  UnsafeSwapTransactionError,
} from "./validate";

const user = algosdk.generateAccount();
const other = algosdk.generateAccount();

const params: algosdk.SuggestedParams = {
  fee: 1000n,
  minFee: 1000n,
  flatFee: true,
  firstValid: 1n,
  lastValid: 1000n,
  genesisID: "testnet-v1.0",
  genesisHash: new Uint8Array(32),
};

function payment(overrides: Partial<{
  sender: string;
  rekeyTo: string;
  closeRemainderTo: string;
}> = {}) {
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: overrides.sender ?? user.addr,
    receiver: other.addr,
    amount: 1,
    suggestedParams: params,
    rekeyTo: overrides.rekeyTo,
    closeRemainderTo: overrides.closeRemainderTo,
  });
}

function assetTransfer(closeRemainderTo?: string) {
  return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: user.addr,
    receiver: other.addr,
    amount: 1,
    assetIndex: 123,
    suggestedParams: params,
    closeRemainderTo,
  });
}

describe("assertSwapTransactionSafe", () => {
  const me = user.addr.toString();

  it("accepts an ordinary transaction from the connected account", () => {
    expect(() => assertSwapTransactionSafe(payment(), me)).not.toThrow();
    expect(() => assertSwapTransactionSafe(assetTransfer(), me)).not.toThrow();
  });

  it("rejects a foreign sender", () => {
    expect(() =>
      assertSwapTransactionSafe(payment({ sender: other.addr.toString() }), me)
    ).toThrow(UnsafeSwapTransactionError);
  });

  it("rejects rekeys", () => {
    expect(() =>
      assertSwapTransactionSafe(payment({ rekeyTo: other.addr.toString() }), me)
    ).toThrow(/rekey/);
  });

  it("rejects native close-outs", () => {
    expect(() =>
      assertSwapTransactionSafe(
        payment({ closeRemainderTo: other.addr.toString() }),
        me
      )
    ).toThrow(/close/);
  });

  it("rejects asset close-outs", () => {
    expect(() =>
      assertSwapTransactionSafe(assetTransfer(other.addr.toString()), me)
    ).toThrow(/close an asset/);
  });
});

describe("assertSwapGroupSafe", () => {
  const me = user.addr.toString();

  it("skips presigned (logic-signature) entries but checks the rest", () => {
    const foreign = payment({ sender: other.addr.toString() });
    const presigned = new Map<number, Uint8Array>([[0, new Uint8Array([1])]]);
    expect(() =>
      assertSwapGroupSafe([foreign, payment()], presigned, me)
    ).not.toThrow();
    expect(() =>
      assertSwapGroupSafe([foreign, payment()], new Map(), me)
    ).toThrow(UnsafeSwapTransactionError);
  });
});
