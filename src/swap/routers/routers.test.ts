import algosdk from "algosdk";
import { Buffer } from "buffer";
import { describe, expect, it } from "vitest";
import type { biatecRouter } from "biatec-router";
import { buildBiatecRouteInfo, combineBiatecRoutes } from "./biatec";
import { buildFolksRouteInfo } from "./folks";
import { buildHaystackGroups, buildHaystackRouteInfo } from "./haystack";
import { swapRouters } from "./index";

describe("router registry", () => {
  it("registers every router with a unique id", () => {
    const ids = swapRouters.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["biatec", "folks", "haystack"]));
  });

  it("only offers Haystack and Folks on Algorand mainnet", () => {
    for (const id of ["folks", "haystack"]) {
      const router = swapRouters.find((r) => r.id === id)!;
      expect(router.supportsNetwork("mainnet-v1.0")).toBe(true);
      expect(router.supportsNetwork("testnet-v1.0")).toBe(false);
      expect(router.supportsNetwork("voimain-v1.0")).toBe(false);
    }
  });
});

describe("combineBiatecRoutes", () => {
  it("sums amounts and fees and concatenates hops/txns across legs", () => {
    const response: biatecRouter.RouteOutputCover = {
      routes: [
        {
          route: {
            fromAsset: 0,
            toAsset: 31566704,
            inputAmount: 600,
            outputAmount: 90,
            totalNetworkFeeMicroAlgos: 2000,
            hops: [{ fromAsset: 0, toAsset: 31566704, inputAmount: 600, outputAmount: 90 }],
          },
          txsToSign: ["a", "b"],
        },
        {
          route: {
            fromAsset: 0,
            toAsset: 31566704,
            inputAmount: 400,
            outputAmount: 61,
            totalNetworkFeeMicroAlgos: 3000,
            hops: [
              { fromAsset: 0, toAsset: 7, inputAmount: 400, outputAmount: 5 },
              { fromAsset: 7, toAsset: 31566704, inputAmount: 5, outputAmount: 61 },
            ],
          },
          txsToSign: ["c"],
        },
      ],
    };
    const combined = combineBiatecRoutes(response);
    expect(combined.route.inputAmount).toBe(1000);
    expect(combined.route.outputAmount).toBe(151);
    expect(combined.route.totalNetworkFeeMicroAlgos).toBe(5000);
    expect(combined.route.hops).toHaveLength(3);
    expect(combined.txsToSign).toEqual(["a", "b", "c"]);

    const info = buildBiatecRouteInfo(combined.route, 0n, 31566704n);
    expect(info.paths).toHaveLength(2);
    expect(info.paths[0].hops).toHaveLength(1);
    expect(info.paths[1].hops).toHaveLength(2);
    expect(info.paths[0].percentage).toBeCloseTo(60, 6);
    expect(info.paths[1].percentage).toBeCloseTo(40, 6);
  });
});

describe("buildFolksRouteInfo", () => {
  it("produces a single synthetic hop flagged as having no pool breakdown", () => {
    const info = buildFolksRouteInfo(0n, 5n, 100n, 90n);
    expect(info.note).toBe("no-pool-breakdown");
    expect(info.paths[0].hops[0]).toMatchObject({
      fromAssetId: 0n,
      toAssetId: 5n,
      inputAmount: 100n,
      outputAmount: 90n,
    });
  });
});

describe("Haystack helpers", () => {
  it("normalises the route and picks up group labels as steps", () => {
    const info = buildHaystackRouteInfo(
      {
        route: [
          {
            percentage: 100,
            path: [
              { name: "Tinyman", in: { id: 0 }, out: { id: 7 } },
              { name: "Pact", in: { id: 7 }, out: { id: 31566704 } },
            ],
          },
        ],
      },
      { groupMetadata: [{ labelText: "Swap" }, {}] },
      0n,
      31566704n
    );
    expect(info.steps).toEqual(["Swap"]);
    expect(info.paths[0].hops.map((h) => h.pools[0].label)).toEqual([
      "Tinyman",
      "Pact",
    ]);
    expect(info.paths[0].hops[1].toAssetId).toBe(31566704n);
  });

  it("flags an empty route", () => {
    expect(buildHaystackRouteInfo({}, undefined, 0n, 1n).note).toBe(
      "no-detailed-route"
    );
  });

  it("groups transactions by group id and keeps presigned bytes aside", () => {
    const acct = algosdk.generateAccount();
    const lsig = new algosdk.LogicSigAccount(new Uint8Array([1, 32, 1, 1, 34]));
    const params: algosdk.SuggestedParams = {
      fee: 1000n,
      minFee: 1000n,
      flatFee: true,
      firstValid: 1n,
      lastValid: 10n,
      genesisID: "mainnet-v1.0",
      genesisHash: new Uint8Array(32),
    };
    const userTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: acct.addr,
      receiver: acct.addr,
      amount: 0,
      suggestedParams: params,
    });
    const lsigTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: lsig.address(),
      receiver: acct.addr,
      amount: 0,
      suggestedParams: params,
    });
    const signedLsig = algosdk.signLogicSigTransactionObject(lsigTxn, lsig).blob;

    const groups = buildHaystackGroups({
      groupMetadata: [],
      txns: [
        {
          group: "g1",
          logicSigBlob: false,
          data: Buffer.from(algosdk.encodeUnsignedTransaction(userTxn)).toString("base64"),
        },
        {
          group: "g2",
          logicSigBlob: Object.fromEntries(
            [...signedLsig].map((byte, index) => [index, byte])
          ),
          data: "",
        },
        {
          group: "g2",
          logicSigBlob: false,
          data: Buffer.from(algosdk.encodeUnsignedTransaction(userTxn)).toString("base64"),
        },
      ],
    });

    expect(groups).toHaveLength(2);
    expect(groups[0].transactions).toHaveLength(1);
    expect(groups[0].presigned.size).toBe(0);
    expect(groups[1].transactions).toHaveLength(2);
    expect(groups[1].presigned.get(0)).toEqual(signedLsig);
    expect(groups[1].presigned.has(1)).toBe(false);
    expect(groups[1].transactions[0].sender.toString()).toBe(lsig.address().toString());
  });
});
