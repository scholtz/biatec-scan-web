// src/swap/routers/folks.ts - Folks Router aggregator via the official
// @folks-router/js-sdk. Mirrors Biatec Wallet (scripts/aggregators/folks.ts):
// fixed-input quote, 15-transaction max group, 0.1% integrator fee attributed
// to the referrer address, slippage in basis points. The Folks network to
// use comes from src/config/env.ts (empty = not offered on this network).
import { FolksRouterClient, Network, SwapMode } from "@folks-router/js-sdk";
import { Buffer } from "buffer";
import { folksRouterNetwork, swapReferrerAddress } from "../../config/env";
import { applySlippage } from "../amounts";
import type {
  SwapQuote,
  SwapRequest,
  SwapRouteInfo,
  SwapRouter,
  SwapRouterContext,
} from "../types";
import {
  assertPositiveOutput,
  decodeUnsignedTransactions,
  fractionToPercent,
  throwIfAborted,
  toBigInt,
} from "./shared";

const MAX_GROUP_SIZE = 15;
const INTEGRATOR_FEE_BPS = 10;
const USER_FEE_DISCOUNT = 0;

/**
 * Folks reports only the aggregate outcome, not the pool breakdown, so the
 * route is a single synthetic hop flagged with `no-pool-breakdown`.
 */
export function buildFolksRouteInfo(
  fromAssetId: bigint,
  toAssetId: bigint,
  inputAmount: bigint,
  outputAmount: bigint,
): SwapRouteInfo {
  return {
    paths: [
      {
        percentage: 100,
        hops: [
          {
            fromAssetId,
            toAssetId,
            inputAmount,
            outputAmount,
            pools: [
              {
                label: "Folks Router (aggregated)",
                protocol: "Folks Router",
                fromAssetId,
                toAssetId,
                amountIn: inputAmount,
                amountOut: outputAmount,
              },
            ],
          },
        ],
      },
    ],
    note: "no-pool-breakdown",
  };
}

export const folksRouter: SwapRouter = {
  id: "folks",
  displayName: "Folks Router",
  homepage: "https://folksrouter.io/",

  supportsNetwork(genesis: string): boolean {
    return genesis === "mainnet-v1.0" && folksRouterNetwork === "mainnet";
  },

  async quote(
    request: SwapRequest,
    ctx: SwapRouterContext,
  ): Promise<SwapQuote> {
    if (!folksRouter.supportsNetwork(request.genesisId))
      throw new Error("Folks Router network not configured");
    if (typeof globalThis.Buffer === "undefined") {
      Object.assign(globalThis, { Buffer });
    }
    const client = new FolksRouterClient(Network.MAINNET);
    const params = {
      amount: request.amount,
      fromAssetId: Number(request.fromAssetId),
      toAssetId: Number(request.toAssetId),
      swapMode: SwapMode.FIXED_INPUT,
    };
    const quote = await client.fetchSwapQuote(
      params,
      MAX_GROUP_SIZE,
      INTEGRATOR_FEE_BPS,
      USER_FEE_DISCOUNT,
      swapReferrerAddress,
    );
    const outputAmount = BigInt(quote.quoteAmount);
    assertPositiveOutput(outputAmount);
    // slippageBps is out of 10000 (ONE_4_DP in the SDK); 10000 collapses the
    // computed minimum-received to 0 - the SDK's only "no protection" mode.
    const slippageBps = Math.max(0, Math.min(10000, request.slippageBps));
    throwIfAborted(ctx.signal);
    const encoded = await client.prepareSwapTransactions(
      params,
      request.sender,
      slippageBps,
      quote,
    );
    return {
      outputAmount,
      minimumReceived: applySlippage(outputAmount, slippageBps),
      priceImpactPercent: fractionToPercent(quote.priceImpact),
      networkFeeMicroAlgos: toBigInt(quote.microalgoTxnsFee),
      route: buildFolksRouteInfo(
        request.fromAssetId,
        request.toAssetId,
        request.amount,
        outputAmount,
      ),
      requiredAppOptIns: [],
      groups: [
        {
          transactions: decodeUnsignedTransactions(encoded),
          presigned: new Map(),
        },
      ],
    };
  },
};
