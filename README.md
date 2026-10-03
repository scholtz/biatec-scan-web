# Biatec Scan

Biatec Scan is a DEX and blockchain explorer for the **Algorand** ecosystem
(and **Voi**). It shows live and historical activity across the Algorand
decentralised exchanges (Pact, TinyMan and Biatec), together with a general
purpose explorer for blocks, transactions, accounts and smart contracts.

This repository is the web frontend: a Vue 3 + TypeScript + Tailwind single-page
app. The data comes from the **AVM Trade Reporter** backend
([`scholtz/AVMTradeReporter`](https://github.com/scholtz/AVMTradeReporter)),
which indexes DEX activity and serves it over REST and SignalR. Chain lookups
(accounts, applications, boxes, blocks) go straight to an Algorand node (algod),
with the indexer used only for historical transaction lookups.

## What it does

- **Assets** – sortable table of assets with price, 24h change, volume, TVL and
  7-day sparklines; favourites; asset details with an embedded TradingView
  chart, pools, recent trades, liquidity updates and active holders.
- **Pools and trades** – aggregated pools per asset, pools per asset pair, pool
  details, live trade, liquidity and pool-update feeds, scam-rating warnings for
  suspicious pools.
- **Swap** – routed swaps with wallet connection (Biatec Wallet first, other
  wallets via use-wallet).
- **Explorer** – blocks, transaction groups, transactions (including inner
  transactions with decoded ARC-4 method calls), accounts and a universal
  search.
- **Applications** – application details in tabs (basic info, schema and state,
  boxes, approval program, clear state program), with decompile/copy actions, the
  approval program's contract hash, and contract metadata from the
  [ARC-56 registry](https://scholtz.github.io/ARC56Registry/) (owners ranked by
  reputation, and a warning when no ARC-56 file is published for the contract).
- **Multi-network** – one codebase serves every network; everything
  network-specific (API/algod/indexer URLs, genesis id and hash, native token,
  USD reference asset, ARC-56 registry) comes from `VITE_*` build variables in
  [`src/config/env.ts`](src/config/env.ts).
- **Localised** – English, Slovak, Czech, German, Spanish, Polish, Hungarian,
  Russian and Chinese.

## Where it is deployed

| Network | Site | API | Deployment |
|---|---|---|---|
| Algorand mainnet (production) | <https://algorand.scan.biatec.io> | <https://api.algorand.scan.biatec.io> | manual, via the **Promote to Production** workflow |
| Algorand testnet (stage) | <https://testnet.scan.biatec.io> | <https://api.testnet.scan.biatec.io> | automatic on every push to `main` |
| Voi mainnet (production) | <https://voi.scan.biatec.io> | <https://api.voi.scan.biatec.io> | manual, via the **Promote to Production** workflow with `network=voi` |

How it gets there:

- Every push to `main` runs the tests (`.github/workflows/build-fe.yml`),
  builds one Docker image per network (`scholtz2/biatec-scan-fe:<network>-<version>`,
  an nginx image serving the static bundle with a strict Content-Security-Policy)
  and deploys the **testnet** build to the stage Kubernetes namespace.
- Production is never deployed automatically. Once a version is verified on
  stage, run **Promote to Production**
  (`.github/workflows/promote-production.yml`) to re-tag that already-built image
  and roll it out to mainnet, Voi, or both.
- Kubernetes manifests are in [`k8s/`](k8s/) (`main`, `testnet`, `voi`). Each
  network also runs its own charting widget (`/charts`) and ARC-56 registry
  (`/arc56-registry`), served from the same host so no CORS is needed.
- The Docker build is in [`docker/`](docker/); [`vercel.json`](vercel.json) is
  used for Vercel preview deployments.

## Development

Requirements: Node.js and [pnpm](https://pnpm.io) (the version is pinned in
`package.json`).

```sh
pnpm install
pnpm dev            # start the dev server (talks to the production API by default)
pnpm build          # type-check (vue-tsc) and build
pnpm test           # unit tests (vitest)
pnpm test:e2e       # end-to-end tests (Playwright)
pnpm lint           # eslint
```

To point a local build at another network, set the `VITE_*` variables listed in
[`src/config/env.ts`](src/config/env.ts) (for example `VITE_API_BASE_URL`,
`VITE_ALGORAND_ALGOD_URL`, `VITE_GENESIS_ID`, `VITE_GENESIS_HASH`).

### Backend API client

The typed Axios client in `src/api/` is generated from the backend's Swagger
spec and must not be edited by hand:

```sh
pnpm generate:api
# or from a specific environment's spec:
ORVAL_INPUT=https://api.testnet.scan.biatec.io/swagger/v1/swagger.json pnpm generate:api
```

### Localisation

Every locale file in `src/i18n/locales/` must have the same keys as `en.json`,
and new strings must be genuinely translated, not copied from English.
`pnpm check-localization-files` and `pnpm check-phrases` report missing and untranslated strings.

### Working with the backend

The backend lives in a sibling checkout, `../AVMTradeReporter`; open
`biatec-scan.code-workspace` to work on both together. See [`CLAUDE.md`](CLAUDE.md)
for the conventions used in this repo (type safety, grid layout, localisation,
and the backend-change-then-regenerate-client workflow).
