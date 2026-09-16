import algosdk from "algosdk";
import axios from "axios";
import { MainnetFolksRouterAppId, routerABIContract } from "@folks-router/js-sdk";
import { Buffer } from "buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { biatecRouter } from "biatec-router";
import { SwapRouterError } from "../errors";
import {
  buildBiatecGroups,
  buildBiatecRouteInfo,
  combineBiatecRoutes,
} from "./biatec";
import { buildFolksRouteInfo, folksRouter } from "./folks";
import type { SwapRequest, SwapRouterContext } from "../types";
import { buildHaystackGroups, buildHaystackRouteInfo } from "./haystack";
import { isSwapAvailableOn as availabilityRule } from "../availability";
import { isSwapAvailableOn, swapRouters } from "./index";

const params: algosdk.SuggestedParams = {
  fee: 1000n,
  minFee: 1000n,
  flatFee: true,
  firstValid: 1n,
  lastValid: 10n,
  genesisID: "mainnet-v1.0",
  genesisHash: new Uint8Array(32),
};

function encodedPayment(sender: algosdk.Address, group?: Uint8Array): string {
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    amount: 0,
    suggestedParams: params,
  });
  if (group) txn.group = group;
  return Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");
}

describe("router registry", () => {
  it("registers every router with a unique id", () => {
    const ids = swapRouters.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["biatec", "folks", "haystack"]));
  });

  it("offers Haystack on mainnet only and Folks on mainnet (env default)", () => {
    const haystack = swapRouters.find((r) => r.id === "haystack")!;
    const folks = swapRouters.find((r) => r.id === "folks")!;
    expect(haystack.supportsNetwork("mainnet-v1.0")).toBe(true);
    expect(folks.supportsNetwork("mainnet-v1.0")).toBe(true);
    expect(folks.supportsNetwork("testnet-v1.0")).toBe(false);
    expect(folks.supportsNetwork("voimain-v1.0")).toBe(false);
    expect(isSwapAvailableOn("mainnet-v1.0")).toBe(true);
  });

  it("keeps the lightweight availability rule in sync with the registry", () => {
    for (const genesis of ["mainnet-v1.0", "testnet-v1.0", "voimain-v1.0"]) {
      expect(availabilityRule(genesis)).toBe(isSwapAvailableOn(genesis));
    }
  });
});

describe("combineBiatecRoutes", () => {
  it("sums amounts and fees, concatenates hops and keeps legs apart", () => {
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
    expect(combined.legs).toEqual([["a", "b"], ["c"]]);

    const info = buildBiatecRouteInfo(combined.route, 0n, 31566704n);
    expect(info.paths).toHaveLength(2);
    expect(info.paths[0].hops).toHaveLength(1);
    expect(info.paths[1].hops).toHaveLength(2);
    expect(info.paths[0].percentage).toBeCloseTo(60, 6);
    expect(info.paths[1].percentage).toBeCloseTo(40, 6);
  });
});

describe("buildBiatecGroups", () => {
  const acct = algosdk.generateAccount();

  it("merges small legs into one re-grouped atomic group", () => {
    const stale = new Uint8Array(32).fill(7);
    const legs = [
      [encodedPayment(acct.addr, stale), encodedPayment(acct.addr, stale)],
      [encodedPayment(acct.addr)],
    ];
    const groups = buildBiatecGroups(legs);
    expect(groups).toHaveLength(1);
    expect(groups[0].transactions).toHaveLength(3);
    const fresh = legs
      .flat()
      .map((b64) =>
        algosdk.decodeUnsignedTransaction(new Uint8Array(Buffer.from(b64, "base64")))
      );
    for (const tx of fresh) tx.group = undefined;
    const expected = algosdk.computeGroupID(fresh);
    for (const tx of groups[0].transactions) {
      expect(tx.group).toEqual(expected);
      expect(tx.group).not.toEqual(stale);
    }
  });

  it("keeps legs as separate groups when they would exceed 16 transactions", () => {
    const leg = Array.from({ length: 9 }, () => encodedPayment(acct.addr));
    const groups = buildBiatecGroups([leg, leg]);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.transactions.length === 9)).toBe(true);
  });

  it("rejects an empty route", () => {
    expect(() => buildBiatecGroups([[], []])).toThrow(SwapRouterError);
  });
});

describe("Folks quotes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const sender = algosdk.generateAccount().addr.toString();
  const request: SwapRequest = {
    sender,
    fromAssetId: 0n,
    toAssetId: 31566704n,
    amount: 1000000n,
    slippageBps: 100,
    genesisId: "mainnet-v1.0",
  };
  const context: SwapRouterContext = {
    algod: new algosdk.Algodv2("", "https://example.com"),
    getAuthHeader: async () => "",
  };

  it("prepares and validates a quote when the browser has no global Buffer", async () => {
    const transactions = algosdk.assignGroupID([
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver: algosdk.getApplicationAddress(MainnetFolksRouterAppId),
        amount: request.amount,
        suggestedParams: params,
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender,
        appIndex: MainnetFolksRouterAppId,
        appArgs: [
          routerABIContract.getMethodByName("fi_end_swap").getSelector(),
          algosdk.encodeUint64(request.toAssetId),
          algosdk.encodeUint64(990n),
        ],
        suggestedParams: params,
      }),
    ]);
    const encoded = transactions.map((transaction) =>
      Buffer.from(algosdk.encodeUnsignedTransaction(transaction)).toString("base64")
    );
    const http = axios.create();
    const get = vi.spyOn(http, "get")
      .mockResolvedValueOnce({ data: { success: true, result: {
        quoteAmount: "1000",
        priceImpact: 0.01,
        microalgoTxnsFee: 2000,
        txnPayload: "test-payload",
      } } })
      .mockResolvedValueOnce({ data: { success: true, result: encoded } });
    vi.spyOn(axios, "create").mockReturnValue(http);
    vi.stubGlobal("Buffer", undefined);

    const quote = await folksRouter.quote(request, context);

    expect(globalThis.Buffer).toBe(Buffer);
    expect(quote.outputAmount).toBe(1000n);
    expect(quote.minimumReceived).toBe(990n);
    expect(quote.groups[0].transactions).toHaveLength(2);
    expect(quote.groups[0].transactions[0].payment?.amount).toBe(request.amount);
    expect(get).toHaveBeenNthCalledWith(2, "/prepare/swap", {
      params: { userAddress: sender, slippageBps: 100, txnPayload: "test-payload" },
    });
  });

  it("rejects a testnet quote before creating an HTTP client", async () => {
    const create = vi.spyOn(axios, "create");
    await expect(folksRouter.quote({ ...request, genesisId: "testnet-v1.0" }, context))
      .rejects.toThrow("Folks Router network not configured");
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ["mainnet-v1.0", "", "mainnet"],
    ["mainnet-v1.0", "none", ""],
    ["testnet-v1.0", "", ""],
    ["testnet-v1.0", "testnet", ""],
    ["testnet-v1.0", "mainnet", ""],
    ["voimain-v1.0", "mainnet", ""],
  ])("resolves Folks config on %s with override '%s' to '%s'", async (genesis, override, expected) => {
    vi.resetModules();
    vi.stubEnv("VITE_GENESIS_ID", genesis);
    vi.stubEnv("VITE_FOLKS_ROUTER_NETWORK", override);
    const config = await import("../../config/env");
    expect(config.folksRouterNetwork).toBe(expected);
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
        { group: "g1", logicSigBlob: false, data: encodedPayment(acct.addr) },
        {
          group: "g2",
          logicSigBlob: Object.fromEntries(
            [...signedLsig].map((byte, index) => [index, byte])
          ),
          data: "",
        },
        { group: "g2", logicSigBlob: false, data: encodedPayment(acct.addr) },
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
