<template>
  <div class="card mb-6">
    <h2 class="text-xl font-semibold text-white mb-4">
      {{ $t("transaction.technicalDetails") }}
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.genesisId") }}
        </p>
        <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
          <p class="text-white font-mono text-sm">
            {{ transaction.genesisId || "-" }}
          </p>
        </div>
      </div>
      <div>
        <p class="text-sm text-gray-400 mb-2">{{ $t("transaction.txType") }}</p>
        <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
          <p class="text-white font-medium">{{ transaction.txType }}</p>
        </div>
      </div>
      <div>
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.intraRoundOffset") }}
        </p>
        <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
          <p class="text-white font-medium">
            {{ transaction.intraRoundOffset }}
          </p>
        </div>
      </div>
      <div v-if="transaction.senderRewards">
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.senderRewards") }}
        </p>
        <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
          <p class="text-white font-medium">
            {{ algorandService.formatAlgoAmount(transaction.senderRewards) }}
            ALGO
          </p>
        </div>
      </div>
      <div v-if="transaction.receiverRewards">
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.receiverRewards") }}
        </p>
        <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
          <p class="text-white font-medium">
            {{ algorandService.formatAlgoAmount(transaction.receiverRewards) }}
            ALGO
          </p>
        </div>
      </div>
      <div v-if="transaction.closeRewards">
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.closeRewards") }}
        </p>
        <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
          <p class="text-white font-medium">
            {{ algorandService.formatAlgoAmount(transaction.closeRewards) }}
            ALGO
          </p>
        </div>
      </div>
      <div v-if="transaction.closingAmount">
        <p class="text-sm text-gray-400 mb-2">
          {{ $t("transaction.closingAmount") }}
        </p>
        <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
          <p class="text-white font-medium">
            {{ algorandService.formatAlgoAmount(transaction.closingAmount) }}
            ALGO
          </p>
        </div>
      </div>
      <div class="md:col-span-2">
        <BufferDisplay
          v-if="transaction.genesisHash"
          :value="transaction.genesisHash"
          :title="$t('transaction.genesisHash')"
          default-encoding="hex"
        />
        <div v-else>
          <p class="text-sm text-gray-400 mb-2">
            {{ $t("transaction.genesisHash") }}
          </p>
          <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
            <p class="text-white font-mono text-sm">-</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import algosdk from "algosdk";
import { algorandService } from "../../services/algorandService";
import BufferDisplay from "../BufferDisplay.vue";

defineProps({
  transaction: {
    type: Object as PropType<algosdk.indexerModels.Transaction>,
    required: true,
  },
});
</script>
