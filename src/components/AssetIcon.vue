<template>
  <img
    :src="failed ? '/default-asset.png' : assetImageUrl(assetId)"
    :alt="alt"
    :class="sizeClass"
    class="rounded-full bg-white/10 flex-shrink-0"
    @error="failed = true"
  />
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { assetImageUrl } from "../config/env";

const props = withDefaults(
  defineProps<{
    assetId: bigint | number | string;
    alt?: string;
    sizeClass?: string;
  }>(),
  { alt: "", sizeClass: "w-8 h-8" }
);

const failed = ref(false);
watch(
  () => props.assetId,
  () => {
    failed.value = false;
  }
);
</script>
