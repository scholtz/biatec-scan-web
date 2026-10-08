<template>
  <nav
    class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400"
    :aria-label="$t('common.pagination')"
    data-testid="pagination"
  >
    <div data-testid="pagination-range">
      {{ $t("common.showingRange", { from: range.from, to: range.to, total }) }}
    </div>

    <div class="flex items-center gap-2">
      <label class="flex items-center gap-1">
        {{ $t("common.pageSize") }}:
        <select
          :value="pageSize"
          class="bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white"
          data-testid="pagination-size"
          @change="onSizeChange"
        >
          <option v-for="s in sizeOptions" :key="s" :value="s">
            {{ s }}{{ s === autoPageSize ? $t("assets.auto") : "" }}
          </option>
        </select>
      </label>

      <button
        type="button"
        :disabled="page <= 1"
        class="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 text-gray-200 hover:bg-gray-600"
        data-testid="pagination-prev"
        @click="emit('update:page', page - 1)"
      >
        {{ $t("common.prev") }}
      </button>
      <span class="text-gray-300" data-testid="pagination-page">
        {{ $t("common.pageOf", { page, pages }) }}
      </span>
      <button
        type="button"
        :disabled="page >= pages"
        class="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 text-gray-200 hover:bg-gray-600"
        data-testid="pagination-next"
        @click="emit('update:page', page + 1)"
      >
        {{ $t("common.next") }}
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { pageCount, pageRange } from "../../utils/pagination";

const props = defineProps<{
  /** Current 1-based page (already clamped by the parent). */
  page: number;
  pageSize: number;
  /** Total number of items across all pages. */
  total: number;
  pageSizeOptions: readonly number[];
  /** Number of rows that fit the viewport without scrolling (null until measured). */
  autoPageSize?: number | null;
}>();

const emit = defineEmits<{
  "update:page": [page: number];
  /** A number pins that size; null means "back to auto" (the fitted size was picked). */
  "update:pageSize": [pageSize: number | null];
}>();

const pages = computed(() => pageCount(props.total, props.pageSize));
const range = computed(() => pageRange(props.page, props.total, props.pageSize));

const sizeOptions = computed(() => {
  const all = new Set<number>(props.pageSizeOptions);
  if (props.autoPageSize) all.add(props.autoPageSize);
  return [...all].sort((a, b) => a - b);
});

function onSizeChange(e: Event) {
  const size = Number((e.target as HTMLSelectElement).value);
  emit("update:pageSize", size === props.autoPageSize ? null : size);
}
</script>
