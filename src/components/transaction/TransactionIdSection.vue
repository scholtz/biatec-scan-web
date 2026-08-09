<template>
  <div class="card mb-6">
    <h2 class="text-xl font-semibold text-white mb-3">
      {{ $t("transaction.txId") }}
    </h2>
    <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
      <p class="text-white font-mono text-sm break-all">
        {{ transaction.id || "-" }}
      </p>
    </div>
    <div v-if="transaction.group && round" class="mt-4">
      <h3 class="text-sm text-gray-400 mb-2">
        {{ $t("group.groupId") }}
      </h3>
      <div
        class="bg-dark-900 p-4 rounded-lg border border-gray-700 flex items-center justify-between flex-wrap gap-2"
      >
        <router-link
          :to="groupRoute(round, transaction.group)"
          class="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
        >
          {{ groupBytesToBase64(transaction.group) }}
        </router-link>
        <router-link
          :to="groupRoute(round, transaction.group)"
          class="text-xs text-blue-400 hover:text-blue-300 border border-blue-400/30 px-2 py-1 rounded hover:bg-blue-400/10 transition-colors whitespace-nowrap"
        >
          {{ $t("group.viewGroup") }}
        </router-link>
      </div>
    </div>
    <div v-if="transaction.note" class="mt-4">
      <BufferDisplay
        :value="transaction.note"
        :title="$t('transaction.note')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import algosdk from "algosdk";
import BufferDisplay from "../BufferDisplay.vue";
import { groupBytesToBase64, groupRoute } from "../../utils/groupUtils";

defineProps({
  transaction: {
    type: Object as PropType<algosdk.indexerModels.Transaction>,
    required: true,
  },
  // Confirmed round of the (root) transaction — inner transactions don't
  // carry one themselves, so the parent view passes the root's round.
  round: {
    type: BigInt as unknown as PropType<bigint>, // Vue prop types take constructors; BigInt isn't one, so it needs this bridge cast
    required: false,
    default: undefined,
  },
});
</script>
