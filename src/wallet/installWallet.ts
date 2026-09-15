// src/wallet/installWallet.ts - Loaded lazily by main.ts (see walletReady.ts).
import type { App } from "vue";
import { WalletManagerPlugin } from "@txnlab/use-wallet-vue";
import { buildWalletManagerConfig } from "./walletConfig";
import { resolveWalletReady } from "./walletReady";

export function installWallet(app: App): void {
  app.use(WalletManagerPlugin, buildWalletManagerConfig());
  resolveWalletReady();
}
