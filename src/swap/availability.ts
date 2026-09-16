// src/swap/availability.ts - Whether the Swap feature is offered on this
// build's network, derived from env config only. The navbar and asset pages
// import this instead of the router registry so the router SDKs stay out of
// the entry bundle (they load with the Swap page chunk).
import {
  biatecRouterUrl,
  folksRouterNetwork,
  genesisId,
  haystackChain,
} from "../config/env";

/**
 * Mirrors each router's `supportsNetwork()` rule (see src/swap/routers/):
 * Biatec Router needs a configured URL on an Algorand network, Folks needs
 * mainnet, and Haystack needs a non-empty chain setting.
 */
export function isSwapAvailableOn(genesis: string): boolean {
  const biatec =
    biatecRouterUrl !== "" &&
    (genesis === "mainnet-v1.0" || genesis === "testnet-v1.0");
  const folks = genesis === "mainnet-v1.0" && folksRouterNetwork === "mainnet";
  return biatec || folks || haystackChain !== "";
}

export const isSwapAvailable: boolean = isSwapAvailableOn(genesisId);
