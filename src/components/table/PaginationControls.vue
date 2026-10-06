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
          <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }}</option>
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
}>();

const emit = defineEmits<{
  "update:page": [page: number];
  "update:pageSize": [pageSize: number];
}>();

const pages = computed(() => pageCount(props.total, props.pageSize));
const range = computed(() => pageRange(props.page, props.total, props.pageSize));

function onSizeChange(e: Event) {
  emit("update:pageSize", Number((e.target as HTMLSelectElement).value));
}
</script>
