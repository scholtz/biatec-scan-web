<template>
  <div class="mt-4">
    <h3 class="text-lg font-semibold text-white mb-2">{{ title }}</h3>
    <div class="bg-dark-900 rounded-lg border border-gray-700 overflow-hidden">
      <div class="overflow-x-auto">
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
                {{ $t("common.action") }}
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
            <tr v-for="(item, index) in delta" :key="index">
              <td
                class="px-4 py-3 whitespace-nowrap text-sm text-white font-mono"
              >
                <BufferDisplay :value="item.key" :show-title="false" :auto-detect-numeric="false" />
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                {{ getActionLabel(item.value.action) }}
              </td>
              <td
                class="px-4 py-3 whitespace-nowrap text-sm text-white font-mono"
              >
                <span v-if="item.value.bytes">
                  <BufferDisplay
                    :value="item.value.bytes"
                    :show-title="false"
                  />
                </span>
                <span v-else-if="item.value.uint !== undefined">
                  {{ item.value.uint }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import { useI18n } from "vue-i18n";
import BufferDisplay from "../BufferDisplay.vue";

const { t } = useI18n();

defineProps({
  title: {
    type: String,
    required: true,
  },
  delta: {
    type: Array as PropType<any[]>,
    required: true,
  },
});

const getActionLabel = (action: number) => {
  // 1: SetBytes, 2: SetUint, 3: Delete
  switch (action) {
    case 1:
      return t("transaction.setBytes");
    case 2:
      return t("transaction.setUint");
    case 3:
      return t("transaction.delete");
    default:
      return t("common.unknown");
  }
};
</script>
