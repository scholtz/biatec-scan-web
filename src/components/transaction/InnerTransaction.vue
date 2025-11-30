<template>
  <div class="mt-4 p-4 bg-dark-800 rounded-lg border border-gray-700">
    <div class="flex items-center justify-between mb-2">
      <span class="text-purple-400 font-semibold">
        {{ $t(`transaction.type.${transaction.txType}`) || transaction.txType }}
      </span>
      <span class="text-xs text-gray-500">{{
        $t("transaction.innerTransaction")
      }}</span>
    </div>

    <!-- Global State Delta -->
    <TransactionStateDelta
      v-if="
        transaction.globalStateDelta && transaction.globalStateDelta.length > 0
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
        class="mt-2"
      >
        <p class="text-sm text-gray-400 mb-1">
          {{ $t("transaction.localStateDelta") }} - {{ localDelta.address }}
        </p>
        <TransactionStateDelta :title="''" :delta="localDelta.delta" />
      </div>
    </div>

    <!-- Recursive Inner Transactions -->
    <div
      v-if="transaction.innerTxns && transaction.innerTxns.length > 0"
      class="ml-4 border-l-2 border-gray-700 pl-4"
    >
      <InnerTransaction
        v-for="(innerTx, index) in transaction.innerTxns"
        :key="index"
        :transaction="innerTx"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import TransactionStateDelta from "./TransactionStateDelta.vue";

defineProps({
  transaction: {
    type: Object as PropType<any>,
    required: true,
  },
});
</script>
