<template>
  <div
    v-if="transaction.paymentTransaction"
    class="card mb-6 bg-gradient-to-br from-green-900/20 to-dark-800 border-green-700"
  >
    <h2 class="text-xl font-semibold text-green-400 mb-4 flex items-center">
      <span class="mr-2">💸</span> {{ $t("transaction.type.pay") }}
    </h2>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.from") }}</p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: transaction.sender },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
        >
          <p
            class="text-green-400 font-mono text-sm break-all hover:text-green-300"
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
              address: transaction.paymentTransaction.receiver,
            },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
        >
          <p
            class="text-green-400 font-mono text-sm break-all hover:text-green-300"
          >
            {{ transaction.paymentTransaction.receiver }}
          </p>
        </router-link>
      </div>
      <div class="lg:col-span-2">
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.amount") }}</p>
        <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
          <p class="text-3xl font-bold text-green-400">
            {{
              algorandService.formatAlgoAmount(
                transaction.paymentTransaction.amount
              )
            }}
            ALGO
          </p>
        </div>
      </div>
      <div
        v-if="transaction.paymentTransaction.closeRemainderTo"
        class="lg:col-span-2"
      >
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.closeRemainderTo") }}
        </p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: {
              address: transaction.paymentTransaction.closeRemainderTo,
            },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
        >
          <p
            class="text-green-400 font-mono text-sm break-all hover:text-green-300"
          >
            {{ transaction.paymentTransaction.closeRemainderTo }}
          </p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import algosdk from "algosdk";
import { algorandService } from "../../services/algorandService";

defineProps({
  transaction: {
    type: Object as PropType<algosdk.indexerModels.Transaction>,
    required: true,
  },
});
</script>
