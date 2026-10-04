import { indexerUrl } from "../config/env";
import type { FilterableTransaction } from "../utils/txFilter";

/** Subset of the indexer's `/v2/transactions` response that the app reads. */
export interface IndexerTxResponse {
  "current-round"?: number;
  "next-token"?: string;
  transactions?: FilterableTransaction[];
}

export async function getIndexerJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Indexer responded ${response.status}`);
  return response.json();
}

/** Query URL for `/v2/transactions` filtered to one application. */
export function applicationTxUrl(appId: string, extra: Record<string, string>): string {
  const params = new URLSearchParams({ "application-id": appId, ...extra });
  return `${indexerUrl}/v2/transactions?${params}`;
}

/**
 * Latest round the indexer has processed, from its cheap `/health` endpoint
 * (a transactions query would scan the application's history just to read it).
 */
export async function getIndexerRound(): Promise<number> {
  const health = await getIndexerJson<{ round?: number }>(`${indexerUrl}/health`);
  if (typeof health.round !== "number") throw new Error("Indexer returned no current round");
  return health.round;
}
