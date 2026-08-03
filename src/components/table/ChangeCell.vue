<template>
  <span v-if="pct === undefined">-</span>
  <span v-else :class="cls">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { changePercent } from "../../utils/priceChange";

const props = defineProps<{ current?: number; previous?: number }>();

const pct = computed(() => changePercent(props.current, props.previous));
const cls = computed(() => {
  if (pct.value === undefined) return "";
  return pct.value > 0 ? "text-green-400" : pct.value < 0 ? "text-red-400" : "text-gray-400";
});
const text = computed(() => {
  if (pct.value === undefined) return "";
  return (pct.value > 0 ? "+" : "") + pct.value.toFixed(2) + "%";
});
</script>
