// src/wallet/walletConfig.ts - Builds the @txnlab/use-wallet v5 manager
// configuration for the network this bundle targets. Biatec Wallet is always
// the first entry in the picker; everything network-specific comes from
// src/config/env.ts.
import {
  NetworkConfigBuilder,
  type NetworkConfig,
  type WalletAdapterConfig,
  type WalletManagerConfig,
} from "@txnlab/use-wallet";
import { defly } from "@txnlab/use-wallet-defly";
import { exodus } from "@txnlab/use-wallet-exodus";
import { kibisis } from "@txnlab/use-wallet-kibisis";
import { lute } from "@txnlab/use-wallet-lute";
import { pera } from "@txnlab/use-wallet-pera";
import {
  BIATEC_EXTRA_NETWORKS,
  biatec,
  caipChainIdFromGenesisHash,
} from "biatec-wallet-use-wallet-client";
import {
  algodUrl,
  genesisHash,
  genesisId,
  networkLabel,
  walletConnectProjectId,
} from "../config/env";

/** Wallet id of the Biatec Wallet adapter (must stay first in the picker). */
export const BIATEC_WALLET_ID = "biatec";

/**
 * Map an AVM genesis id onto the use-wallet network id. use-wallet ships
 * Algorand mainnet/testnet/betanet/fnet; Voi mainnet comes from the Biatec
 * adapter package; anything else is registered under its own genesis id.
 */
export function resolveWalletNetworkId(genesis: string): string {
  switch (genesis) {
    case "mainnet-v1.0":
      return "mainnet";
    case "testnet-v1.0":
      return "testnet";
    case "betanet-v1.0":
      return "betanet";
    case "fnet-v1":
      return "fnet";
    case "voimain-v1.0":
      return "voimain";
    default:
      return genesis;
  }
}

/** Ids of the registered wallets, in picker order - Biatec Wallet first. */
export function walletOrder(configs: readonly WalletAdapterConfig[]): string[] {
  return configs.map((config) => config.id);
}

export function buildNetworks(): Record<string, NetworkConfig> {
  const algod = { baseServer: algodUrl, token: "", port: "" };
  const builder = new NetworkConfigBuilder();
  const id = resolveWalletNetworkId(genesisId);
  switch (id) {
    case "mainnet":
      builder.mainnet({ algod });
      break;
    case "testnet":
      builder.testnet({ algod });
      break;
    case "betanet":
      builder.betanet({ algod });
      break;
    case "fnet":
      builder.fnet({ algod });
      break;
    case "voimain":
      builder.addNetwork("voimain", { ...BIATEC_EXTRA_NETWORKS.voimain, algod });
      break;
    default:
      builder.addNetwork(id, {
        algod,
        genesisId,
        genesisHash,
        caipChainId: caipChainIdFromGenesisHash(genesisHash),
        isTestnet: true,
      });
  }
  return builder.build();
}

export function buildWalletAdapters(): WalletAdapterConfig[] {
  const metadata = {
    name: `Biatec ${networkLabel} Scan`,
    description: `Biatec ${networkLabel} Scan - DEX explorer with swaps`,
    url: typeof window !== "undefined" ? window.location.origin : "",
    icons:
      typeof window !== "undefined"
        ? [`${window.location.origin}/favicon.ico`]
        : [],
  };
  return [
    biatec({ projectId: walletConnectProjectId, metadata }),
    pera(),
    defly(),
    lute({ siteName: metadata.name }),
    exodus(),
    kibisis(),
  ];
}

export function buildWalletManagerConfig(): WalletManagerConfig {
  return {
    wallets: buildWalletAdapters(),
    networks: buildNetworks(),
    defaultNetwork: resolveWalletNetworkId(genesisId),
    // One bundle == one network; never restore a persisted network choice.
    options: { persistNetwork: false },
  };
}
