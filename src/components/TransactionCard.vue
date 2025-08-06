<template>
  <div class="card">
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

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <p class="text-sm text-gray-400 mb-1">From</p>
        <p
          class="text-white font-mono text-sm bg-dark-900 p-2 rounded border truncate"
        >
          {{ algorandService.formatAddress(transaction.sender) }}
        </p>
      </div>
      <div v-if="getReceiver(transaction)">
        <p class="text-sm text-gray-400 mb-1">To</p>
        <p
          class="text-white font-mono text-sm bg-dark-900 p-2 rounded border truncate"
        >
          {{ algorandService.formatAddress(getReceiver(transaction) || "") }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p class="text-sm text-gray-400 mb-1">Fee</p>
        <p class="text-white font-medium">
          {{ algorandService.formatAlgoAmount(transaction.fee) }} ALGO
        </p>
      </div>
      <div v-if="getAmount(transaction)">
        <p class="text-sm text-gray-400 mb-1">Amount</p>
        <p class="text-white font-medium">{{ getAmount(transaction) }}</p>
      </div>
    </div>

    <div class="mb-4">
      <p class="text-sm text-gray-400 mb-1">Transaction ID</p>
      <p
        class="text-white font-mono text-xs bg-dark-900 p-2 rounded border truncate"
      >
        {{ transaction.id }}
      </p>
    </div>

    <div class="flex justify-between items-center">
      <span class="status-badge status-success"> Confirmed </span>
      <router-link
        :to="{ name: 'TransactionDetails', params: { txId: transaction.id } }"
        class="btn-primary text-sm"
      >
        View Details
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

const getAmount = (tx: AlgorandTransaction) => {
  if (tx["payment-transaction"]) {
    return `${algorandService.formatAlgoAmount(tx["payment-transaction"].amount)} ALGO`;
  }
  if (tx["asset-transfer-transaction"]) {
    return `${tx["asset-transfer-transaction"].amount.toLocaleString()} (Asset #${tx["asset-transfer-transaction"]["asset-id"]})`;
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
