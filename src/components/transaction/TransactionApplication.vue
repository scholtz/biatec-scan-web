<template>
  <div
    v-if="transaction.applicationTransaction"
    class="card mb-6 bg-gradient-to-br from-purple-900/20 to-dark-800 border-purple-700"
  >
    <h2 class="text-xl font-semibold text-purple-400 mb-4 flex items-center">
      <span class="mr-2">⚙️</span> {{ $t("transaction.type.appl") }}
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
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
        >
          <p
            class="text-purple-400 font-mono text-sm break-all hover:text-purple-300"
          >
            {{ transaction.sender }}
          </p>
        </router-link>
      </div>

      <!-- Application ID and On Completion -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.applicationId") }}
          </p>
          <router-link
            v-if="transaction.applicationTransaction.applicationId"
            :to="{
              name: 'ApplicationDetails',
              params: {
                appId:
                  transaction.applicationTransaction.applicationId.toString(),
              },
            }"
            class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
          >
            <p
              class="text-purple-400 font-medium text-lg hover:text-purple-300"
            >
              {{ transaction.applicationTransaction.applicationId }}
            </p>
          </router-link>
          <div v-else class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p class="text-purple-400 font-medium text-lg">
              {{ $t("transaction.createNew") }}
            </p>
          </div>
        </div>
        <div>
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.onCompletion") }}
          </p>
          <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p class="text-white font-medium">
              {{ transaction.applicationTransaction.onCompletion }}
            </p>
          </div>
        </div>
      </div>

      <!-- Referenced Accounts -->
      <div
        v-if="
          transaction.applicationTransaction.accounts &&
          transaction.applicationTransaction.accounts.length > 0
        "
      >
        <p class="text-sm text-gray-400 mb-3">
          {{ $t("transaction.referencedAccounts") }} ({{
            transaction.applicationTransaction.accounts.length
          }})
        </p>
        <div class="grid grid-cols-1 gap-3">
          <router-link
            v-for="(account, index) in transaction.applicationTransaction
              .accounts"
            :key="index"
            :to="{
              name: 'AddressDetails',
              params: { address: account.toString() },
            }"
            class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
          >
            <div class="flex items-center justify-between">
              <p
                class="text-purple-400 font-mono text-sm break-all hover:text-purple-300"
              >
                {{ account }}
              </p>
              <span class="text-xs text-gray-500 ml-2"
                >{{ $t("common.account") }} {{ index + 1 }}</span
              >
            </div>
          </router-link>
        </div>
      </div>

      <!-- Foreign Apps -->
      <div
        v-if="
          transaction.applicationTransaction.foreignApps &&
          transaction.applicationTransaction.foreignApps.length > 0
        "
      >
        <p class="text-sm text-gray-400 mb-3">
          {{ $t("transaction.foreignApps") }}
        </p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            v-for="(appId, index) in transaction.applicationTransaction
              .foreignApps"
            :key="index"
            class="bg-dark-900 p-3 rounded-lg border border-gray-700"
          >
            <p class="text-xs text-gray-500 mb-1">
              {{ $t("common.app") }} {{ index + 1 }}
            </p>
            <p class="text-purple-400 font-medium">{{ appId }}</p>
          </div>
        </div>
      </div>

      <!-- Foreign Assets -->
      <div
        v-if="
          transaction.applicationTransaction.foreignAssets &&
          transaction.applicationTransaction.foreignAssets.length > 0
        "
      >
        <p class="text-sm text-gray-400 mb-3">
          {{ $t("transaction.foreignAssets") }}
        </p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <router-link
            v-for="(assetId, index) in transaction.applicationTransaction
              .foreignAssets"
            :key="index"
            :to="{
              name: 'AssetDetails',
              params: { assetId: assetId.toString() },
            }"
            class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
          >
            <p class="text-xs text-gray-500 mb-1">
              {{ $t("common.asset") }} {{ index + 1 }}
            </p>
            <p class="text-purple-400 font-medium hover:text-purple-300">
              {{ assetId }}
            </p>
          </router-link>
        </div>
      </div>

      <!-- Application Arguments -->
      <div
        v-if="
          transaction.applicationTransaction.applicationArgs &&
          transaction.applicationTransaction.applicationArgs.length > 0
        "
      >
        <p class="text-sm text-gray-400 mb-3">
          {{ $t("transaction.appArgs") }} ({{
            transaction.applicationTransaction.applicationArgs.length
          }})
        </p>
        <div class="space-y-2">
          <BufferDisplay
            v-for="(arg, index) in transaction.applicationTransaction
              .applicationArgs"
            :key="index"
            :value="arg"
            :title="`${$t('common.argument')} ${index}`"
          />
        </div>
      </div>

      <!-- Schema Information -->
      <div
        v-if="
          transaction.applicationTransaction.globalStateSchema ||
          transaction.applicationTransaction.localStateSchema
        "
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div v-if="transaction.applicationTransaction.globalStateSchema">
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.globalStateSchema") }}
          </p>
          <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p class="text-sm text-white">
              {{ $t("common.uints") }}:
              {{ transaction.applicationTransaction.globalStateSchema.numUint }}
            </p>
            <p class="text-sm text-white">
              {{ $t("common.byteSlices") }}:
              {{
                transaction.applicationTransaction.globalStateSchema
                  .numByteSlice
              }}
            </p>
          </div>
        </div>
        <div v-if="transaction.applicationTransaction.localStateSchema">
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.localStateSchema") }}
          </p>
          <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p class="text-sm text-white">
              {{ $t("common.uints") }}:
              {{ transaction.applicationTransaction.localStateSchema.numUint }}
            </p>
            <p class="text-sm text-white">
              {{ $t("common.byteSlices") }}:
              {{
                transaction.applicationTransaction.localStateSchema.numByteSlice
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Global State Delta -->
      <TransactionStateDelta
        v-if="
          transaction.globalStateDelta &&
          transaction.globalStateDelta.length > 0
        "
        :title="$t('transaction.globalStateDelta')"
        :delta="transaction.globalStateDelta"
      />

      <!-- Local State Delta -->
      <div
        v-if="
          transaction.localStateDelta && transaction.localStateDelta.length > 0
        "
      >
        <div
          v-for="(localDelta, index) in transaction.localStateDelta"
          :key="index"
          class="mt-4"
        >
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.localStateDelta") }} -
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: localDelta.address },
              }"
              class="text-purple-400 hover:text-purple-300 font-mono"
            >
              {{ localDelta.address }}
            </router-link>
          </p>
          <TransactionStateDelta :title="''" :delta="localDelta.delta" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import algosdk from "algosdk";
import BufferDisplay from "../BufferDisplay.vue";
import TransactionStateDelta from "./TransactionStateDelta.vue";

defineProps({
  transaction: {
    type: Object as PropType<algosdk.indexerModels.Transaction>,
    required: true,
  },
});
</script>
