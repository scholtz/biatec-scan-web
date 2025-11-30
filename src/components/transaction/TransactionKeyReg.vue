<template>
  <div
    v-if="transaction.keyregTransaction"
    class="card mb-6 bg-gradient-to-br from-pink-900/20 to-dark-800 border-pink-700"
  >
    <h2 class="text-xl font-semibold text-pink-400 mb-4 flex items-center">
      <span class="mr-2">🔑</span> {{ $t("transaction.type.keyreg") }}
    </h2>
    <div class="space-y-4">
      <!-- Sender -->
      <div>
        <p class="text-sm text-gray-400 mb-2">{{ $t("common.account") }}</p>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: transaction.sender },
          }"
          class="block bg-dark-900 p-3 rounded-lg border border-gray-700 hover:border-pink-500 transition-colors"
        >
          <p
            class="text-pink-400 font-mono text-sm break-all hover:text-pink-300"
          >
            {{ transaction.sender }}
          </p>
        </router-link>
      </div>

      <div
        v-if="transaction.keyregTransaction.nonParticipation"
        class="bg-dark-900 p-4 rounded-lg border border-gray-700"
      >
        <p class="text-pink-400 font-medium text-lg">
          {{ $t("transaction.nonParticipation") }}
        </p>
        <p class="text-gray-400 text-sm mt-1">
          {{ $t("transaction.nonParticipationDesc") }}
        </p>
      </div>

      <div v-else class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="transaction.keyregTransaction.voteFirstValid">
            <p class="text-sm text-gray-400 mb-2">
              {{ $t("transaction.voteFirstValid") }}
            </p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ transaction.keyregTransaction.voteFirstValid }}
              </p>
            </div>
          </div>
          <div v-if="transaction.keyregTransaction.voteLastValid">
            <p class="text-sm text-gray-400 mb-2">
              {{ $t("transaction.voteLastValid") }}
            </p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ transaction.keyregTransaction.voteLastValid }}
              </p>
            </div>
          </div>
          <div v-if="transaction.keyregTransaction.voteKeyDilution">
            <p class="text-sm text-gray-400 mb-2">
              {{ $t("transaction.voteKeyDilution") }}
            </p>
            <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
              <p class="text-white font-medium">
                {{ transaction.keyregTransaction.voteKeyDilution }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="transaction.keyregTransaction.voteParticipationKey">
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.voteParticipationKey") }}
          </p>
          <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p class="text-white font-mono text-xs break-all">
              {{ transaction.keyregTransaction.voteParticipationKey }}
            </p>
          </div>
        </div>

        <div v-if="transaction.keyregTransaction.selectionParticipationKey">
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.selectionParticipationKey") }}
          </p>
          <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p class="text-white font-mono text-xs break-all">
              {{ transaction.keyregTransaction.selectionParticipationKey }}
            </p>
          </div>
        </div>

        <div v-if="transaction.keyregTransaction.stateProofKey">
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.stateProofKey") }}
          </p>
          <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p class="text-white font-mono text-xs break-all">
              {{ transaction.keyregTransaction.stateProofKey }}
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
