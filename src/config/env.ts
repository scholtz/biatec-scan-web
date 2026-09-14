// Central place for build-time (Vite `VITE_*`) environment configuration.
// Every network-specific URL the app talks to must be read from here rather
// than hardcoded, so a single Docker image build produces a network-specific
// bundle (mainnet, testnet, and later voi/aramid) purely by varying these
// env vars at build time - see docker/Dockerfile and .github/workflows.
const viteEnv = import.meta.env;

/** Base URL of the Biatec Scan trade/aggregation REST + SignalR API. */
export const apiBaseUrl: string =
  viteEnv.VITE_API_BASE_URL || "https://api.algorand.scan.biatec.io";

/** Algorand algod (node) REST endpoint. */
export const algodUrl: string =
  viteEnv.VITE_ALGORAND_ALGOD_URL ||
  "https://algorand-algod-public.de-4.biatec.io";

/** Algorand indexer REST endpoint. */
export const indexerUrl: string =
  viteEnv.VITE_ALGORAND_INDEXER_URL || "https://mainnet-idx.4160.nodely.dev";

/**
 * ASA id of the network's primary USD stable token, used as the USD quote
 * asset for the native-token/USD price (USDC 31566704 on Algorand mainnet,
 * 10458941 on testnet, Aramid USDC 302190 on Voi mainnet).
 */
export const usdcAssetId: number =
  Number(viteEnv.VITE_USDC_ASSET_ID) || 31566704;

/** Genesis id of the network this build targets (e.g. "mainnet-v1.0", "voimain-v1.0"). */
export const genesisId: string =
  viteEnv.VITE_GENESIS_ID || "mainnet-v1.0";

/** Base64 genesis hash of the network this build targets, used for ARC-14 auth. */
export const genesisHash: string =
  viteEnv.VITE_GENESIS_HASH || "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";

/** Display name of the network's native token (asset 0), e.g. "Algorand" / "Voi". */
export const nativeTokenName: string =
  viteEnv.VITE_NATIVE_TOKEN_NAME || "Algorand";

/** Ticker of the network's native token, e.g. "ALGO" / "VOI". */
export const nativeTokenUnit: string =
  viteEnv.VITE_NATIVE_TOKEN_UNIT || "ALGO";

/** Human-readable network label used in branding/titles, e.g. "Algorand" / "Voi". */
export const networkLabel: string =
  viteEnv.VITE_NETWORK_LABEL || "Algorand";

/**
 * Whether this build targets Algorand mainnet. Gates UI that only makes sense
 * there (allo.info/Pera/Lora/Vestige explorer deep links etc.).
 */
export const isAlgorandMainnet: boolean = genesisId === "mainnet-v1.0";

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
  (viteEnv.DEV ? "https://algorand.scan.biatec.io/charts" : "/charts");

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

/** Whether this build targets Algorand testnet (stage environment). */
export const isAlgorandTestnet: boolean = genesisId === "testnet-v1.0";

/**
 * WalletConnect Cloud project id used by the WalletConnect-based wallet
 * adapters (Biatec Wallet, Pera, Defly). It identifies this dApp to the
 * relay, not the user, so it's safe to ship in the bundle; override per
 * deployment with VITE_WC_PROJECT_ID (get one at https://cloud.reown.com).
 */
export const walletConnectProjectId: string =
  viteEnv.VITE_WC_PROJECT_ID || "fcfde0713d43baa0d23be0773c80a72b";

/**
 * Base URL of the Biatec Router API for this network. Empty string means the
 * router is not offered on this network (see src/swap/routers/biatec.ts).
 */
export const biatecRouterUrl: string =
  viteEnv.VITE_BIATEC_ROUTER_URL ||
  (isAlgorandMainnet
    ? "https://router.api.biatec.io"
    : isAlgorandTestnet
      ? "https://testnet.router.api.biatec.io"
      : "");

/**
 * Shared, non-secret Haystack (Deflex) API key. Same anonymous key Biatec
 * Wallet ships - it only identifies the integrating app, not a user.
 */
export const haystackApiKey: string =
  viteEnv.VITE_HAYSTACK_API_KEY || "1b72df7e-1131-4449-8ce1-29b79dd3f51e";

/**
 * Referrer address passed to the Haystack and Folks routers so integrator
 * fees are attributed to Biatec (same address Biatec Wallet uses).
 */
export const swapReferrerAddress: string =
  viteEnv.VITE_SWAP_REFERRER_ADDRESS ||
  "AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y";
