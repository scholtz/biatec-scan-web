<template>
  <div
    v-if="
      !transaction.paymentTransaction &&
      !transaction.assetTransferTransaction &&
      !transaction.applicationTransaction &&
      !transaction.assetConfigTransaction &&
      !transaction.assetFreezeTransaction &&
      !transaction.keyregTransaction &&
      transaction.sender
    "
    class="card mb-6"
  >
    <h2 class="text-xl font-semibold text-white mb-4">
      {{ $t("transaction.participants") }}
    </h2>
    <div class="grid grid-cols-1 gap-4">
      <div>
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.sender") }}</p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: transaction.sender },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors"
        >
          <p
            class="text-primary-400 font-mono text-sm break-all hover:text-primary-300"
          >
            {{ transaction.sender }}
          </p>
        </router-link>
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
