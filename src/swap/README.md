# Swap module

Router-agnostic swap engine used by `src/views/Swap.vue`. Ported from
Biatec Wallet (`scholtz/wallet`, `src/scripts/aggregators/*`) and reshaped
so that every DEX aggregator is a self-contained plug-in.

```
src/swap/
├── types.ts          SwapRouter contract + shared quote/route/result shapes
├── errors.ts         SwapRouterError codes (translated by the UI)
├── amounts.ts        bigint amount parsing/formatting, slippage maths
├── validate.ts       sender / rekey / close-to guard for every signed txn
├── simulate.ts       algod simulate → ledger-computed net received amount
├── bestQuote.ts      effective amount + "best route" selection rules
├── quoteService.ts   fan-out to all routers in parallel, progress callbacks
├── executeSwap.ts    validate → sign (injected signer) → submit → confirm
└── routers/
    ├── index.ts      the registry (`swapRouters`, `isSwapAvailableOn`)
    ├── shared.ts     decode / number-safety helpers used by adapters
    ├── biatec.ts     Biatec Router (ARC-14, mainnet + testnet)
    ├── folks.ts      Folks Router (@folks-router/js-sdk, mainnet)
    └── haystack.ts   Haystack / Deflex HTTP API (mainnet)
```

The Vue side is `src/composables/useSwap.ts` (reactive orchestration) and
`src/components/swap/*` (presentation). Neither knows which routers exist.

## Adding a router

1. Create `src/swap/routers/<name>.ts` exporting an object that implements
   `SwapRouter` from `types.ts`:
   - `id` – stable, lowercase; also used as the i18n key
     `swap.routers.<id>.description` (add it to every locale).
   - `supportsNetwork(genesisId)` – return `false` for networks the router
     has no deployment on; the UI shows it as "unavailable" instead of
     firing a request that can only fail.
   - `quote(request, ctx)` – fetch the quote **and** the prepared,
     unsigned transactions in one call and return a `SwapQuote`. The
     `outputAmount` shown to the user must be the amount those exact
     transactions execute. Use `applySlippage()` to derive
     `minimumReceived`. Put logic-signature or otherwise pre-signed
     transactions into `group.presigned` so the wallet never signs them.
   - Normalise the route into `SwapRouteInfo` so the shared route
     visualisation works without router-specific branches.
2. Append the router to `swapRouters` in `routers/index.ts`.
3. Add a unit test next to it for the pure parts (route normalisation,
   grouping) – see `routers/*.test.ts`.
4. Add the router's API host to `CSP_WALLET_CONNECT_SRC` in
   `docker/Dockerfile` (network-independent hosts live there once; the
   per-network `k8s/*/deployment-fe.yaml` lists only carry API/algod/
   indexer hosts). Network selection belongs in `src/config/env.ts` as a
   `VITE_*` setting (see `folksRouterNetwork` / `haystackChain`), never
   hardcoded in the adapter.
5. Throw `SwapRouterError(code)` (`src/swap/errors.ts`) for user-facing
   failures and add any new code to `swap.routerErrors.*` in every locale.

Nothing else changes: quoting, simulation, best-route selection, the
router cards and execution are all driven off the registry.

## Safety invariants

- `executeSwap.ts` refuses to sign any transaction whose sender is not the
  connected account or that rekeys / closes out (`validate.ts`). Routers
  are remote, untrusted parties. All groups are signed before any is
  submitted, so a rejected wallet prompt never leaves a partial swap on
  chain.
- Amounts that do not fit a JS number exactly are refused for routers whose
  API schema only accepts numbers (`shared.ts` `toSafeNumber`).
- Biatec Router quotes are re-requested with the real `receiveMinimum` and
  cross-checked against it before they are offered for signing.
- Quotes are invalidated whenever the pair, amount or sender changes.
