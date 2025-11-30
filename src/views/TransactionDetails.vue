<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="transaction">
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
import { ref, onMounted, watch } from "vue";
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
const isLoading = ref(true);

const loadTransaction = async (txId: string) => {
  isLoading.value = true;
  try {
    const txData = await algorandService.getTransaction(txId);
    transaction.value = txData;
  } catch (error) {
    console.error("Error loading transaction:", error);
    transaction.value = null;
  }
  isLoading.value = false;
};

watch(
  () => route.params.txId,
  (newTxId) => {
    if (newTxId) {
      loadTransaction(newTxId as string);
    }
  }
);

onMounted(() => {
  const txId = route.params.txId as string;
  if (txId) {
    loadTransaction(txId);
  }
});
</script>
