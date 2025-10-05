<template>
  <div class="card hover:shadow-lg transition-shadow">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center"
          :class="getTypeColor(transaction['tx-type'])"
        >
          <span class="font-semibold text-sm">{{
            getTypeIcon(transaction["tx-type"])
          }}</span>
        </div>
        <div>
          <h3 class="font-medium text-white">
            {{ getTypeLabel(transaction["tx-type"]) }}
          </h3>
          <p class="text-xs text-gray-400">
            Block #{{ transaction["confirmed-round"]?.toLocaleString() }}
          </p>
        </div>
      </div>
      <span class="text-xs text-gray-400">
        {{ formatTime(transaction["round-time"]) }}
      </span>
    </div>

    <div class="grid grid-cols-1 gap-3 mb-4">
      <!-- Sender - Always show -->
      <div v-if="transaction.sender">
        <p class="text-xs text-gray-400 mb-1">From</p>
        <router-link
          :to="{ name: 'AddressDetails', params: { address: transaction.sender } }"
          class="block text-primary-400 hover:text-primary-300 font-mono text-sm bg-dark-900 p-2 rounded border border-gray-700 hover:border-primary-500 transition-colors truncate"
        >
          {{ algorandService.formatAddress(transaction.sender) }}
        </router-link>
      </div>

      <!-- Receiver - Show for pay and axfer -->
      <div v-if="getReceiver(transaction)">
        <p class="text-xs text-gray-400 mb-1">To</p>
        <router-link
          :to="{ name: 'AddressDetails', params: { address: getReceiver(transaction) || '' } }"
          class="block text-primary-400 hover:text-primary-300 font-mono text-sm bg-dark-900 p-2 rounded border border-gray-700 hover:border-primary-500 transition-colors truncate"
        >
          {{ algorandService.formatAddress(getReceiver(transaction) || "") }}
        </router-link>
      </div>

      <!-- Amount and Asset Info -->
      <div v-if="getAmount(transaction)" class="bg-gradient-to-r from-green-900/20 to-blue-900/20 p-3 rounded-lg border border-gray-700">
        <p class="text-xs text-gray-400 mb-1">Amount</p>
        <p class="text-white font-semibold">{{ getAmount(transaction) }}</p>
        <router-link
          v-if="getAssetId(transaction)"
          :to="{ name: 'AssetDetails', params: { assetId: getAssetId(transaction) } }"
          class="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
        >
          View Asset →
        </router-link>
      </div>

      <!-- App ID for app calls -->
      <div v-if="transaction['application-transaction']" class="bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-3 rounded-lg border border-gray-700">
        <p class="text-xs text-gray-400 mb-1">Application</p>
        <router-link
          v-if="transaction['application-transaction']['application-id']"
          :to="{ name: 'ApplicationDetails', params: { appId: transaction['application-transaction']['application-id'] } }"
          class="text-white font-semibold hover:text-purple-300 transition-colors"
        >
          App #{{ transaction["application-transaction"]["application-id"] }} →
        </router-link>
        <p v-else class="text-white font-semibold">Create New App</p>
      </div>
    </div>

    <div class="flex justify-between items-center pt-3 border-t border-gray-700">
      <div class="text-xs text-gray-400">
        Fee: {{ algorandService.formatAlgoAmount(transaction.fee) }} ALGO
      </div>
      <router-link
        :to="{ name: 'TransactionDetails', params: { txId: transaction.id } }"
        class="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
      >
        Details →
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AlgorandTransaction } from "../types/algorand";
import { algorandService } from "../services/algorandService";

defineProps<{
  transaction: AlgorandTransaction;
}>();

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    pay: "Payment",
    axfer: "Asset Transfer",
    appl: "App Call",
    acfg: "Asset Config",
    afrz: "Asset Freeze",
    keyreg: "Key Registration",
    stpf: "State Proof",
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
    stpf: "🔐",
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
    stpf: "bg-yellow-600",
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

const getAmount = (tx: AlgorandTransaction) => {
  if (tx["payment-transaction"]) {
    return `${algorandService.formatAlgoAmount(tx["payment-transaction"].amount)} ALGO`;
  }
  if (tx["asset-transfer-transaction"]) {
    return `${tx["asset-transfer-transaction"].amount.toLocaleString()} units`;
  }
  return null;
};

const getAssetId = (tx: AlgorandTransaction) => {
  if (tx["asset-transfer-transaction"]) {
    return tx["asset-transfer-transaction"]["asset-id"];
  }
  return null;
};

const formatTime = (timestamp: number) => {
  if (!timestamp) return "Unknown";
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
</script>
