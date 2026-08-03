<template>
  <div
    class="relative inline-block"
    ref="rootEl"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <button
      type="button"
      class="w-4 h-4 inline-flex items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white text-[10px] font-semibold leading-none"
      :aria-label="text"
      @click="onClick"
    >
      ?
    </button>

    <div
      v-if="visible"
      class="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 max-w-[80vw] bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 text-xs text-gray-200"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

defineProps<{ text: string }>();

// Desktop (fine pointer + real hover support) shows the tooltip on mouseover, no click needed.
// Touch devices fall back to tap-to-toggle since they have no hover state.
const supportsHover =
  typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

const clickOpen = ref(false);
const hoverOpen = ref(false);
const visible = computed(() => clickOpen.value || hoverOpen.value);
const rootEl = ref<HTMLElement | null>(null);

function onMouseEnter() {
  if (supportsHover) hoverOpen.value = true;
}
function onMouseLeave() {
  if (supportsHover) hoverOpen.value = false;
}
function onClick() {
  if (supportsHover) return; // hover already reveals it; avoid a sticky click-toggled state on desktop
  clickOpen.value = !clickOpen.value;
}

function onDocumentClick(e: MouseEvent) {
  if (!clickOpen.value) return;
  const target = e.target as Node;
  if (rootEl.value && !rootEl.value.contains(target)) clickOpen.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") clickOpen.value = false;
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
