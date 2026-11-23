/**
 * How the address page should treat an indexer `/v2/accounts/{addr}` response.
 *
 * - `found`: normal account payload.
 * - `empty`: the indexer answered "no accounts found for address" (404). The
 *   address was closed / deleted or never funded, but its transaction history
 *   may still exist, so the page must still render in full.
 * - `error`: invalid address (400), server failure, or a 404 that is NOT the
 *   indexer's no-account answer (e.g. a wrong custom indexer base URL or a
 *   gateway "Not Found") — those must stay visible errors.
 */
export type AccountLookupOutcome = "found" | "empty" | "error";

// Indexer wording varies ("no accounts found for address", "account not found");
// a bare gateway "Not Found" has no "account" in it and stays an error.
const NO_ACCOUNT_MESSAGE = /accounts?.*found|found.*accounts?/i;

/**
 * @param httpStatus response status code
 * @param errorMessage `message` field of the JSON error body, if any
 */
export function classifyAccountLookup(
  httpStatus: number,
  errorMessage?: string,
): AccountLookupOutcome {
  if (httpStatus >= 200 && httpStatus < 300) return "found";
  if (httpStatus === 404 && NO_ACCOUNT_MESSAGE.test(errorMessage ?? "")) {
    return "empty";
  }
  return "error";
}
