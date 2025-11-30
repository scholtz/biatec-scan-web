<template>
  <div
    v-if="transaction.stateProofTransaction"
    class="card mb-6 bg-gradient-to-br from-yellow-900/20 to-dark-800 border-yellow-700"
  >
    <h2 class="text-xl font-semibold text-yellow-400 mb-4 flex items-center">
      <span class="mr-2">🔐</span> {{ $t("transaction.type.stpf") }}
    </h2>
    <div class="space-y-4">
      <div v-if="transaction.sender">
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.sender") }}</p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: transaction.sender },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-yellow-500 transition-colors"
        >
          <p
            class="text-yellow-400 font-mono text-sm break-all hover:text-yellow-300"
          >
            {{ transaction.sender }}
          </p>
        </router-link>
      </div>

      <div
        v-if="transaction.stateProofTransaction.stateProofType !== undefined"
      >
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.stateProofType") }}
        </p>
        <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
          <p class="text-white font-medium">
            {{ transaction.stateProofTransaction.stateProofType }}
          </p>
        </div>
      </div>

      <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
        <p class="text-gray-400 text-sm">
          {{ $t("transaction.stateProofDesc") }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import algosdk from "algosdk";

defineProps({
  transaction: {
    type: Object as PropType<algosdk.indexerModels.Transaction>,
    required: true,
  },
});
</script>
