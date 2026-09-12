import algosdk from "algosdk";

/**
 * Coarse shape of a search-box input, used to decide which on-chain probes
 * are worth running (see `services/chainSearchService.ts`).
 *
 * - `numeric`: a decimal integer that fits in a uint64 - may be an asset id,
 *   an application id and/or a round number, so all three are probed.
 * - `transaction`: 52-char base32 (32-byte hash, unpadded) - a tx id.
 * - `address`: 58-char base32 with a valid checksum - an account address.
 * - `text`: anything else (free-text search handled by the backend only).
 */
export type SearchQueryKind = "numeric" | "transaction" | "address" | "text";

const UINT64_MAX = BigInt("18446744073709551615");

/** True for a non-negative decimal integer that fits in a uint64. */
export function isNumericId(query: string): boolean {
  const q = query.trim();
  return /^\d{1,20}$/.test(q) && BigInt(q) <= UINT64_MAX;
}

/** True for a string shaped like an Algorand transaction id (52 base32 chars). */
export function isTransactionIdLike(query: string): boolean {
  return /^[A-Z2-7]{52}$/.test(query.trim());
}

/** True for a syntactically valid Algorand account address (58 chars, checksum ok). */
export function isAddressLike(query: string): boolean {
  const q = query.trim();
  return q.length === 58 && algosdk.isValidAddress(q);
}

export function classifySearchQuery(query: string): SearchQueryKind {
  if (isNumericId(query)) return "numeric";
  if (isAddressLike(query)) return "address";
  if (isTransactionIdLike(query)) return "transaction";
  return "text";
}
