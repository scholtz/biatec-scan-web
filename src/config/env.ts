// Central place for build-time (Vite `VITE_*`) environment configuration.
// Every network-specific URL the app talks to must be read from here rather
// than hardcoded, so a single Docker image build produces a network-specific
// bundle (mainnet, testnet, and later voi/aramid) purely by varying these
// env vars at build time - see docker/Dockerfile and .github/workflows.
const viteEnv =
  (import.meta as unknown as { env?: Record<string, string> })?.env ?? {};

/** Base URL of the Biatec Scan trade/aggregation REST + SignalR API. */
export const apiBaseUrl: string =
  viteEnv.VITE_API_BASE_URL || "https://algorand-trades.de-4.biatec.io";

/** Algorand algod (node) REST endpoint. */
export const algodUrl: string =
  viteEnv.VITE_ALGORAND_ALGOD_URL ||
  "https://algorand-algod-public.de-4.biatec.io";

/** Algorand indexer REST endpoint. */
export const indexerUrl: string =
  viteEnv.VITE_ALGORAND_INDEXER_URL || "https://mainnet-idx.4160.nodely.dev";

/** ARC-56 ABI registry (chain-agnostic, shared across networks). */
export const arc56RegistryUrl: string =
  viteEnv.VITE_ARC56_REGISTRY_URL ||
  "https://algorand.scan.biatec.io/arc56-registry";

/**
 * Base URL of the TradingView charts microservice. In deployed environments
 * (mainnet and testnet alike) `/charts` is routed by the same ingress as the
 * frontend, so a relative URL keeps the iframe on the current host instead of
 * leaking to production. Local dev has no `/charts` route, so fall back to
 * the public production instance there.
 */
export const chartsBaseUrl: string =
  viteEnv.VITE_CHARTS_BASE_URL ||
  ((viteEnv as Record<string, unknown>).DEV
    ? "https://algorand.scan.biatec.io/charts"
    : "/charts");

/** Builds the chart page URL for a given ASA id. */
export function assetChartUrl(assetId: number | string | bigint): string {
  return `${chartsBaseUrl}/?interval=4H&assetA=${assetId}`;
}

/** SignalR realtime hub, served from the same API host. */
export const signalrHubUrl = `${apiBaseUrl}/biatecScanHub`;

/** Builds the asset image URL served by the API for a given ASA id. */
export function assetImageUrl(assetId: number | string | bigint): string {
  return `${apiBaseUrl}/api/asset/image/${assetId}`;
}
