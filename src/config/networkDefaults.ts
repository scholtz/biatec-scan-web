// Fallbacks for the network-identity build variables when they are unset
// (a plain local build targets Algorand mainnet). Shared by src/config/env.ts
// (runtime, import.meta.env) and src/config/socialMeta.ts (build time, Node)
// so the title baked into index.html can't drift from the one set at runtime.
// Must stay free of `import.meta.env` and browser APIs.

export const DEFAULT_GENESIS_ID = "mainnet-v1.0";

export const DEFAULT_NETWORK_LABEL = "Algorand";
