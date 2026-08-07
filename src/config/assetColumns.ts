import type { ColumnDef } from "../composables/useTableColumns";
import type { BiatecAsset } from "../api/models";
import { changePercent } from "../utils/priceChange";

/**
 * Column set shared by the main Assets table and the Favorites table.
 * Favorites is just a user-curated filter over the same asset data, so its
 * table must always expose the same columns (incl. help text) as Assets —
 * do not fork this list, add/edit columns here and both pages pick it up.
 */
export const assetColumns: ColumnDef[] = [
  { key: "name", labelKey: "assets.name", pinned: true },
  { key: "rank", labelKey: "assets.rank", align: "right", descriptionKey: "assets.rankHelp" },
  { key: "price", labelKey: "assets.price", align: "right", sortable: true, descriptionKey: "assets.priceHelp" },
  {
    key: "price7DChart",
    labelKey: "assets.price7DChart",
    align: "right",
    descriptionKey: "assets.price7DChartHelp",
    defaultTier: "lg",
  },
  {
    key: "change1H",
    labelKey: "assets.change1H",
    align: "right",
    sortable: true,
    defaultVisible: false,
    descriptionKey: "assets.change1HHelp",
  },
  {
    key: "change24H",
    labelKey: "assets.change24H",
    align: "right",
    sortable: true,
    descriptionKey: "assets.change24HHelp",
  },
  {
    key: "change7D",
    labelKey: "assets.change7D",
    align: "right",
    sortable: true,
    defaultVisible: false,
    descriptionKey: "assets.change7DHelp",
  },
  { key: "realTvl", labelKey: "assets.realTvl", align: "right", sortable: true, descriptionKey: "assets.realTvlHelp" },
  {
    key: "realTvl7DChart",
    labelKey: "assets.realTvl7DChart",
    align: "right",
    descriptionKey: "assets.realTvl7DChartHelp",
    defaultTier: "lg",
  },
  {
    key: "totalTvl",
    labelKey: "assets.totalTvl",
    align: "right",
    sortable: true,
    descriptionKey: "assets.totalTvlHelp",
    // Real TVL is the headline liquidity metric; total TVL is secondary detail
    // that only gets a default slot on Full HD-class widths and up.
    defaultTier: "lg",
  },
  {
    key: "fdmc",
    labelKey: "assets.fdmc",
    align: "right",
    sortable: true,
    defaultVisible: false,
    descriptionKey: "assets.fdmcHelp",
  },
  {
    key: "volume1H",
    labelKey: "assets.volume1H",
    align: "right",
    sortable: true,
    defaultVisible: false,
    descriptionKey: "assets.volume1HHelp",
  },
  {
    key: "volume24H",
    labelKey: "assets.volume24H",
    align: "right",
    sortable: true,
    descriptionKey: "assets.volume24HHelp",
  },
  {
    key: "volume7D",
    labelKey: "assets.volume7D",
    align: "right",
    sortable: true,
    defaultVisible: false,
    descriptionKey: "assets.volume7DHelp",
  },
  {
    key: "updated",
    labelKey: "assets.updated",
    align: "right",
    sortable: true,
    descriptionKey: "assets.updatedHelp",
    // Hidden below a Full HD desktop by default so the name column has room
    // to breathe on phones/tablets/typical laptops; still available via the
    // column settings panel.
    defaultTier: "lg",
  },
  {
    key: "favorite",
    labelKey: "common.favorite",
    align: "center",
    descriptionKey: "common.favoriteHelp",
    defaultTier: "lg",
  },
  {
    key: "pools",
    labelKey: "common.pools",
    align: "right",
    descriptionKey: "assets.poolsHelp",
    defaultTier: "lg",
  },
];

/**
 * Fully diluted market capitalisation: latest USD price times the asset's
 * total token supply (adjusted for decimals). Returns undefined when either
 * input is missing so callers can render a placeholder instead of 0.
 */
export function fdmc(a: BiatecAsset): number | undefined {
  const price = a.priceUSD;
  const total = a.params?.total;
  const decimals = a.params?.decimals ?? 0;
  if (price == null || total == null) return undefined;
  return price * (Number(total) / 10 ** decimals);
}

/** Sort comparators for `assetColumns`, shared so Assets and Favorites sort identically. */
export const assetSortFns: Partial<Record<string, (a: BiatecAsset) => number | string>> = {
  price: (a) => a.priceUSD ?? Number.NEGATIVE_INFINITY,
  change1H: (a) => changePercent(a.priceUSD, a.priceUSD1H) ?? Number.NEGATIVE_INFINITY,
  change24H: (a) => changePercent(a.priceUSD, a.priceUSD24H) ?? Number.NEGATIVE_INFINITY,
  change7D: (a) => changePercent(a.priceUSD, a.priceUSD7D) ?? Number.NEGATIVE_INFINITY,
  realTvl: (a) => a.tvL_USD ?? Number.NEGATIVE_INFINITY,
  totalTvl: (a) => a.totalTVLAssetInUSD ?? Number.NEGATIVE_INFINITY,
  fdmc: (a) => fdmc(a) ?? Number.NEGATIVE_INFINITY,
  volume1H: (a) => a.volume1H ?? Number.NEGATIVE_INFINITY,
  volume24H: (a) => a.volume24H ?? Number.NEGATIVE_INFINITY,
  volume7D: (a) => a.volume7D ?? Number.NEGATIVE_INFINITY,
  updated: (a) => a.timestamp ?? "",
};
