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
              <BufferDisplay
                v-else
                :value="uintToBytes(item.value.uint)"
                default-encoding="numeric"
                :allowUTF8="false"
              />
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

// AVM global/local state uints are 64-bit; encode big-endian so BufferDisplay's
// own big-endian numeric decoder round-trips it, and hex/base64 toggles show
// the same bytes the chain actually stores.
const UINT64_BYTE_LENGTH = 8;

const uintToBytes = (value: bigint): Uint8Array => {
  const bytes = new Uint8Array(UINT64_BYTE_LENGTH);
  let remaining = value;
  for (let i = UINT64_BYTE_LENGTH - 1; i >= 0; i--) {
    bytes[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return bytes;
};
</script>
