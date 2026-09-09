<template>
  <div class="bg-dark-900 rounded-lg border border-gray-700 overflow-hidden">
    <p v-if="!items || items.length === 0" class="p-4 text-sm text-gray-400">
      {{ emptyText }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-dark-800">
          <tr>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
            >
              {{ $t("common.key") }}
            </th>
            <th
              scope="col"
              class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
            >
              {{ $t("common.value") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="(item, index) in items" :key="index">
            <td class="px-4 py-3 align-top text-sm text-white font-mono">
              <BufferDisplay :value="item.key" :auto-detect-numeric="false" />
            </td>
            <td class="px-4 py-3 align-top text-sm text-white font-mono">
              <BufferDisplay v-if="item.value.type === 1" :value="item.value.bytes" />
              <span v-else>{{ item.value.uint }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import algosdk from "algosdk";
import BufferDisplay from "../BufferDisplay.vue";

defineProps({
  items: {
    type: Array as PropType<algosdk.modelsv2.TealKeyValue[] | undefined | null>,
    default: undefined,
  },
  emptyText: {
    type: String,
    required: true,
  },
});
</script>
