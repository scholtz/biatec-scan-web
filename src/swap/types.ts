// src/swap/types.ts - The router-agnostic contract every DEX aggregator
// ("swap router") integration must satisfy, plus the shared quote/route
// shapes the UI renders. Nothing in this file depends on Vue or on any
// specific router SDK - see src/swap/README.md for how to add a router.
import type algosdk from "algosdk";

/** Fixed-input swap request. All amounts are base units (bigint). */
export interface SwapRequest {
  /** Address that will sign and send the swap transactions. */
  sender: string;
  fromAssetId: bigint;
  toAssetId: bigint;
  /** Amount of `fromAssetId` to sell, in base units. */
  amount: bigint;
  /**
   * Slippage tolerance in basis points (100 = 1%). 10000 disables the
   * minimum-received protection entirely.
   */
  slippageBps: number;
  /** Genesis id of the network the request targets, e.g. "mainnet-v1.0". */
  genesisId: string;
}

export interface SwapRoutePool {
  /** Human readable label, e.g. protocol or pool name. */
  label: string;
  protocol?: string;
  poolAppId?: bigint;
  poolAddress?: string;
  fromAssetId: bigint;
  toAssetId: bigint;
  amountIn?: bigint;
  amountOut?: bigint;
  /** Share of the hop input routed through this pool, 0-100. */
  percentage?: number;
}

export interface SwapRouteHop {
  fromAssetId: bigint;
  toAssetId: bigint;
  inputAmount?: bigint;
  outputAmount?: bigint;
  pools: SwapRoutePool[];
}

export interface SwapRoutePath {
  /** Share of the total input routed through this path, 0-100. */
  percentage?: number;
  hops: SwapRouteHop[];
}

export type SwapRouteNote = "no-detailed-route" | "no-pool-breakdown";

/** Normalised route description, identical in shape for every router. */
export interface SwapRouteInfo {
  paths: SwapRoutePath[];
  /** Free-form step labels some routers provide (e.g. Haystack group labels). */
  steps?: string[];
  note?: SwapRouteNote;
}

/**
 * One atomic transaction group ready to be signed and submitted.
 * `presigned[i]` holds already-signed bytes for transactions the connected
 * wallet must NOT sign (e.g. logic-signature transactions Haystack returns);
 * every other index is signed by the wallet.
 */
export interface SwapTransactionGroup {
  transactions: algosdk.Transaction[];
  presigned: ReadonlyMap<number, Uint8Array>;
}

export interface SwapQuote {
  routerId: string;
  /** Router-advertised output amount, base units of `toAssetId`. */
  outputAmount: bigint;
  /** Minimum output the prepared transactions enforce (after slippage). */
  minimumReceived: bigint;
  /** Price impact in percent, when the router reports it. */
  priceImpactPercent?: number;
  /** Total network fees the group(s) pay, in microAlgos, when reported. */
  networkFeeMicroAlgos?: bigint;
  route: SwapRouteInfo;
  /** Application ids the sender must opt into before the swap can run. */
  requiredAppOptIns: bigint[];
  /** Prepared, unsigned groups - submitted in order. */
  groups: SwapTransactionGroup[];
  /** Wall-clock time the quote was produced. */
  createdAt: number;
}

/** Services a router may need; injected so routers stay unit-testable. */
export interface SwapRouterContext {
  algod: algosdk.Algodv2;
  /** Returns an ARC-14 `Authorization` header value for the given realm. */
  getAuthHeader: (realm: string) => Promise<string>;
}

/**
 * A DEX aggregator integration. Implementations live in src/swap/routers/
 * and are registered in src/swap/routers/index.ts.
 */
export interface SwapRouter {
  /** Stable id used in i18n keys, tests and persisted preferences. */
  readonly id: string;
  readonly displayName: string;
  readonly homepage?: string;
  /** Whether the router serves the given network (by genesis id). */
  supportsNetwork(genesisId: string): boolean;
  /**
   * Fetch a quote AND the prepared transactions in one step so the amount
   * shown to the user is exactly what the transactions will execute.
   */
  quote(request: SwapRequest, ctx: SwapRouterContext): Promise<SwapQuote>;
}

export interface SwapSimulationResult {
  success: boolean;
  failureMessage?: string;
  /** Ledger-computed net amount of `toAssetId` received, base units. */
  netReceived?: bigint;
  /** Ledger-computed net amount of `fromAssetId` spent, base units. */
  netSent?: bigint;
}

export type RouterQuoteStatus =
  | "unsupported"
  | "idle"
  | "loading"
  | "ok"
  | "error";

/** Per-router outcome of a "quote all" round. */
export interface RouterQuoteResult {
  router: SwapRouter;
  status: RouterQuoteStatus;
  quote?: SwapQuote;
  error?: string;
  simulation?: SwapSimulationResult;
}
