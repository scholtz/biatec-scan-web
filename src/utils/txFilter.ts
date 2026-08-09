import { assetService } from "../services/assetService";

// Loose indexer transaction shape (dash-cased fields, as returned by the
// Algorand indexer REST API and used on AddressDetails/TransactionDetails).
export interface FilterableTransaction {
  id?: string;
  fee?: number;
  "round-time"?: number;
  "tx-type"?: string;
  "confirmed-round"?: number;
  "payment-transaction"?: { amount?: number };
  "asset-transfer-transaction"?: { amount?: number; "asset-id"?: number };
  [key: string]: any;
}

export interface TxFilterState {
  type: string; // "" = all, or "pay" | "axfer" | "acfg" | "afrz" | "appl" | "keyreg"
  assetId: number | null; // only meaningful when type === "axfer"
  minAmount: string; // human-readable units (ALGO for pay, asset units for axfer)
}

export function emptyTxFilter(): TxFilterState {
  return { type: "", assetId: null, minAmount: "" };
}

export function isTxFilterActive(filter: TxFilterState): boolean {
  return filter.type !== "" || filter.assetId !== null || filter.minAmount !== "";
}

// Query param names shared between AddressDetails and TransactionDetails so
// links between the two pages carry the same filter forward.
const QUERY_KEYS = {
  type: "txType",
  assetId: "txAsset",
  minAmount: "txMin",
} as const;

export function txFilterFromQuery(
  query: Record<string, unknown>,
): TxFilterState {
  const type = typeof query[QUERY_KEYS.type] === "string" ? (query[QUERY_KEYS.type] as string) : "";
  const assetIdRaw = query[QUERY_KEYS.assetId];
  const assetId =
    typeof assetIdRaw === "string" && assetIdRaw !== "" && !Number.isNaN(Number(assetIdRaw))
      ? Number(assetIdRaw)
      : null;
  const minAmount = typeof query[QUERY_KEYS.minAmount] === "string" ? (query[QUERY_KEYS.minAmount] as string) : "";
  return { type, assetId, minAmount };
}

// Returns only the filter-related query entries (undefined clears the key
// when merged into vue-router's `query`).
export function txFilterToQuery(
  filter: TxFilterState,
): Record<string, string | undefined> {
  return {
    [QUERY_KEYS.type]: filter.type || undefined,
    [QUERY_KEYS.assetId]: filter.assetId !== null ? String(filter.assetId) : undefined,
    [QUERY_KEYS.minAmount]: filter.minAmount || undefined,
  };
}

interface TxAmountInfo {
  assetId: number; // 0 for ALGO
  rawAmount: number;
}

export function getTxAmountInfo(tx: FilterableTransaction): TxAmountInfo | null {
  const txType = tx["tx-type"];
  if (txType === "pay") {
    return { assetId: 0, rawAmount: tx["payment-transaction"]?.amount ?? 0 };
  }
  if (txType === "axfer") {
    const axfer = tx["asset-transfer-transaction"];
    if (!axfer) return null;
    return { assetId: axfer["asset-id"] ?? 0, rawAmount: axfer.amount ?? 0 };
  }
  return null;
}

function assetDecimals(assetId: number): number {
  if (assetId === 0) return 6;
  return assetService.getAssetInfo(BigInt(assetId))?.decimals ?? 0;
}

export function matchesTxFilter(
  tx: FilterableTransaction,
  filter: TxFilterState,
): boolean {
  if (filter.type && tx["tx-type"] !== filter.type) return false;

  if (filter.type === "axfer" && filter.assetId !== null) {
    if (tx["asset-transfer-transaction"]?.["asset-id"] !== filter.assetId) return false;
  }

  if (filter.minAmount !== "") {
    const min = parseFloat(filter.minAmount);
    if (!Number.isNaN(min)) {
      const amountInfo = getTxAmountInfo(tx);
      if (!amountInfo) return false;
      const human = amountInfo.rawAmount / Math.pow(10, assetDecimals(amountInfo.assetId));
      if (human < min) return false;
    }
  }

  return true;
}
