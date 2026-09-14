// src/wallet/walletReady.ts - The wallet stack (@txnlab/use-wallet, six
// adapters, WalletConnect) is a large dependency that only the navbar's
// connect button and the Swap page need, so main.ts installs it from a
// dynamic import after mounting. Consumers await `walletReady` before
// calling `useWallet()`.
let markReady: () => void = () => {};

export const walletReady: Promise<void> = new Promise((resolve) => {
  markReady = resolve;
});

export function resolveWalletReady(): void {
  markReady();
}
