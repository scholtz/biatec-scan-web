<template>
  <div class="card space-y-4" data-testid="application-transactions">
    <div>
      <h2 class="text-xl font-semibold text-white mb-1">
        {{ $t("applicationDetails.tabTransactions") }}
      </h2>
      <p class="text-sm text-gray-400">{{ $t("applicationDetails.transactionsHint") }}</p>
    </div>

    <div
      v-if="loading && transactions.length === 0"
      class="text-center py-6 text-gray-400 text-sm"
    >
      <div class="loading-spinner mx-auto mb-2"></div>
      {{ $t("common.loading") }}
    </div>

    <div
      v-else-if="error && transactions.length === 0"
      class="rounded-lg border border-red-500 bg-red-900/30 p-4 text-center"
      role="alert"
    >
      <p class="text-red-200 text-sm mb-3">{{ $t("applicationDetails.transactionsLoadError") }}</p>
      <button class="btn-secondary text-sm" @click="retry">
        {{ $t("applicationDetails.transactionsRetry") }}
      </button>
    </div>

    <p
      v-else-if="transactions.length === 0"
      class="text-center py-6 text-gray-400 text-sm"
      data-testid="application-transactions-empty"
    >
      {{ $t("addressDetails.noTransactions") }}
    </p>

    <div v-else class="space-y-2" :class="{ 'opacity-60': loading }">
      <AddressTransactionRow
        v-for="tx in transactions"
        :key="tx.id"
        :tx="tx"
        show-sender
      />
    </div>

    <!-- A failed "next" keeps the current page visible and offers a retry. -->
    <div
      v-if="error && transactions.length > 0"
      class="rounded-lg border border-red-500 bg-red-900/30 p-3 flex flex-wrap items-center justify-between gap-2"
      role="alert"
    >
      <span class="text-red-200 text-sm">{{ $t("applicationDetails.transactionsLoadError") }}</span>
      <button class="btn-secondary text-sm" @click="retry">
        {{ $t("applicationDetails.transactionsRetry") }}
      </button>
    </div>

    <div v-if="transactions.length > 0 || canPrev" class="flex justify-between items-center pt-1">
      <button
        :disabled="!canPrev || loading"
        @click="prev"
        class="btn-secondary text-sm"
        data-testid="application-transactions-prev"
      >
        {{ $t("common.prev") }}
      </button>
      <span class="text-xs text-gray-400" data-testid="application-transactions-page">
        {{ $t("common.page") }} {{ page }}
      </span>
      <button
        :disabled="!canNext || loading"
        @click="next"
        class="btn-secondary text-sm"
        data-testid="application-transactions-next"
      >
        {{ loading ? $t("common.loading") : $t("common.next") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useApplicationTransactions } from "../../composables/useApplicationTransactions";
import AddressTransactionRow from "../address/AddressTransactionRow.vue";

const props = defineProps<{ appId: string }>();

const { transactions, page, loading, error, canPrev, canNext, next, prev, retry } =
  useApplicationTransactions(toRef(props, "appId"));
</script>
