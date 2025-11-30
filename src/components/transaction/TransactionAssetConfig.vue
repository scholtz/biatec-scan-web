<template>
  <div
    v-if="transaction.assetConfigTransaction"
    class="card mb-6 bg-gradient-to-br from-orange-900/20 to-dark-800 border-orange-700"
  >
    <h2 class="text-xl font-semibold text-orange-400 mb-4 flex items-center">
      <span class="mr-2">🔧</span> {{ $t("transaction.type.acfg") }}
    </h2>
    <div class="space-y-6">
      <!-- Sender -->
      <div>
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.sender") }}</p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: transaction.sender },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
        >
          <p
            class="text-orange-400 font-mono text-sm break-all hover:text-orange-300"
          >
            {{ transaction.sender }}
          </p>
        </router-link>
      </div>

      <!-- Asset ID -->
      <div v-if="transaction.assetConfigTransaction.assetId">
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.assetId") }}</p>
        <router-link
          :to="{
            name: 'AssetDetails',
            params: {
              assetId: transaction.assetConfigTransaction.assetId.toString(),
            },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
        >
          <p class="text-orange-400 font-medium text-lg hover:text-orange-300">
            {{ transaction.assetConfigTransaction.assetId }}
          </p>
        </router-link>
      </div>

      <!-- Asset Parameters -->
      <div v-if="transaction.assetConfigTransaction.params">
        <p class="text-sm text-gray-400 mb-3">
          {{ $t("transaction.assetParams") }}
        </p>
        <div
          class="bg-dark-900 p-4 rounded-lg border border-gray-700 space-y-3"
        >
          <div
            v-if="transaction.assetConfigTransaction.params.name"
            class="grid grid-cols-3 gap-2"
          >
            <span class="text-gray-400 text-sm">{{ $t("common.name") }}:</span>
            <span class="text-white col-span-2">{{
              transaction.assetConfigTransaction.params.name
            }}</span>
          </div>
          <div
            v-if="transaction.assetConfigTransaction.params.unitName"
            class="grid grid-cols-3 gap-2"
          >
            <span class="text-gray-400 text-sm"
              >{{ $t("common.unitName") }}:</span
            >
            <span class="text-white col-span-2">{{
              transaction.assetConfigTransaction.params.unitName
            }}</span>
          </div>
          <div
            v-if="transaction.assetConfigTransaction.params.total !== undefined"
            class="grid grid-cols-3 gap-2"
          >
            <span class="text-gray-400 text-sm">{{ $t("common.total") }}:</span>
            <span class="text-white col-span-2">{{
              transaction.assetConfigTransaction.params.total.toLocaleString()
            }}</span>
          </div>
          <div
            v-if="
              transaction.assetConfigTransaction.params.decimals !== undefined
            "
            class="grid grid-cols-3 gap-2"
          >
            <span class="text-gray-400 text-sm"
              >{{ $t("common.decimals") }}:</span
            >
            <span class="text-white col-span-2">{{
              transaction.assetConfigTransaction.params.decimals
            }}</span>
          </div>
          <div
            v-if="transaction.assetConfigTransaction.params.url"
            class="grid grid-cols-3 gap-2"
          >
            <span class="text-gray-400 text-sm">{{ $t("common.url") }}:</span>
            <a
              :href="transaction.assetConfigTransaction.params.url"
              target="_blank"
              class="text-orange-400 hover:text-orange-300 col-span-2 break-all"
            >
              {{ transaction.assetConfigTransaction.params.url }}
            </a>
          </div>
        </div>

        <!-- Asset Addresses -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div v-if="transaction.assetConfigTransaction.params.manager">
            <p class="text-sm text-gray-400 mb-2">
              {{ $t("transaction.manager") }}
            </p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: {
                  address: transaction.assetConfigTransaction.params.manager,
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
            >
              <p
                class="text-orange-400 font-mono text-xs break-all hover:text-orange-300"
              >
                {{ transaction.assetConfigTransaction.params.manager }}
              </p>
            </router-link>
          </div>
          <div v-if="transaction.assetConfigTransaction.params.reserve">
            <p class="text-sm text-gray-400 mb-2">
              {{ $t("transaction.reserve") }}
            </p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: {
                  address: transaction.assetConfigTransaction.params.reserve,
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
            >
              <p
                class="text-orange-400 font-mono text-xs break-all hover:text-orange-300"
              >
                {{ transaction.assetConfigTransaction.params.reserve }}
              </p>
            </router-link>
          </div>
          <div v-if="transaction.assetConfigTransaction.params.freeze">
            <p class="text-sm text-gray-400 mb-2">
              {{ $t("transaction.freeze") }}
            </p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: {
                  address: transaction.assetConfigTransaction.params.freeze,
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
            >
              <p
                class="text-orange-400 font-mono text-xs break-all hover:text-orange-300"
              >
                {{ transaction.assetConfigTransaction.params.freeze }}
              </p>
            </router-link>
          </div>
          <div v-if="transaction.assetConfigTransaction.params.clawback">
            <p class="text-sm text-gray-400 mb-2">
              {{ $t("transaction.clawback") }}
            </p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: {
                  address: transaction.assetConfigTransaction.params.clawback,
                },
              }"
              class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
            >
              <p
                class="text-orange-400 font-mono text-xs break-all hover:text-orange-300"
              >
                {{ transaction.assetConfigTransaction.params.clawback }}
              </p>
            </router-link>
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
