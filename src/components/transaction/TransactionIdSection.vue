<template>
  <div class="card mb-6">
    <h2 class="text-xl font-semibold text-white mb-3">
      {{ $t("transaction.txId") }}
    </h2>
    <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
      <p class="text-white font-mono text-sm break-all">
        {{ transaction.id }}
      </p>
    </div>
    <div v-if="transaction.note" class="mt-4">
      <BufferDisplay
        :value="transaction.note"
        :title="$t('transaction.note')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import algosdk from "algosdk";
import BufferDisplay from "../BufferDisplay.vue";

defineProps({
  transaction: {
    type: Object as PropType<algosdk.indexerModels.Transaction>,
    required: true,
  },
});
</script>
