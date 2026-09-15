// src/swap/routers/biatec.ts - Biatec Router aggregator via the generated
// `biatec-router` OpenAPI client. Authenticated with ARC-14; the router
// accepts the "BiatecScan#ARC14" realm this app already signs for the
// Biatec Scan API, so quoting needs no wallet interaction.
//
// Two-phase request, as in Biatec Wallet (scripts/aggregators/biatec.ts):
// a preview with receiveMinimum 0 establishes the expected output, then the
// real request bakes the slippage-derived minimum into the transactions and
// is cross-checked against that minimum before anything is offered for
// signing (AW-2026-045).
import algosdk from "algosdk";
// biatecRouter is a namespace object (value + type namespace): the generated
// client's response types are only reachable as its members.
import { biatecRouter } from "biatec-router";
import { biatecRouterUrl } from "../../config/env";
import { applySlippage } from "../amounts";
import { SwapRouterError } from "../errors";
import type {
  SwapQuote,
  SwapRequest,
  SwapRouteHop,
  SwapRouteInfo,
  SwapRoutePath,
  SwapRouter,
  SwapRouterContext,
  SwapTransactionGroup,
} from "../types";
import {
  assertPositiveOutput,
  decodeUnsignedTransactions,
  throwIfAborted,
  toBigInt,
  toSafeNumber,
} from "./shared";

export const BIATEC_ROUTER_AUTH_REALM = "BiatecScan#ARC14";
const MAX_HOPS = 3;
// routesCount 1 intentionally enables the router's split routing: the
// response may still carry several legs that are combined below.
const ROUTES_COUNT = 1;
/** Algorand's atomic group limit. */
const MAX_GROUP_SIZE = 16;

export interface BiatecCombinedRoute {
  route: biatecRouter.QuoteRoute;
  /** One entry per leg, each already a self-contained transaction list. */
  legs: string[][];
}

/**
 * Merge every leg of a split route into one aggregate route (summed
 * amounts/fees, concatenated hops) while keeping the legs' transaction
 * lists separate so they can be grouped safely.
 */
export function combineBiatecRoutes(
  response: biatecRouter.RouteOutputCover
): BiatecCombinedRoute {
  const routes = response.routes ?? [];
  const route: biatecRouter.QuoteRoute = {
    ...routes[0]?.route,
    hops: routes.flatMap((r) => r.route?.hops ?? []),
    inputAmount: routes.reduce((sum, r) => sum + (r.route?.inputAmount ?? 0), 0),
    outputAmount: routes.reduce(
      (sum, r) => sum + (r.route?.outputAmount ?? 0),
      0
    ),
    totalNetworkFeeMicroAlgos: routes.reduce(
      (sum, r) => sum + (r.route?.totalNetworkFeeMicroAlgos ?? 0),
      0
    ),
  };
  return {
    route,
    legs: routes.map((r) => r.txsToSign ?? []).filter((leg) => leg.length > 0),
  };
}

/**
 * Legs are slices of one router-built group when they fit the 16-transaction
 * limit together (re-grouped as a single atomic group); otherwise each leg
 * keeps its own group and they are submitted in order.
 */
export function buildBiatecGroups(legs: string[][]): SwapTransactionGroup[] {
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  if (total === 0) throw new SwapRouterError("noTransactions");
  const regroup = (encoded: string[]): SwapTransactionGroup => {
    const transactions = decodeUnsignedTransactions(encoded);
    for (const tx of transactions) tx.group = undefined;
    const groupId = algosdk.computeGroupID(transactions);
    for (const tx of transactions) tx.group = groupId;
    return { transactions, presigned: new Map() };
  };
  if (total <= MAX_GROUP_SIZE) return [regroup(legs.flat())];
  return legs.map(regroup);
}

// The combined `hops` array is flat but can encode several independent legs
// sharing the same start/end asset. A leg boundary is inferred wherever a
// hop's fromAsset doesn't continue the previous hop's toAsset.
function splitHopsIntoPaths(hops: SwapRouteHop[]): SwapRoutePath[] {
  const legs: SwapRouteHop[][] = [];
  let current: SwapRouteHop[] = [];
  let expectedFrom: bigint | undefined;
  for (const hop of hops) {
    if (current.length > 0 && hop.fromAssetId !== expectedFrom) {
      legs.push(current);
      current = [];
    }
    current.push(hop);
    expectedFrom = hop.toAssetId;
  }
  if (current.length > 0) legs.push(current);

  const totalInput = legs.reduce(
    (sum, leg) => sum + (leg[0]?.inputAmount ?? 0n),
    0n
  );
  return legs.map((legHops) => ({
    percentage:
      legs.length > 1 && totalInput > 0n
        ? Number(((legHops[0]?.inputAmount ?? 0n) * 10000n) / totalInput) / 100
        : undefined,
    hops: legHops,
  }));
}

export function buildBiatecRouteInfo(
  route: biatecRouter.QuoteRoute,
  fromAssetId: bigint,
  toAssetId: bigint
): SwapRouteInfo {
  const hops: SwapRouteHop[] = (route.hops ?? []).map((hop) => {
    const hopFrom = toBigInt(hop.fromAsset) ?? fromAssetId;
    const hopTo = toBigInt(hop.toAsset) ?? toAssetId;
    const hopInput = hop.inputAmount;
    return {
      fromAssetId: hopFrom,
      toAssetId: hopTo,
      inputAmount: toBigInt(hop.inputAmount),
      outputAmount: toBigInt(hop.outputAmount),
      pools: (hop.pools ?? []).map((pool) => ({
        label: pool.protocol ?? "Pool",
        protocol: pool.protocol,
        poolAppId: toBigInt(pool.poolAppId),
        poolAddress: pool.poolAppAddress ?? undefined,
        fromAssetId: hopFrom,
        toAssetId: hopTo,
        amountIn: toBigInt(pool.amountIn),
        amountOut: toBigInt(pool.amountOut),
        percentage:
          hopInput && pool.amountIn ? (pool.amountIn / hopInput) * 100 : undefined,
      })),
    };
  });
  return { paths: splitHopsIntoPaths(hops) };
}

async function requestRoute(
  request: SwapRequest,
  receiveMinimum: bigint
): Promise<BiatecCombinedRoute> {
  const response = await biatecRouter.RouterService.postApiV1RouterRouteTxs({
    sender: request.sender,
    fromAsset: toSafeNumber(request.fromAssetId),
    toAsset: toSafeNumber(request.toAssetId),
    swapAmount: toSafeNumber(request.amount),
    receiveMinimum: toSafeNumber(receiveMinimum),
    routesCount: ROUTES_COUNT,
    maxHops: MAX_HOPS,
  });
  if (!response.routes || response.routes.length === 0) {
    throw new SwapRouterError("noRoute");
  }
  return combineBiatecRoutes(response);
}

export const biatecSwapRouter: SwapRouter = {
  id: "biatec",
  displayName: "Biatec Router",
  homepage: "https://router.biatec.io",

  supportsNetwork(genesisId: string): boolean {
    return (
      biatecRouterUrl !== "" &&
      (genesisId === "mainnet-v1.0" || genesisId === "testnet-v1.0")
    );
  },

  async quote(request: SwapRequest, ctx: SwapRouterContext): Promise<SwapQuote> {
    const authHeader = await ctx.getAuthHeader(BIATEC_ROUTER_AUTH_REALM);
    biatecRouter.OpenAPI.BASE = biatecRouterUrl;
    biatecRouter.OpenAPI.HEADERS = { Authorization: authHeader };

    const preview = await requestRoute(request, 0n);
    const previewOutput = toBigInt(preview.route.outputAmount) ?? 0n;
    assertPositiveOutput(previewOutput);
    const minimumReceived = applySlippage(previewOutput, request.slippageBps);

    throwIfAborted(ctx.signal);
    const final = await requestRoute(request, minimumReceived);
    const outputAmount = toBigInt(final.route.outputAmount) ?? 0n;
    assertPositiveOutput(outputAmount);
    if (outputAmount < minimumReceived) {
      throw new SwapRouterError(
        "belowMinimum",
        `${outputAmount} < ${minimumReceived}`
      );
    }

    return {
      outputAmount,
      minimumReceived,
      networkFeeMicroAlgos: toBigInt(final.route.totalNetworkFeeMicroAlgos),
      route: buildBiatecRouteInfo(
        final.route,
        request.fromAssetId,
        request.toAssetId
      ),
      requiredAppOptIns: [],
      groups: buildBiatecGroups(final.legs),
    };
  },
};
