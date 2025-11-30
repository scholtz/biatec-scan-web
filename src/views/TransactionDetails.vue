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

      <!-- Transaction Header -->
      <TransactionHeader :transaction="transaction" />

      <!-- Transaction ID -->
      <TransactionIdSection :transaction="transaction" />

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
import { useRoute } from "vue-router";
import { algorandService } from "../services/algorandService";
import algosdk from "algosdk";
import TransactionHeader from "../components/transaction/TransactionHeader.vue";
import TransactionIdSection from "../components/transaction/TransactionIdSection.vue";
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
const transaction = ref<algosdk.indexerModels.Transaction | null>(null);
const rootTransaction = ref<algosdk.indexerModels.Transaction | null>(null);
const isLoading = ref(true);

const rootTxId = computed(() => {
  return (route.params.txId as string) || "";
});

const isInnerTransaction = computed(() => {
  return !!route.params.innerPath;
});

const loadTransaction = async (txId: string, innerPath?: string) => {
  isLoading.value = true;
  try {
    // Always fetch the root transaction first
    const txData = await algorandService.getTransaction(txId);
    rootTransaction.value = txData;

    if (innerPath) {
      // Navigate to the inner transaction
      const indices = innerPath.split("/").map(Number);
      let currentTx: any = txData;

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
