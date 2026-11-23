/**
 * How the address page should treat an indexer `/v2/accounts/{addr}` response.
 *
 * - `found`: normal account payload.
 * - `empty`: the indexer has no live account (404). The address was closed /
 *   deleted or never funded, but its transaction history may still exist, so
 *   the page must still render in full.
 * - `error`: invalid address (400), server failure or anything else.
 */
export type AccountLookupOutcome = "found" | "empty" | "error";

export function classifyAccountLookup(
  httpStatus: number,
  ok: boolean,
): AccountLookupOutcome {
  if (ok) return "found";
  if (httpStatus === 404) return "empty";
  return "error";
}
