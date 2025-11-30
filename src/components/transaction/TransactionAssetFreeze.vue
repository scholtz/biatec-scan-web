<template>
  <div
    v-if="transaction.assetFreezeTransaction"
    class="card mb-6 bg-gradient-to-br from-cyan-900/20 to-dark-800 border-cyan-700"
  >
    <h2 class="text-xl font-semibold text-cyan-400 mb-4 flex items-center">
      <span class="mr-2">❄️</span> {{ $t("transaction.type.afrz") }}
    </h2>
    <div class="space-y-4">
      <!-- Sender -->
      <div>
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.freezeAuthority") }}
        </p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: transaction.sender },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-cyan-500 transition-colors"
        >
          <p
            class="text-cyan-400 font-mono text-sm break-all hover:text-cyan-300"
          >
            {{ transaction.sender }}
          </p>
        </router-link>
      </div>

      <!-- Target Address -->
      <div>
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.targetAddress") }}
        </p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: {
              address: transaction.assetFreezeTransaction.address,
            },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-cyan-500 transition-colors"
        >
          <p
            class="text-cyan-400 font-mono text-sm break-all hover:text-cyan-300"
          >
            {{ transaction.assetFreezeTransaction.address }}
          </p>
        </router-link>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Asset ID -->
        <div>
          <p class="text-sm text-gray-400 mb-2">{{ $t("common.assetId") }}</p>
          <router-link
            :to="{
              name: 'AssetDetails',
              params: {
                assetId: transaction.assetFreezeTransaction.assetId.toString(),
              },
            }"
            class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-cyan-500 transition-colors"
          >
            <p class="text-cyan-400 font-medium text-lg hover:text-cyan-300">
              {{ transaction.assetFreezeTransaction.assetId }}
            </p>
          </router-link>
        </div>

        <!-- Freeze Status -->
        <div>
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.newFreezeStatus") }}
          </p>
          <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p
              class="text-lg font-bold"
              :class="
                transaction.assetFreezeTransaction.newFreezeStatus
                  ? 'text-red-400'
                  : 'text-green-400'
              "
            >
              {{
                transaction.assetFreezeTransaction.newFreezeStatus
                  ? $t("transaction.frozen")
                  : $t("transaction.unfrozen")
              }}
            </p>
          </div>
        </div>
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
