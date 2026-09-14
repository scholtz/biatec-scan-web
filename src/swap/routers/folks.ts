// src/swap/routers/folks.ts - Folks Router aggregator via the official
// @folks-router/js-sdk. Mirrors Biatec Wallet (scripts/aggregators/folks.ts):
// fixed-input quote, 15-transaction max group, 0.1% integrator fee attributed
// to the referrer address, slippage in basis points. Mainnet-only.
import algosdk from "algosdk";
import { Buffer } from "buffer";
import { FolksRouterClient, Network, SwapMode } from "@folks-router/js-sdk";
import { swapReferrerAddress } from "../../config/env";
import { applySlippage } from "../amounts";
import type {
  SwapQuote,
  SwapRequest,
  SwapRouteInfo,
  SwapRouter,
} from "../types";

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
  outputAmount: bigint
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
  homepage: "https://folks.finance",

  supportsNetwork(genesisId: string): boolean {
    return genesisId === "mainnet-v1.0";
  },

  async quote(request: SwapRequest): Promise<SwapQuote> {
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
      swapReferrerAddress
    );
    // slippageBps is out of 10000 (ONE_4_DP in the SDK); 10000 collapses the
    // computed minimum-received to 0 - the SDK's only "no protection" mode.
    const slippageBps = Math.max(0, Math.min(10000, request.slippageBps));
    const encoded = await client.prepareSwapTransactions(
      params,
      request.sender,
      slippageBps,
      quote
    );
    if (!Array.isArray(encoded) || encoded.length === 0) {
      throw new Error("Folks Router returned no transactions for this route.");
    }
    const transactions = encoded.map((b64) =>
      algosdk.decodeUnsignedTransaction(new Uint8Array(Buffer.from(b64, "base64")))
    );
    const outputAmount = BigInt(quote.quoteAmount);
    return {
      routerId: folksRouter.id,
      outputAmount,
      minimumReceived: applySlippage(outputAmount, slippageBps),
      priceImpactPercent:
        typeof quote.priceImpact === "number" ? quote.priceImpact * 100 : undefined,
      networkFeeMicroAlgos:
        typeof quote.microalgoTxnsFee === "number"
          ? BigInt(Math.round(quote.microalgoTxnsFee))
          : undefined,
      route: buildFolksRouteInfo(
        request.fromAssetId,
        request.toAssetId,
        request.amount,
        outputAmount
      ),
      requiredAppOptIns: [],
      groups: [{ transactions, presigned: new Map() }],
      createdAt: Date.now(),
    };
  },
};
