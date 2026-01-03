<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-white">{{ title }}</h2>
      <button
        @click="handleDecompile"
        :disabled="isDecompiling"
        class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
      >
        {{ isDecompiling ? "Decompiling..." : "Decompile" }}
      </button>
    </div>

    <div
      v-if="decompiledCode"
      class="bg-dark-900 p-4 rounded-lg border border-gray-700"
    >
      <pre
        class="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap"
        >{{ decompiledCode }}</pre
      >
    </div>
    <div v-else class="bg-dark-900 p-4 rounded-lg border border-gray-700">
      <p class="text-gray-400 text-sm">
        Click 'Decompile' to view the TEAL code
      </p>
      <p class="text-gray-500 text-xs mt-2" v-if="program">
        Base64 encoded: {{ getPreview() }}...
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  program: Uint8Array | undefined;
  decompiledCode: string;
  isDecompiling: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  decompile: [];
}>();

const handleDecompile = () => {
  emit("decompile");
};

const getPreview = () => {
  if (!props.program) return "";
  // Convert Uint8Array to string, then to base64
  const binaryString = Array.from(props.program)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binaryString).substring(0, 100);
};
</script>
