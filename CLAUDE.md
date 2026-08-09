# Project notes for Claude

## Total type safety: no `any`, no unbadged `unknown`

Do not use the `any` type. Do not use `unknown` either, except where it is
genuinely required — and when you do use it, attach a one-line comment on
that exact line (or the containing block) explaining why a proper type isn't
possible. The one standing exception that needs no per-site comment is a
`catch (e: unknown)` binding: it's the idiomatic, self-evidently-necessary
TS pattern (the language itself only ever gives you `unknown`/`any` there),
so don't clutter every catch block repeating that. Everything else —
`unknown[]` rest-args, `as unknown as X` casts, index signatures, SignalR/
external-payload handlers — does need its own comment, since those are
judgment calls specific to that call site. The one standing exception to the
whole rule is generated API client code under `src/api/` (Orval output),
which is not hand-maintained and is exempt.

If you're tempted to reach for `as any` to silence a type error, stop and
find/define the real type instead (narrow a union, add a type guard, extend
an interface, or import the correct generated model) — a cast that discards
type information is exactly what this rule exists to prevent.

## Multi-repo workspace: frontend + backend live side by side

This repo is normally opened via `biatec-scan.code-workspace`, which includes
two folders:

- **Biatec Scan Frontend** (`.`, this repo) — Vue 3 + Tailwind DEX explorer.
- **AVM Trade Reporter** (`../AVMTradeReporter`) — the backend API this
  frontend consumes (indexes Algorand DEX activity, serves ARC-14-authed
  endpoints like `api.algorand.scan.biatec.io`).

When a task involves data that looks wrong, missing, or shaped differently
than expected (prices, pool aggregates, balances, etc.), don't assume the bug
is in the frontend — check whether the API response itself is the problem
first. `../AVMTradeReporter` is a sibling checkout on disk, not just a
reference: read its source, grep it, and propose/make changes there directly
when the fix belongs on the backend, rather than working around a backend bug
purely in frontend code. Cross-repo issues (e.g. a field the frontend needs
that the backend doesn't send, a calculation that's wrong upstream) should be
diagnosed and, where reasonable, fixed in both repos together rather than
papered over with a frontend-only workaround — if a workaround is still the
right short-term call (e.g. the backend fix is out of scope or already
tracked in an issue), say so explicitly and note it as temporary.

Related sibling checkout also available: `../../BiatecCLAMM` (the on-chain
CLAMM contracts in TEAL/Algo — the source of truth for pool pricing formulas
that both the backend and frontend need to match).

## Backend API change → regenerated frontend client workflow

When a task needs a change to the AVMTradeReporter API surface (new/changed
DTO fields or endpoints) that the frontend then consumes, follow this exact
sequence — the frontend client is generated from a *deployed* swagger spec,
so the backend must be released before the client can be regenerated:

1. Make the backend change in `../AVMTradeReporter` and run its tests:
   `dotnet test AVMTradeReporterTests/AVMTradeReporterTests.csproj`.
2. Commit and push to `master` (the backend repo's main branch is named
   `master`, not `main`). Every push to `master` triggers the
   "Build and Deploy" GitHub workflow (`.github/workflows/deploy.yml`),
   which builds the Docker images and deploys them to the **stage**
   environment (testnet, `https://testnet.scan.biatec.io`, API at
   `https://api.testnet.scan.biatec.io`). Production is NOT touched —
   promoting to production is a separate manual workflow
   (`promote-production.yml`).
3. Wait for the workflow to finish:
   `gh run list --repo scholtz/AVMTradeReporter` /
   `gh run watch <run-id> --repo scholtz/AVMTradeReporter --exit-status`.
4. In this repo, regenerate the typed Axios client from the *stage* spec
   (production swagger won't have the new fields until promotion):
   `ORVAL_INPUT=https://api.testnet.scan.biatec.io/swagger/v1/swagger.json npm run generate:api`
   (on PowerShell: `$env:ORVAL_INPUT = '...'; npm run generate:api`).
   `orval.config.ts` defaults to the production spec when `ORVAL_INPUT` is
   unset. The generator rewrites `src/api/index.ts` + `src/api/models/`.
5. Make the frontend change, run `npm run build` (type-check + vite), and
   commit both the generated client and the feature change together.
6. Note in the final summary that production still serves the old API until
   `promote-production.yml` is run manually in the backend repo — the
   frontend on mainnet must tolerate the missing fields until then (new
   generated fields are optional/nullable, so this is usually automatic).

## CSS grid / table layout gotchas

This app renders "table" rows as repeated `display:grid` containers (one grid
per header row, one grid per data row) rather than a single `<table>`. That
pattern has two sharp edges that have caused real regressions — check for
both whenever you touch table/grid layout code:

1. **Always set `grid-template-columns` to `repeat(N, minmax(0, 1fr))`, never
   `repeat(N, 1fr)`.** Plain `1fr` is `minmax(auto, 1fr)`, so any grid cell
   whose content can't shrink (an image + link + button row, an untruncated
   name, etc.) forces that cell's track wider than its siblings' — and since
   each row is an *independent* grid container, different rows compute
   different track widths for "the same" column. The visible symptom is
   columns that don't line up between rows ("the rank in row 1 doesn't match
   row 2"), content bleeding into the next column, or the page becoming
   unexpectedly scrollable. `minmax(0, 1fr)` forces every row's tracks to the
   same proportional width regardless of content.
2. **Every grid/flex cell also needs `min-w-0`** on top of the above — flex
   children (e.g. an icon+text row inside a cell) default to `min-width:auto`
   and won't shrink to fit the track even when the track itself is sized
   correctly. Pair `min-w-0` with `truncate`/`overflow-hidden` on whichever
   element should actually clip.

## Never rely on inherited text color

Do not add a colored/dark background (`bg-*`) to an element and assume the
text inside will inherit a readable color from some ancestor. Several shared
components (`FormattedNumber.vue`, `FormattedTime.vue`) render a bare
`<span>` with **no color class at all** — they've always depended on being
placed inside a parent that explicitly sets `text-white`/`text-gray-100`/etc.
If you introduce a new wrapper (e.g. a generic table-cell container) between
those components and their original colored parent, you silently get
black-on-dark-background text with no build error.

Rule: any reusable "cell" or "slot" wrapper in `src/components/table/` must
set an explicit baseline text color itself (it currently does, in
`DataTable.vue`). When writing new cell content, don't add raw
`{{ someValue }}` text or a bare `<span>` without a color class — either rely
on the wrapper's baseline color or set the color explicitly if it needs to
differ (links, colored deltas, badges).

## Favorites table must always mirror the main Assets table

`src/views/FavoriteAssets.vue`'s table view is not its own table — it renders
`DataTable` with the exact same column list as `src/views/Assets.vue`
(imported from `src/config/assetColumns.ts`, along with the shared
`assetSortFns` sort comparators and the shared `ChangeCell` component).
Favorites is conceptually just a user-curated filter over the same asset
data/columns as the main Assets page, not a separate table with its own
shape. When you add, remove, rename, or re-describe a column on the Assets
page, do it in `assetColumns.ts` so both pages pick up the change — never
fork a parallel column list for Favorites, and never let the two pages'
column sets, labels, or tooltips drift apart.

## Localization: every new user-facing string must be translated, not just added to `en.json`

This project's i18n typing (`src/i18n/index.ts`) requires every locale file
in `src/i18n/locales/*.json` to have the exact same key shape as `en.json`,
so a new key must be added to all 9 locale files or the build fails. That is
necessary but **not sufficient** — adding the same English text to every
locale file as a "placeholder" is not acceptable. It silently ships
untranslated UI to non-English users with no build-time signal that anything
is wrong.

When adding any new translatable string:
- Add the real key/value to `en.json`.
- Add a genuinely translated value (not a copy of the English text) to every
  other file in `src/i18n/locales/` (`sk`, `zh`, `de`, `es`, `cs`, `ru`, `pl`,
  `hu` as of this writing — check the directory for the current list).
- If you are not confident in a translation, say so explicitly to the user
  rather than silently shipping an English placeholder dressed up as a
  translation.
