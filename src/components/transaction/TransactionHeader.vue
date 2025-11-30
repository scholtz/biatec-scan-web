<template>
  <div class="card mb-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center space-x-4">
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          :class="getTypeColor(transaction.txType ?? '')"
        >
          <span class="font-bold text-2xl">{{
            getTypeIcon(transaction.txType ?? "")
          }}</span>
        </div>
        <div>
          <h1 class="text-3xl font-bold text-white">
            {{ $t(`transaction.type.${transaction.txType}`) }}
          </h1>
          <p class="text-gray-400">{{ $t("transaction.details") }}</p>
        </div>
      </div>
      <span class="status-badge status-success">{{
        $t("transaction.confirmed")
      }}</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        class="bg-dark-900 p-4 rounded-lg border border-gray-700"
        v-if="transaction.confirmedRound"
      >
        <p class="text-sm text-gray-400 mb-1">{{ $t("transaction.block") }}</p>
        <router-link
          :to="{
            name: 'BlockDetails',
            params: { round: transaction.confirmedRound.toString() },
          }"
          class="text-primary-400 hover:text-primary-300 font-medium transition-colors duration-200 text-lg"
        >
          #{{ transaction.confirmedRound?.toString() }}
        </router-link>
      </div>
      <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
        <p class="text-sm text-gray-400 mb-1">{{ $t("transaction.fee") }}</p>
        <p class="text-white font-medium text-lg">
          {{ algorandService.formatAlgoAmount(transaction.fee) }} ALGO
        </p>
      </div>
      <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
        <p class="text-sm text-gray-400 mb-1">{{ $t("transaction.time") }}</p>
        <p class="text-white font-medium">
          {{
            transaction.roundTime
              ? new Date(transaction.roundTime * 1000).toLocaleString()
              : $t("common.unknown")
          }}
        </p>
      </div>
      <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
        <p class="text-sm text-gray-400 mb-1">
          {{ $t("transaction.validRounds") }}
        </p>
        <p class="text-white font-medium text-sm">
          {{ transaction.firstValid }} - {{ transaction.lastValid }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import algosdk from "algosdk";
import { algorandService } from "../../services/algorandService";
import { getTypeIcon, getTypeColor } from "../../utils/transactionUtils";

defineProps({
  transaction: {
    type: Object as PropType<algosdk.indexerModels.Transaction>,
    required: true,
  },
});
</script>
