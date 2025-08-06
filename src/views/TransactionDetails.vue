<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="transaction">
      <!-- Transaction Header -->
      <div class="card mb-8">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-4">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center"
              :class="getTypeColor(transaction['tx-type'])"
            >
              <span class="font-bold text-lg">{{
                getTypeIcon(transaction["tx-type"])
              }}</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">
                {{ getTypeLabel(transaction["tx-type"]) }}
              </h1>
              <p class="text-gray-400">Transaction Details</p>
            </div>
          </div>
          <span class="status-badge status-success">Confirmed</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p class="text-sm text-gray-400 mb-1">Block</p>
            <router-link
              :to="{
                name: 'BlockDetails',
                params: { round: transaction['confirmed-round'] },
              }"
              class="text-primary-400 hover:text-primary-300 font-medium transition-colors duration-200"
            >
              #{{ transaction["confirmed-round"]?.toLocaleString() }}
            </router-link>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-1">Fee</p>
            <p class="text-white font-medium">
              {{ algorandService.formatAlgoAmount(transaction.fee) }} ALGO
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-1">Round Time</p>
            <p class="text-white font-medium">
              {{
                transaction["round-time"]
                  ? new Date(transaction["round-time"] * 1000).toLocaleString()
                  : "Unknown"
              }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-1">Valid Rounds</p>
            <p class="text-white font-medium">
              {{ transaction["first-valid"] }} - {{ transaction["last-valid"] }}
            </p>
          </div>
        </div>
      </div>

      <!-- Transaction ID -->
      <div class="card mb-8">
        <h2 class="text-lg font-semibold text-white mb-4">Transaction ID</h2>
        <div class="bg-dark-900 p-4 rounded border">
          <p class="text-white font-mono text-sm break-all">
            {{ transaction.id }}
          </p>
        </div>
      </div>

      <!-- Transaction Details -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Sender/Receiver Info -->
        <div class="card">
          <h2 class="text-lg font-semibold text-white mb-4">Addresses</h2>
          <div class="space-y-4">
            <div>
              <p class="text-sm text-gray-400 mb-2">From</p>
              <div class="bg-dark-900 p-3 rounded border">
                <p class="text-white font-mono text-sm break-all">
                  {{ transaction.sender }}
                </p>
              </div>
            </div>
            <div v-if="getReceiver(transaction)">
              <p class="text-sm text-gray-400 mb-2">To</p>
              <div class="bg-dark-900 p-3 rounded border">
                <p class="text-white font-mono text-sm break-all">
                  {{ getReceiver(transaction) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Amount Info -->
        <div class="card">
          <h2 class="text-lg font-semibold text-white mb-4">
            Transaction Amount
          </h2>
          <div v-if="transaction['payment-transaction']" class="space-y-2">
            <p class="text-2xl font-bold text-green-400">
              {{
                algorandService.formatAlgoAmount(
                  transaction["payment-transaction"].amount
                )
              }}
              ALGO
            </p>
            <p class="text-sm text-gray-400">Payment Transaction</p>
          </div>
          <div
            v-else-if="transaction['asset-transfer-transaction']"
            class="space-y-2"
          >
            <p class="text-2xl font-bold text-blue-400">
              {{
                transaction[
                  "asset-transfer-transaction"
                ].amount.toLocaleString()
              }}
            </p>
            <p class="text-sm text-gray-400">
              Asset ID:
              {{ transaction["asset-transfer-transaction"]["asset-id"] }}
            </p>
          </div>
          <div v-else class="text-gray-400">
            No amount information available for this transaction type.
          </div>
        </div>
      </div>

      <!-- Technical Details -->
      <div class="card">
        <h2 class="text-lg font-semibold text-white mb-4">Technical Details</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-gray-400 mb-2">Genesis Hash</p>
            <div class="bg-dark-900 p-3 rounded border">
              <p class="text-white font-mono text-xs break-all">
                {{ transaction["genesis-hash"] }}
              </p>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Genesis ID</p>
            <div class="bg-dark-900 p-3 rounded border">
              <p class="text-white font-mono text-sm">
                {{ transaction["genesis-id"] }}
              </p>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Intra Round Offset</p>
            <p class="text-white font-medium">
              {{ transaction["intra-round-offset"] }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Transaction Type</p>
            <p class="text-white font-medium">{{ transaction["tx-type"] }}</p>
          </div>
        </div>
      </div>

      <!-- Application Call Details (if applicable) -->
      <div v-if="transaction['application-transaction']" class="card mt-8">
        <h2 class="text-lg font-semibold text-white mb-4">
          Application Call Details
        </h2>
        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-400 mb-1">Application ID</p>
            <p class="text-white font-medium">
              {{ transaction["application-transaction"]["application-id"] }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-1">On Completion</p>
            <p class="text-white font-medium">
              {{ transaction["application-transaction"]["on-completion"] }}
            </p>
          </div>
          <div
            v-if="
              transaction['application-transaction']['application-args']?.length
            "
          >
            <p class="text-sm text-gray-400 mb-2">Application Arguments</p>
            <div class="space-y-2">
              <div
                v-for="(arg, index) in transaction['application-transaction'][
                  'application-args'
                ]"
                :key="index"
                class="bg-dark-900 p-2 rounded border"
              >
                <p class="text-white font-mono text-xs break-all">{{ arg }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-12">
      <h2 class="text-xl font-semibold text-white mb-2">
        Transaction Not Found
      </h2>
      <p class="text-gray-400 mb-4">
        The requested transaction could not be found.
      </p>
      <router-link to="/" class="btn-primary">Back to Dashboard</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { algorandService } from "../services/algorandService";
import type { AlgorandTransaction } from "../types/algorand";

const route = useRoute();
const transaction = ref<AlgorandTransaction | null>(null);
const isLoading = ref(true);

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    pay: "Payment Transaction",
    axfer: "Asset Transfer",
    appl: "Application Call",
    acfg: "Asset Configuration",
    afrz: "Asset Freeze",
    keyreg: "Key Registration",
  };
  return labels[type] || type?.toUpperCase() || "UNKNOWN";
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    pay: "₳",
    axfer: "⇄",
    appl: "⚙",
    acfg: "🔧",
    afrz: "❄",
    keyreg: "🔑",
  };
  return icons[type] || "?";
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    pay: "bg-green-600",
    axfer: "bg-blue-600",
    appl: "bg-purple-600",
    acfg: "bg-orange-600",
    afrz: "bg-cyan-600",
    keyreg: "bg-pink-600",
  };
  return colors[type] || "bg-gray-600";
};

const getReceiver = (tx: AlgorandTransaction) => {
  if (tx["payment-transaction"]) {
    return tx["payment-transaction"].receiver;
  }
  if (tx["asset-transfer-transaction"]) {
    return tx["asset-transfer-transaction"].receiver;
  }
  return null;
};

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
