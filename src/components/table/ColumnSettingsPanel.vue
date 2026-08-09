<template>
  <div class="relative inline-block" ref="rootEl">
    <button
      type="button"
      class="flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
      :title="$t('table.configureColumns')"
      @click="open = !open"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span class="hidden sm:inline">{{ $t("table.columns") }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/40 md:hidden"
        @click="open = false"
      />
    </Teleport>

    <div
      v-if="open"
      class="z-50 bg-gray-800 border border-gray-700 rounded-t-lg md:rounded-lg shadow-xl text-sm w-full md:w-72 fixed inset-x-0 bottom-0 md:absolute md:inset-auto md:right-0 md:top-full md:mt-1 max-h-[70vh] md:max-h-96 overflow-y-auto"
    >
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-700 sticky top-0 bg-gray-800">
        <span class="text-white font-medium">{{ $t("table.configureColumns") }}</span>
        <button class="text-gray-400 hover:text-white" @click="open = false" :title="$t('common.close')">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-2 space-y-3">
        <div v-if="columns.pinnedDefs.length" class="text-xs text-gray-500">
          <div v-for="c in columns.pinnedDefs" :key="c.key" class="flex items-center gap-2 px-2 py-1">
            <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.828 6l-1.415-1.414 1.415-1.415a1 1 0 111.414 1.415L9.828 6zm-.586 1.414L5.05 11.607l-.707 2.828 2.828-.707 4.192-4.193-1.414-1.414-.707.707-.707-.707.707-.707z"
              />
            </svg>
            <span>{{ resolveLabel(c.key) }}</span>
            <span class="ml-auto text-[10px] uppercase tracking-wide text-gray-600">{{ $t("table.pinned") }}</span>
          </div>
        </div>

        <div data-drag-container class="space-y-1">
          <div
            v-for="(key, index) in columns.orderedConfigurableKeys.value"
            :key="key"
            :data-drag-key="key"
            class="drag-row rounded bg-gray-900/40 hover:bg-gray-900/70 transition-colors px-2 py-1.5"
          >
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 touch-none"
                :title="$t('table.dragToReorder')"
                @pointerdown="drag.onPointerDown($event, key)"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="6" cy="5" r="1.3" />
                  <circle cx="6" cy="10" r="1.3" />
                  <circle cx="6" cy="15" r="1.3" />
                  <circle cx="12" cy="5" r="1.3" />
                  <circle cx="12" cy="10" r="1.3" />
                  <circle cx="12" cy="15" r="1.3" />
                </svg>
              </button>

              <label class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  class="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 shrink-0"
                  :checked="columns.isVisible(key)"
                  @change="columns.toggleVisible(key)"
                />
                <span class="text-gray-200 truncate">{{ resolveLabel(key) }}</span>
              </label>

              <div class="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  class="p-1 text-gray-500 hover:text-white disabled:opacity-20 disabled:hover:text-gray-500"
                  :disabled="index === 0"
                  :title="$t('table.moveUp')"
                  @click="columns.moveUp(key)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="p-1 text-gray-500 hover:text-white disabled:opacity-20 disabled:hover:text-gray-500"
                  :disabled="index === columns.orderedConfigurableKeys.value.length - 1"
                  :title="$t('table.moveDown')"
                  @click="columns.moveDown(key)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex items-center gap-1.5 pl-6 mt-1">
              <span class="text-[10px] text-gray-500 shrink-0">{{ $t("table.showOn") }}</span>
              <select
                class="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[11px] text-gray-200 flex-1 min-w-0"
                :value="columns.getTier(key)"
                @change="onTierChange(key, $event)"
              >
                <option value="sm">{{ $t("table.tierSm") }}</option>
                <option value="lg">{{ $t("table.tierLg") }}</option>
                <option value="xl4k">{{ $t("table.tier4k") }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="px-3 py-2 border-t border-gray-700 sticky bottom-0 bg-gray-800">
        <button
          type="button"
          class="text-xs text-blue-400 hover:text-blue-300"
          @click="columns.resetToDefault()"
        >
          {{ $t("table.resetToDefault") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { UseTableColumnsReturn } from "../../composables/useTableColumns";
import { usePointerDragReorder } from "../../composables/usePointerDragReorder";
import type { ViewportTier } from "../../composables/useViewportTier";

const props = defineProps<{
  columns: UseTableColumnsReturn;
  /** Same resolved label overrides passed to DataTable, keyed by column key. */
  columnLabels?: Partial<Record<string, string>>;
}>();

const { t } = useI18n();
const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

function resolveLabel(key: string): string {
  if (props.columnLabels?.[key]) return props.columnLabels[key]!;
  const def = props.columns.pinnedDefs.find((c) => c.key === key) ?? props.columns.configurableDefs.find((c) => c.key === key);
  return def ? t(def.labelKey) : key;
}

const drag = usePointerDragReorder((key, toIndex) => {
  props.columns.reorder(key, toIndex);
});

function isViewportTier(value: string): value is ViewportTier {
  return value === "sm" || value === "lg" || value === "xl4k";
}

function onTierChange(key: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (isViewportTier(value)) {
    props.columns.setTier(key, value);
  }
}

function onDocumentClick(e: MouseEvent) {
  if (!open.value) return;
  const target = e.target as Node;
  if (rootEl.value && !rootEl.value.contains(target)) {
    open.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") open.value = false;
}

onMounted(() => {
  document.addEventListener("mousedown", onDocumentClick);
  document.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocumentClick);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.drag-row.dragging {
  opacity: 0.5;
}
.drag-row.drag-over-before {
  box-shadow: inset 0 2px 0 0 rgb(59 130 246);
}
</style>
