/// <reference types="vite/client" />

// Declares the build-time VITE_* variables this app actually reads (see
// src/config/env.ts and src/utils/logger.ts), so `import.meta.env` is fully
// typed without needing `as unknown as` casts at every call site.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ALGORAND_ALGOD_URL?: string;
  readonly VITE_ALGORAND_INDEXER_URL?: string;
  readonly VITE_USDC_ASSET_ID?: string;
  readonly VITE_GENESIS_ID?: string;
  readonly VITE_GENESIS_HASH?: string;
  readonly VITE_NATIVE_TOKEN_NAME?: string;
  readonly VITE_NATIVE_TOKEN_UNIT?: string;
  readonly VITE_NETWORK_LABEL?: string;
  readonly VITE_ARC56_REGISTRY_URL?: string;
  readonly VITE_CHARTS_BASE_URL?: string;
  readonly VITE_ENABLE_VERBOSE_LOGGING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
