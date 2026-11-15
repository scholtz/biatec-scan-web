// Brand name, page title and the fallbacks for the network-identity build
// variables when they are unset (a plain local build targets Algorand
// mainnet). Shared by the browser bundle (src/config/env.ts, src/main.ts) and
// the build-time metadata (src/config/socialMeta.ts, run by Vite in Node), so
// the title baked into index.html can't drift from the one set at runtime.
// Must stay dependency-free: no `import.meta.env`, browser or Node APIs.

export const SITE_NAME = "Biatec Scan";

export const DEFAULT_GENESIS_ID = "mainnet-v1.0";

export const DEFAULT_NETWORK_LABEL = "Algorand";

/** Document title for a network, e.g. "Algorand Explorer - Biatec Scan". */
export function pageTitle(networkLabel: string): string {
  return `${networkLabel} Explorer - ${SITE_NAME}`;
}
