import { computed, reactive, watch } from "vue";
import { tierAtLeast, useViewportTier, type ViewportTier } from "./useViewportTier";

export type SortDirection = "asc" | "desc" | null;

export interface ColumnDef {
  /** Stable id. Never reuse a key for a different meaning once shipped. */
  key: string;
  /** i18n key for the column label shown in the header and settings panel. */
  labelKey: string;
  /** i18n key for the help text shown in a tooltip next to the column header. */
  descriptionKey?: string;
  align?: "left" | "right" | "center" | "center-icon";
  sortable?: boolean;
  defaultVisible?: boolean;
  /** Pinned columns are always visible, always rendered first, and cannot be reordered/hidden. */
  pinned?: boolean;
  /** Minimum screen-size tier required to show this column when visible. Defaults to "sm" (always). */
  defaultTier?: ViewportTier;
}

export interface SortState {
  key: string | null;
  dir: SortDirection;
}

interface PersistedShape {
  version: number;
  order: string[];
  hidden: string[];
  tiers: Record<string, ViewportTier>;
  sort: SortState;
}

const STORAGE_PREFIX = "biatec-table-config";
const STORAGE_VERSION = 2;

function storageKeyFor(id: string): string {
  return `${STORAGE_PREFIX}:${id}:v${STORAGE_VERSION}`;
}

function loadPersisted(id: string): Partial<PersistedShape> | null {
  try {
    const raw = localStorage.getItem(storageKeyFor(id));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedShape>;
  } catch (error) {
    console.error(`Failed to load table config for "${id}"`, error);
    return null;
  }
}

function savePersisted(id: string, data: PersistedShape): void {
  try {
    localStorage.setItem(storageKeyFor(id), JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save table config for "${id}"`, error);
  }
}

export function useTableColumns(storageId: string, defs: ColumnDef[]) {
  const pinnedDefs = defs.filter((c) => c.pinned);
  const configurableDefs = defs.filter((c) => !c.pinned);
  const defsByKey = new Map(defs.map((c) => [c.key, c]));

  const persisted = loadPersisted(storageId);

  // Merge stored order with any new columns added since the config was last saved,
  // and drop any stored keys that no longer exist in `defs`.
  const initialOrder: string[] = [];
  const seen = new Set<string>();
  if (persisted?.order) {
    for (const key of persisted.order) {
      if (defsByKey.has(key) && !defsByKey.get(key)!.pinned && !seen.has(key)) {
        initialOrder.push(key);
        seen.add(key);
      }
    }
  }
  for (const c of configurableDefs) {
    if (!seen.has(c.key)) {
      initialOrder.push(c.key);
      seen.add(c.key);
    }
  }

  const initialHidden = new Set<string>();
  if (persisted?.hidden) {
    for (const key of persisted.hidden) {
      if (defsByKey.has(key)) initialHidden.add(key);
    }
  } else {
    for (const c of configurableDefs) {
      if (c.defaultVisible === false) initialHidden.add(c.key);
    }
  }

  const initialTiers: Record<string, ViewportTier> = {};
  for (const c of defs) {
    initialTiers[c.key] = persisted?.tiers?.[c.key] ?? c.defaultTier ?? "sm";
  }

  const state = reactive({
    order: initialOrder,
    hidden: initialHidden,
    tiers: initialTiers,
    sort: {
      key: persisted?.sort?.key ?? null,
      dir: persisted?.sort?.dir ?? null,
    } as SortState,
  });

  const { tier: viewportTier } = useViewportTier();

  function persist() {
    savePersisted(storageId, {
      version: STORAGE_VERSION,
      order: state.order,
      hidden: Array.from(state.hidden),
      tiers: state.tiers,
      sort: state.sort,
    });
  }

  watch(
    () => [state.order.slice(), Array.from(state.hidden), { ...state.tiers }, state.sort.key, state.sort.dir],
    persist,
    { deep: false },
  );

  const orderedColumns = computed<ColumnDef[]>(() => {
    const configured = state.order
      .map((key) => defsByKey.get(key))
      .filter((c): c is ColumnDef => !!c);
    return [...pinnedDefs, ...configured];
  });

  const visibleOrderedColumns = computed<ColumnDef[]>(() =>
    orderedColumns.value.filter((c) => {
      if (!c.pinned && state.hidden.has(c.key)) return false;
      const requiredTier = state.tiers[c.key] ?? "sm";
      return tierAtLeast(viewportTier.value, requiredTier);
    }),
  );

  function isVisible(key: string): boolean {
    const def = defsByKey.get(key);
    if (!def) return false;
    return !!def.pinned || !state.hidden.has(key);
  }

  function getTier(key: string): ViewportTier {
    return state.tiers[key] ?? "sm";
  }

  function setTier(key: string, tier: ViewportTier): void {
    const def = defsByKey.get(key);
    if (!def || def.pinned) return;
    state.tiers[key] = tier;
  }

  function toggleVisible(key: string): void {
    const def = defsByKey.get(key);
    if (!def || def.pinned) return;
    if (state.hidden.has(key)) state.hidden.delete(key);
    else state.hidden.add(key);
  }

  function moveUp(key: string): void {
    const idx = state.order.indexOf(key);
    if (idx <= 0) return;
    [state.order[idx - 1], state.order[idx]] = [state.order[idx], state.order[idx - 1]];
  }

  function moveDown(key: string): void {
    const idx = state.order.indexOf(key);
    if (idx === -1 || idx >= state.order.length - 1) return;
    [state.order[idx + 1], state.order[idx]] = [state.order[idx], state.order[idx + 1]];
  }

  /** Move the column at `fromKey` so it sits at `toIndex` within the configurable order. */
  function reorder(fromKey: string, toIndex: number): void {
    const fromIndex = state.order.indexOf(fromKey);
    if (fromIndex === -1) return;
    const clampedTo = Math.max(0, Math.min(toIndex, state.order.length - 1));
    if (fromIndex === clampedTo) return;
    const [moved] = state.order.splice(fromIndex, 1);
    state.order.splice(clampedTo, 0, moved);
  }

  function cycleSort(key: string): void {
    const def = defsByKey.get(key);
    if (!def?.sortable) return;
    if (state.sort.key !== key) {
      state.sort.key = key;
      state.sort.dir = "asc";
    } else if (state.sort.dir === "asc") {
      state.sort.dir = "desc";
    } else if (state.sort.dir === "desc") {
      state.sort.key = null;
      state.sort.dir = null;
    } else {
      state.sort.dir = "asc";
    }
  }

  function setSort(key: string | null, dir: SortDirection): void {
    state.sort.key = key;
    state.sort.dir = dir;
  }

  function resetToDefault(): void {
    state.order.splice(0, state.order.length, ...configurableDefs.map((c) => c.key));
    state.hidden.clear();
    for (const c of configurableDefs) {
      if (c.defaultVisible === false) state.hidden.add(c.key);
    }
    for (const c of defs) {
      state.tiers[c.key] = c.defaultTier ?? "sm";
    }
    state.sort.key = null;
    state.sort.dir = null;
  }

  const sortState = computed(() => state.sort);

  return {
    pinnedDefs,
    configurableDefs,
    orderedColumns,
    visibleOrderedColumns,
    sortState,
    isVisible,
    toggleVisible,
    getTier,
    setTier,
    moveUp,
    moveDown,
    reorder,
    cycleSort,
    setSort,
    resetToDefault,
    // Exposed for the settings panel to render configurable columns in current order.
    orderedConfigurableKeys: computed(() => state.order.slice()),
  };
}

export type UseTableColumnsReturn = ReturnType<typeof useTableColumns>;

/**
 * Sorts `rows` according to `sort` using the value getter registered for the sort key in
 * `sortFns`. Returns `rows` unchanged (same reference) when no sort is active or no getter
 * is registered for the active key, so callers can rely on it as a safe no-op fallback.
 */
export function sortRows<T>(
  rows: T[],
  sort: SortState,
  sortFns?: Partial<Record<string, (row: T) => number | string | null | undefined>>,
): T[] {
  const { key, dir } = sort;
  if (!key || !dir) return rows;
  const getter = sortFns?.[key];
  if (!getter) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = getter(a);
    const bv = getter(b);
    let cmp: number;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av ?? "").localeCompare(String(bv ?? ""));
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return copy;
}
