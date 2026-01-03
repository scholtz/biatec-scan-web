<template>
  <button
    @click="handleCopy"
    :title="title"
    :class="buttonClass"
    class="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 active:bg-gray-600/50 active:scale-95 transition-all duration-150 rounded"
  >
    <slot> 📋 </slot>
  </button>
</template>

<script setup lang="ts">
import { useToast } from "../composables/useToast";

interface Props {
  text: string;
  toastMessage: string;
  title?: string;
  buttonClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "Copy to clipboard",
  buttonClass: "",
});

const { showToast } = useToast();

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.text);
    showToast(props.toastMessage, "success");
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    showToast("Failed to copy to clipboard", "error");
  }
};
</script>
