<template>
  <div class="relative inline-block" ref="rootEl">
    <button
      type="button"
      class="w-4 h-4 inline-flex items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white text-[10px] font-semibold leading-none"
      :title="text"
      :aria-label="text"
      @click="open = !open"
    >
      ?
    </button>

    <div
      v-if="open"
      class="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 max-w-[80vw] bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 text-xs text-gray-200"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

defineProps<{ text: string }>();

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

function onDocumentClick(e: MouseEvent) {
  if (!open.value) return;
  const target = e.target as Node;
  if (rootEl.value && !rootEl.value.contains(target)) open.value = false;
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
