// src/swap/routers/haystack.ts - Haystack (Deflex) aggregator. Plain JSON
// HTTP API at deflex.txnlab.dev with no published TypeScript SDK; the
// response interfaces below are hand-derived from the fields this code
// reads, exactly as Biatec Wallet does (scripts/aggregators/deflex.ts).
// Mainnet-only: there is no testnet Haystack deployment.
import algosdk from "algosdk";
import { Buffer } from "buffer";
import { haystackApiKey, swapReferrerAddress } from "../../config/env";
import { applySlippage } from "../amounts";
import type {
  SwapQuote,
  SwapRequest,
  SwapRouteInfo,
  SwapRoutePath,
  SwapRouter,
  SwapTransactionGroup,
} from "../types";

const HAYSTACK_API = "https://deflex.txnlab.dev/api";
// Haystack builds the transactions server-side against this algod; it is a
// request parameter of their API, not something this app connects to.
const HAYSTACK_ALGOD_URI = "https://mainnet-api.algonode.cloud";

export interface HaystackRouteStep {
  name?: string;
  in?: { id?: number };
  out?: { id?: number };
}

export interface HaystackRoute {
  percentage?: number;
  path?: HaystackRouteStep[];
}

export interface HaystackQuoteResponse {
  txnPayload: string;
  quote?: number;
  route?: HaystackRoute[];
  userPriceImpact?: number;
  requiredAppOptIns?: number[];
}

export interface HaystackTxnEntry {
  group: string;
  // `false` for a plain unsigned transaction the connected wallet signs
  // (decoded from `data`); otherwise a byte-indexed object whose
  // Object.values() reassembles the raw, already-signed logicsig bytes.
  logicSigBlob: false | Record<number, number>;
  data: string;
}

export interface HaystackTxnsResponse {
  groupMetadata: { labelText?: string }[];
  txns: HaystackTxnEntry[];
}

/** Normalise Haystack's route description into the shared shape. */
export function buildHaystackRouteInfo(
  quote: Pick<HaystackQuoteResponse, "route">,
  txns: Pick<HaystackTxnsResponse, "groupMetadata"> | undefined,
  fromAssetId: bigint,
  toAssetId: bigint
): SwapRouteInfo {
  const steps = (txns?.groupMetadata ?? [])
    .map((g) => g?.labelText)
    .filter((label): label is string => Boolean(label));
  const paths: SwapRoutePath[] = (quote.route ?? []).map((r) => ({
    percentage: typeof r?.percentage === "number" ? r.percentage : undefined,
    hops: (r?.path ?? []).map((step) => {
      const hopFrom =
        typeof step?.in?.id === "number" ? BigInt(step.in.id) : fromAssetId;
      const hopTo =
        typeof step?.out?.id === "number" ? BigInt(step.out.id) : toAssetId;
      return {
        fromAssetId: hopFrom,
        toAssetId: hopTo,
        pools: [
          {
            label: step?.name || "Unknown protocol",
            protocol: step?.name,
            fromAssetId: hopFrom,
            toAssetId: hopTo,
          },
        ],
      };
    }),
  }));
  return {
    paths,
    steps,
    note: paths.length === 0 ? "no-detailed-route" : undefined,
  };
}

/** Group Haystack's flat transaction list into ordered atomic groups. */
export function buildHaystackGroups(
  txns: HaystackTxnsResponse
): SwapTransactionGroup[] {
  const byGroup = new Map<string, HaystackTxnEntry[]>();
  for (const entry of txns.txns) {
    const list = byGroup.get(entry.group) ?? [];
    list.push(entry);
    byGroup.set(entry.group, list);
  }
  return [...byGroup.values()].map((entries) => {
    const presigned = new Map<number, Uint8Array>();
    const transactions = entries.map((entry, index) => {
      if (entry.logicSigBlob !== false) {
        const bytes = Uint8Array.from(Object.values(entry.logicSigBlob));
        presigned.set(index, bytes);
        return algosdk.decodeSignedTransaction(bytes).txn;
      }
      return algosdk.decodeUnsignedTransaction(
        new Uint8Array(Buffer.from(entry.data, "base64"))
      );
    });
    return { transactions, presigned };
  });
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.text()).slice(0, 300);
    } catch {
      // body unreadable - status alone is enough
    }
    throw new Error(
      `Haystack API ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }
  return (await response.json()) as T;
}

export const haystackRouter: SwapRouter = {
  id: "haystack",
  displayName: "Haystack",
  homepage: "https://haystack.fi",

  supportsNetwork(genesisId: string): boolean {
    return genesisId === "mainnet-v1.0";
  },

  async quote(request: SwapRequest): Promise<SwapQuote> {
    const quoteUrl = new URL(`${HAYSTACK_API}/fetchQuote`);
    quoteUrl.searchParams.set("chain", "mainnet");
    quoteUrl.searchParams.set("algodUri", HAYSTACK_ALGOD_URI);
    quoteUrl.searchParams.set("algodToken", "");
    quoteUrl.searchParams.set("algodPort", "443");
    quoteUrl.searchParams.set("fromASAID", request.fromAssetId.toString());
    quoteUrl.searchParams.set("toASAID", request.toAssetId.toString());
    quoteUrl.searchParams.set("atomicOnly", "true");
    quoteUrl.searchParams.set("amount", request.amount.toString());
    quoteUrl.searchParams.set("type", "fixed-input");
    quoteUrl.searchParams.set("disabledProtocols", "");
    quoteUrl.searchParams.set("referrerAddress", swapReferrerAddress);
    quoteUrl.searchParams.set("apiKey", haystackApiKey);

    const quote = await fetchJson<HaystackQuoteResponse>(quoteUrl.toString());
    if (!quote?.txnPayload) {
      throw new Error("No Haystack route available for this pair.");
    }

    // Haystack's slippage is a percentage; 100 (%) collapses the
    // minimum-received check to zero, i.e. "no protection".
    const slippagePercent =
      request.slippageBps >= 10000 ? 100 : request.slippageBps / 100;
    const txns = await fetchJson<HaystackTxnsResponse>(
      `${HAYSTACK_API}/fetchExecuteSwapTxns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: request.sender,
          slippage: slippagePercent,
          txnPayloadJSON: quote.txnPayload,
          apiKey: haystackApiKey,
        }),
      }
    );
    if (!Array.isArray(txns?.txns) || txns.txns.length === 0) {
      throw new Error("Haystack returned no transactions for this route.");
    }

    const outputAmount = BigInt(Math.round(quote.quote ?? 0));
    return {
      routerId: haystackRouter.id,
      outputAmount,
      minimumReceived: applySlippage(outputAmount, request.slippageBps),
      priceImpactPercent:
        typeof quote.userPriceImpact === "number"
          ? quote.userPriceImpact * 100
          : undefined,
      route: buildHaystackRouteInfo(
        quote,
        txns,
        request.fromAssetId,
        request.toAssetId
      ),
      requiredAppOptIns: (quote.requiredAppOptIns ?? []).map((id) => BigInt(id)),
      groups: buildHaystackGroups(txns),
      createdAt: Date.now(),
    };
  },
};
