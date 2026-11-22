// User-chosen algod / indexer endpoints, persisted in localStorage and applied
// on the next page load (src/config/env.ts reads them at module init, so every
// consumer - algosdk clients, indexer fetches, wallet config - picks them up
// without per-site changes). Deliberately free of imports from env.ts to avoid
// a cycle; pure helpers are unit-tested in nodeOverrides.test.ts.

export const NODE_OVERRIDES_STORAGE_KEY = "biatec-scan-nodes";

export interface NodeOverrides {
  algodUrl?: string;
  indexerUrl?: string;
}

export type NodeUrlError = "invalid" | "protocol";

export type NodeUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: NodeUrlError };

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Validate a user-entered node URL. Only http(s) is accepted; credentials,
 * query strings and fragments are rejected as "invalid" (they would break the
 * `${base}/v2/...` URL building and could leak secrets into requests). A
 * trailing slash is stripped so callers can append paths directly.
 */
export function normalizeNodeUrl(
  input: string,
  pageProtocol: string = typeof location === "undefined" ? "" : location.protocol,
): NodeUrlResult {
  const trimmed = input.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "protocol" };
  }
  // URL#search/#hash are empty for a bare trailing "?" / "#", so check the raw text too.
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    /[?#]/.test(trimmed)
  ) {
    return { ok: false, error: "invalid" };
  }
  // An https page cannot call plain-http nodes (mixed content) except loopback.
  if (
    parsed.protocol === "http:" &&
    pageProtocol === "https:" &&
    !LOOPBACK_HOSTS.has(parsed.hostname)
  ) {
    return { ok: false, error: "protocol" };
  }
  // Canonical form (lowercased host, default port dropped) so it matches what the browser requests.
  return { ok: true, url: (parsed.origin + parsed.pathname).replace(/\/+$/, "") };
}

/** Parse stored JSON, keeping only entries that still validate. */
export function parseNodeOverrides(raw: string | null | undefined): NodeOverrides {
  if (!raw) return {};
  let data: unknown; // untrusted JSON from localStorage, narrowed below
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof data !== "object" || data === null) return {};
  const result: NodeOverrides = {};
  for (const key of ["algodUrl", "indexerUrl"] as const) {
    const value = (data as Record<string, string | undefined>)[key];
    if (typeof value !== "string") continue;
    const normalized = normalizeNodeUrl(value);
    if (normalized.ok) result[key] = normalized.url;
  }
  return result;
}

export function loadNodeOverrides(): NodeOverrides {
  try {
    return parseNodeOverrides(localStorage.getItem(NODE_OVERRIDES_STORAGE_KEY));
  } catch {
    // Storage can be blocked (private mode / disabled cookies).
    return {};
  }
}

/** Persist overrides; an empty object removes the entry. Returns false if storage is unavailable. */
export function saveNodeOverrides(overrides: NodeOverrides): boolean {
  try {
    if (!overrides.algodUrl && !overrides.indexerUrl) {
      localStorage.removeItem(NODE_OVERRIDES_STORAGE_KEY);
    } else {
      localStorage.setItem(
        NODE_OVERRIDES_STORAGE_KEY,
        JSON.stringify(overrides),
      );
    }
    return true;
  } catch {
    return false;
  }
}

/** Subset of the node endpoints' genesis info that we compare. */
export interface NodeGenesisInfo {
  id?: string;
  "genesis-id"?: string;
}

/** Whether a node reports the genesis id this build targets. */
export function genesisMatches(
  info: NodeGenesisInfo,
  expectedGenesisId: string,
): boolean {
  return (info.id ?? info["genesis-id"]) === expectedGenesisId;
}
