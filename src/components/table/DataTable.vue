<template>
  <div>
    <div v-if="sortableColumns.length" class="flex items-center gap-1 md:hidden text-xs mb-2">
      <select
        v-model="mobileSortKey"
        class="bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white"
      >
        <option value="">{{ $t("table.noSort") }}</option>
        <option v-for="c in sortableColumns" :key="c.key" :value="c.key">
          {{ labelFor(c) }}
        </option>
      </select>
      <button
        v-if="mobileSortKey"
        type="button"
        class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
        @click="toggleMobileDir"
      >
        {{ tableColumns.sortState.value.dir === "asc" ? "▲" : "▼" }}
      </button>
    </div>

    <div
      class="hidden md:grid gap-3 px-2 text-xs text-gray-400 mb-2"
      :style="gridStyle"
    >
      <div
        v-for="c in tableColumns.visibleOrderedColumns.value"
        :key="c.key"
        class="min-w-0"
        :class="alignClass(c.align)"
      >
        <button
          v-if="c.sortable"
          type="button"
          class="inline-flex items-center gap-1 hover:text-white max-w-full"
          :class="alignClass(c.align)"
          @click="tableColumns.cycleSort(c.key)"
        >
          <span class="truncate">{{ labelFor(c) }}</span>
          <span class="text-[10px] shrink-0" :class="{ 'text-white': tableColumns.sortState.value.key === c.key }">{{
            sortIndicator(c.key)
          }}</span>
        </button>
        <span v-else class="block truncate">{{ labelFor(c) }}</span>
      </div>
    </div>

    <div class="space-y-1">
      <div v-for="(row, index) in sortedRows" :key="rowKey(row)">
        <div
          v-row-visible="rowVisibilityKey(row)"
          class="hidden md:grid gap-3 items-center p-2 rounded hover:bg-gray-800/60 transition-colors"
          :class="[zebraClass(index), { 'cursor-pointer': props.onRowClick }]"
          :style="gridStyle"
          @click="props.onRowClick?.(row)"
        >
          <div
            v-for="c in tableColumns.visibleOrderedColumns.value"
            :key="c.key"
            class="min-w-0 text-sm text-gray-100"
            :class="alignClass(c.align)"
          >
            <slot :name="`cell-${c.key}`" :row="row" :index="index" />
          </div>
        </div>

        <div
          v-row-visible="rowVisibilityKey(row)"
          class="md:hidden p-2 rounded hover:bg-gray-800/60 transition-colors space-y-1.5"
          :class="[zebraClass(index), { 'cursor-pointer': props.onRowClick }]"
          @click="props.onRowClick?.(row)"
        >
          <template v-for="c in tableColumns.visibleOrderedColumns.value" :key="c.key">
            <div v-if="c.pinned" class="flex items-center gap-2 min-w-0 text-sm text-gray-100">
              <slot :name="`cell-${c.key}`" :row="row" :index="index" />
            </div>
            <div v-else class="flex items-center justify-between gap-3 text-xs">
              <span class="text-gray-500 shrink-0">{{ labelFor(c) }}</span>
              <span class="text-white text-right min-w-0 truncate">
                <slot :name="`cell-${c.key}`" :row="row" :index="index" />
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { sortRows, type ColumnDef, type UseTableColumnsReturn } from "../../composables/useTableColumns";

const props = defineProps<{
  tableColumns: UseTableColumnsReturn;
  rows: T[];
  rowKey: (row: T) => string | number;
  sortFns?: Partial<Record<string, (row: T) => number | string | null | undefined>>;
  onVisibilityChange?: (key: string, visible: boolean) => void;
  /** Resolved label overrides for columns whose header text needs runtime interpolation
   * (e.g. "Reserve (ALGO)"), keyed by column key. Falls back to $t(column.labelKey). */
  columnLabels?: Partial<Record<string, string>>;
  /** When set, the whole row becomes clickable. Nested interactive cell content
   * (links, buttons) should call `@click.stop` to avoid double-navigating. */
  onRowClick?: (row: T) => void;
}>();

const { t } = useI18n();

const tableColumns = props.tableColumns;

function labelFor(c: ColumnDef): string {
  return props.columnLabels?.[c.key] ?? t(c.labelKey);
}

const sortableColumns = computed(() => tableColumns.visibleOrderedColumns.value.filter((c) => c.sortable));

const mobileSortKey = computed<string>({
  get: () => tableColumns.sortState.value.key ?? "",
  set: (v: string) => {
    if (!v) {
      tableColumns.setSort(null, null);
      return;
    }
    tableColumns.setSort(v, tableColumns.sortState.value.dir ?? "asc");
  },
});

function toggleMobileDir() {
  const cur = tableColumns.sortState.value.dir;
  tableColumns.setSort(tableColumns.sortState.value.key, cur === "asc" ? "desc" : "asc");
}

function sortIndicator(key: string): string {
  if (tableColumns.sortState.value.key !== key) return "⇅";
  return tableColumns.sortState.value.dir === "asc" ? "▲" : "▼";
}

function alignClass(align?: ColumnDef["align"]): string {
  switch (align) {
    case "right":
      return "text-right";
    case "center":
    case "center-icon":
      return "text-center";
    default:
      return "text-left";
  }
}

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${tableColumns.visibleOrderedColumns.value.length}, minmax(0, 1fr))`,
}));

const sortedRows = computed(() => sortRows(props.rows, tableColumns.sortState.value, props.sortFns));

function rowVisibilityKey(row: T): string {
  return String(props.rowKey(row));
}

function zebraClass(index: number): string {
  return index % 2 === 1 ? "bg-gray-800/20" : "bg-gray-800/40";
}

let observer: IntersectionObserver | null = null;

const vRowVisible = {
  mounted(el: HTMLElement, binding: { value: string }) {
    if (!props.onVisibilityChange) return;
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const key = (entry.target as HTMLElement).dataset.rowVisibleKey;
            if (!key) return;
            props.onVisibilityChange?.(key, entry.isIntersecting);
          });
        },
        { root: null, threshold: 0.01 },
      );
    }
    el.dataset.rowVisibleKey = binding.value;
    observer.observe(el);
  },
  updated(el: HTMLElement, binding: { value: string }) {
    el.dataset.rowVisibleKey = binding.value;
  },
  unmounted(el: HTMLElement) {
    if (!observer) return;
    observer.unobserve(el);
    const key = el.dataset.rowVisibleKey;
    if (key) props.onVisibilityChange?.(key, false);
  },
};
</script>

<style scoped></style>
