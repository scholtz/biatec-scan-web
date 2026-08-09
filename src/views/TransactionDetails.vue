<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="transaction">
      <!-- Back to Parent Link -->
      <div v-if="isInnerTransaction" class="mb-4">
        <router-link
          :to="{ name: 'TransactionDetails', params: { txId: rootTxId } }"
          class="flex items-center text-blue-400 hover:text-blue-300"
        >
          <span class="mr-2">←</span> {{ $t("transaction.backToParent") }}
        </router-link>
      </div>

      <!-- Address Transaction Filter Context -->
      <div v-if="contextAddress" class="card mb-6 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="text-xl font-semibold text-white">
            {{ $t("transaction.addressContextTitle") }}
          </h2>
          <router-link
            :to="{
              name: 'AddressDetails',
              params: { address: contextAddress },
              query: txFilterToQuery(txFilter),
            }"
            class="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
          >
            {{ contextAddress }}
          </router-link>
        </div>

        <TransactionFilterBar v-model="txFilter" />

        <div
          v-if="addressTx.loading.value && addressTx.pagedTransactions.value.length === 0"
          class="text-center py-4 text-gray-400 text-sm"
        >
          <div
            class="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
          ></div>
          {{ $t("common.loading") }}
        </div>

        <div
          v-else-if="addressTx.pagedTransactions.value.length === 0"
          class="text-center py-4 text-gray-400 text-sm"
        >
          {{ $t("addressDetails.noTransactions") }}
        </div>

        <div v-else class="space-y-2">
          <AddressTransactionRow
            v-for="tx in addressTx.pagedTransactions.value"
            :key="tx.id"
            :tx="tx"
            :link-query="txLinkQuery"
            :is-current="tx.id === transaction.id"
          />
        </div>

        <div class="flex justify-between items-center pt-1">
          <button
            :disabled="addressTx.page.value === 0"
            @click="addressTx.prev"
            class="btn-secondary text-sm"
          >
            {{ $t("common.prev") }}
          </button>
          <span class="text-xs text-gray-400">
            {{ $t("common.page") }} {{ addressTx.page.value + 1 }}
          </span>
          <button
            :disabled="!addressTx.canGoNext.value || addressTx.loading.value"
            @click="addressTx.next"
            class="btn-secondary text-sm"
          >
            {{
              addressTx.loading.value ? $t("common.loading") : $t("common.next")
            }}
          </button>
        </div>
      </div>

      <!-- Transaction Header -->
      <TransactionHeader :transaction="transaction" />

      <!-- Transaction ID -->
      <TransactionIdSection :transaction="transaction" />

      <!-- Balance Impact -->
      <TransactionBalanceImpact :transaction="transaction" />

      <!-- Payment Transaction Details -->
      <TransactionPayment :transaction="transaction" />

      <!-- Asset Transfer Transaction Details -->
      <TransactionAssetTransfer :transaction="transaction" />

      <!-- Asset Configuration Transaction Details -->
      <TransactionAssetConfig :transaction="transaction" />

      <!-- Asset Freeze Transaction Details -->
      <TransactionAssetFreeze :transaction="transaction" />

      <!-- Key Registration Transaction Details -->
      <TransactionKeyReg :transaction="transaction" />

      <!-- State Proof Transaction Details -->
      <TransactionStateProof :transaction="transaction" />

      <!-- Sender/Receiver for All Transactions -->
      <TransactionParticipants :transaction="transaction" />

      <!-- Technical Details -->
      <TransactionTechnicalDetails :transaction="transaction" />

      <!-- Application Call Details -->
      <TransactionApplication :transaction="transaction" />

      <!-- External Links -->
      <div class="card mt-6">
        <h2 class="text-xl font-semibold mb-4 text-white">
          {{ $t("common.externalLinks") }}
        </h2>
        <div class="flex flex-wrap gap-4">
          <a
            :href="`https://allo.info/tx/${transaction.id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Allo <span class="text-xs">↗</span>
          </a>
          <a
            :href="`https://lora.algokit.io/mainnet/transaction/${transaction.id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Lora <span class="text-xs">↗</span>
          </a>
          <a
            :href="`https://explorer.perawallet.app/tx/${transaction.id}/`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Pera <span class="text-xs">↗</span>
          </a>
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-12">
      <h2 class="text-xl font-semibold text-white mb-2">
        {{ $t("transaction.notFound") }}
      </h2>
      <p class="text-gray-400 mb-4">
        {{ $t("transaction.notFoundDesc") }}
      </p>
      <router-link to="/" class="btn-primary">{{
        $t("common.backToDashboard")
      }}</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { algorandService } from "../services/algorandService";
import algosdk from "algosdk";
import TransactionFilterBar from "../components/address/TransactionFilterBar.vue";
import AddressTransactionRow from "../components/address/AddressTransactionRow.vue";
import { useAddressTransactions } from "../composables/useAddressTransactions";
import {
  txFilterFromQuery,
  txFilterToQuery,
  type TxFilterState,
} from "../utils/txFilter";
import TransactionHeader from "../components/transaction/TransactionHeader.vue";
import TransactionIdSection from "../components/transaction/TransactionIdSection.vue";
import TransactionBalanceImpact from "../components/transaction/TransactionBalanceImpact.vue";
import TransactionPayment from "../components/transaction/TransactionPayment.vue";
import TransactionAssetTransfer from "../components/transaction/TransactionAssetTransfer.vue";
import TransactionAssetConfig from "../components/transaction/TransactionAssetConfig.vue";
import TransactionAssetFreeze from "../components/transaction/TransactionAssetFreeze.vue";
import TransactionKeyReg from "../components/transaction/TransactionKeyReg.vue";
import TransactionStateProof from "../components/transaction/TransactionStateProof.vue";
import TransactionParticipants from "../components/transaction/TransactionParticipants.vue";
import TransactionTechnicalDetails from "../components/transaction/TransactionTechnicalDetails.vue";
import TransactionApplication from "../components/transaction/TransactionApplication.vue";

const route = useRoute();
const router = useRouter();
const transaction = ref<algosdk.indexerModels.Transaction | null>(null);
const rootTransaction = ref<algosdk.indexerModels.Transaction | null>(null);
const isLoading = ref(true);

const rootTxId = computed(() => {
  return (route.params.txId as string) || "";
});

const isInnerTransaction = computed(() => {
  return !!route.params.innerPath;
});

// Address filter context: when arriving from an address's (filtered)
// transaction list, keep that address + filter visible and usable here too.
const contextAddress = computed(() => (route.query.address as string) || "");
const txFilter = ref<TxFilterState>(txFilterFromQuery(route.query));
const addressTx = useAddressTransactions(contextAddress, txFilter);

const txLinkQuery = computed(() => ({
  address: contextAddress.value,
  ...txFilterToQuery(txFilter.value),
}));

watch(
  txFilter,
  (filter) => {
    router.replace({ query: { ...route.query, ...txFilterToQuery(filter) } });
  },
  { deep: true },
);

watch(
  contextAddress,
  (addr) => {
    if (addr) void addressTx.reset();
  },
  { immediate: true },
);

const loadTransaction = async (txId: string, innerPath?: string) => {
  isLoading.value = true;
  try {
    // Always fetch the root transaction first
    const txData = await algorandService.getTransaction(txId);
    rootTransaction.value = txData;

    if (innerPath) {
      // Navigate to the inner transaction
      const indices = innerPath.split("/").map(Number);
      let currentTx: algosdk.indexerModels.Transaction | null = txData;

      for (const index of indices) {
        if (currentTx && currentTx.innerTxns && currentTx.innerTxns[index]) {
          currentTx = currentTx.innerTxns[index];
        } else {
          console.error("Inner transaction not found at path:", innerPath);
          transaction.value = null;
          isLoading.value = false;
          return;
        }
      }
      transaction.value = currentTx;
    } else {
      transaction.value = txData;
    }
  } catch (error) {
    console.error("Error loading transaction:", error);
    transaction.value = null;
  }
  isLoading.value = false;
};

watch(
  () => [route.params.txId, route.params.innerPath],
  ([newTxId, newInnerPath]) => {
    if (newTxId) {
      loadTransaction(newTxId as string, newInnerPath as string | undefined);
    }
  }
);

onMounted(() => {
  const txId = route.params.txId as string;
  const innerPath = route.params.innerPath as string | undefined;
  if (txId) {
    loadTransaction(txId, innerPath);
  }
});
</script>
