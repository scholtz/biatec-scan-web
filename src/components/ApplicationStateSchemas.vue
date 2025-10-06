<template>
  <div class="card mb-6">
    <h2 class="text-xl font-semibold text-white mb-4">State Schemas</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div v-if="globalStateSchema">
        <h3 class="text-lg font-semibold text-purple-400 mb-3">Global State</h3>
        <div class="bg-dark-900 p-4 rounded-lg border border-gray-700 space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-400">Integers (uint):</span>
            <span class="text-white font-medium">{{ globalStateSchema.numUint || 0 }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Byte Slices:</span>
            <span class="text-white font-medium">{{ globalStateSchema.numByteSlice || 0 }}</span>
          </div>
        </div>
      </div>
      <div v-if="localStateSchema">
        <h3 class="text-lg font-semibold text-purple-400 mb-3">Local State</h3>
        <div class="bg-dark-900 p-4 rounded-lg border border-gray-700 space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-400">Integers (uint):</span>
            <span class="text-white font-medium">{{ localStateSchema.numUint || 0 }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Byte Slices:</span>
            <span class="text-white font-medium">{{ localStateSchema.numByteSlice || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface StateSchema {
  numUint: number;
  numByteSlice: number;
}

interface Props {
  globalStateSchema?: StateSchema;
  localStateSchema?: StateSchema;
}

defineProps<Props>();
</script>
