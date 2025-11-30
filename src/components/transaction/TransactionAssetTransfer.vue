<template>
  <div
    v-if="transaction.assetTransferTransaction"
    class="card mb-6 bg-gradient-to-br from-blue-900/20 to-dark-800 border-blue-700"
  >
    <h2 class="text-xl font-semibold text-blue-400 mb-4 flex items-center">
      <span class="mr-2">🪙</span> {{ $t("transaction.type.axfer") }}
    </h2>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.from") }}</p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: transaction.sender },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
        >
          <p
            class="text-blue-400 font-mono text-sm break-all hover:text-blue-300"
          >
            {{ transaction.sender }}
          </p>
        </router-link>
      </div>
      <div>
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.to") }}</p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: {
              address: transaction.assetTransferTransaction.receiver,
            },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
        >
          <p
            class="text-blue-400 font-mono text-sm break-all hover:text-blue-300"
          >
            {{ transaction.assetTransferTransaction.receiver }}
          </p>
        </router-link>
      </div>
      <div>
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.assetId") }}</p>
        <router-link
          :to="{
            name: 'AssetDetails',
            params: {
              assetId: transaction.assetTransferTransaction.assetId.toString(),
            },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
        >
          <p class="text-blue-400 font-medium text-lg hover:text-blue-300">
            {{ transaction.assetTransferTransaction.assetId }}
          </p>
        </router-link>
      </div>
      <div>
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.amount") }}</p>
        <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
          <p class="text-2xl font-bold text-blue-400">
            {{ transaction.assetTransferTransaction.amount.toLocaleString() }}
          </p>
        </div>
      </div>
      <div
        v-if="transaction.assetTransferTransaction.closeTo"
        class="lg:col-span-2"
      >
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.closeAssetTo") }}
        </p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: {
              address: transaction.assetTransferTransaction.closeTo,
            },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
        >
          <p
            class="text-blue-400 font-mono text-sm break-all hover:text-blue-300"
          >
            {{ transaction.assetTransferTransaction.closeTo }}
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
