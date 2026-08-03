# Project notes for Claude

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
