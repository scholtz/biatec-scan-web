<template>
  <div class="min-h-screen bg-background text-white">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-4">Address Details</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-400">Address:</span>
          <span class="font-mono text-blue-400 break-all">{{ address }}</span>
          <button
            @click="copyToClipboard"
            class="p-2 text-gray-400 hover:text-white transition-colors"
            :title="$t('addressDetails.copyAddress')"
          >
            📋
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
        ></div>
        <p class="text-gray-400">Loading address information...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-400 mb-4">{{ error }}</p>
        <button
          @click="loadAddressInfo"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          {{ $t("addressDetails.retry") }}
        </button>
      </div>

      <!-- Address Information -->
      <div v-else class="space-y-6">
        <!-- Account Balance -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Account Information</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Balance:</span>
              <span class="text-white font-mono">
                {{ formatAlgoAmount(accountInfo?.amount || 0) }} ALGO
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Min Balance:</span>
              <span class="text-white font-mono">
                {{ formatAlgoAmount(accountInfo?.["min-balance"] || 0) }} ALGO
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Round:</span>
              <span class="text-white">{{ accountInfo?.round || "N/A" }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Status:</span>
              <span class="text-white">{{
                accountInfo?.status || "Online"
              }}</span>
            </div>
          </div>
        </div>

        <!-- Assets -->
        <div
          v-if="accountInfo?.assets && accountInfo.assets.length > 0"
          class="card"
        >
          <h2 class="text-xl font-semibold mb-4">Assets</h2>
          <div class="space-y-3">
            <div
              v-for="asset in accountInfo.assets"
              :key="asset['asset-id']"
              class="flex justify-between items-center p-3 bg-gray-800 rounded"
            >
              <div>
                <span class="text-white font-medium">{{
                  getAssetName(asset["asset-id"])
                }}</span>
                <span class="text-gray-400 text-sm ml-2"
                  >(ID: {{ asset["asset-id"] }})</span
                >
              </div>
              <span class="text-white font-mono">
                {{ formatAssetAmount(asset.amount, asset["asset-id"]) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Recent Transactions</h2>
          <div
            v-if="transactions.length === 0"
            class="text-center py-8 text-gray-400"
          >
            No transactions found
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="tx in transactions"
              :key="tx.id"
              class="p-4 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
            >
              <div class="flex justify-between items-start mb-2">
                <router-link
                  :to="{ name: 'TransactionDetails', params: { txId: tx.id } }"
                  class="text-blue-400 hover:text-blue-300 font-mono text-sm"
                  v-if="tx.id"
                >
                  {{ algorandService.formatTransactionId(tx.id) }}
                </router-link>
                <span class="text-xs text-gray-400" v-if="tx.roundTime">
                  <FormattedTime
                    :timestamp="(tx.roundTime * 1000).toString()"
                  />
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-400 text-sm">{{
                  formatTransactionType(tx.txType || "unknown")
                }}</span>
                <div class="text-right">
                  <div class="text-white text-sm">
                    Round: {{ tx.confirmedRound || "N/A" }}
                  </div>
                  <div class="text-gray-400 text-xs">
                    Fee: {{ algorandService.formatAlgoAmount(tx.fee) }} ALGO
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Load More Button -->
          <div v-if="hasMoreTransactions" class="text-center mt-4">
            <button
              @click="loadMoreTransactions"
              :disabled="loadingTransactions"
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition-colors"
            >
              {{
                loadingTransactions ? t("common.loading") : t("common.loadMore")
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { algorandService } from "../services/algorandService";
import { assetService } from "../services/assetService";
import FormattedTime from "../components/FormattedTime.vue";
import algosdk from "algosdk";

const { t } = useI18n();

interface AccountAsset {
  "asset-id": number;
  amount: number;
  "is-frozen": boolean;
}

interface AccountInfo {
  amount: number;
  "min-balance": number;
  round: number;
  status: string;
  assets?: AccountAsset[];
}

const route = useRoute();
const address = computed(() => route.params.address as string);

const loading = ref(false);
const error = ref("");
const accountInfo = ref<AccountInfo | null>(null);
const transactions = ref<algosdk.indexerModels.Transaction[]>([]);
const loadingTransactions = ref(false);
const hasMoreTransactions = ref(true);
const nextToken = ref("");

const loadAddressInfo = async () => {
  if (!address.value) return;

  loading.value = true;
  error.value = "";

  try {
    // Get account information
    const accountResponse = await fetch(
      `https://mainnet-idx.algonode.cloud/v2/accounts/${address.value}`
    );

    if (!accountResponse.ok) {
      throw new Error("Address not found or invalid");
    }

    const accountData = await accountResponse.json();
    accountInfo.value = accountData.account;

    // Load initial transactions
    await loadTransactions(true);
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : "Failed to load address information";
    console.error("Error loading address info:", err);
  } finally {
    loading.value = false;
  }
};

const loadTransactions = async (reset = false) => {
  if (!address.value) return;

  loadingTransactions.value = true;

  try {
    const url = `https://mainnet-idx.algonode.cloud/v2/accounts/${address.value}/transactions?limit=20${nextToken.value ? `&next=${nextToken.value}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to load transactions");
    }

    const data = await response.json();

    if (reset) {
      transactions.value = data.transactions || [];
    } else {
      transactions.value.push(...(data.transactions || []));
    }

    nextToken.value = data["next-token"] || "";
    hasMoreTransactions.value = !!data["next-token"];
  } catch (err) {
    console.error("Error loading transactions:", err);
  } finally {
    loadingTransactions.value = false;
  }
};

const loadMoreTransactions = () => {
  loadTransactions(false);
};

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(address.value);
    // You could add a toast notification here
  } catch (err) {
    console.error("Failed to copy address:", err);
  }
};

const formatAlgoAmount = (microAlgos: number): string => {
  return algorandService.formatAlgoAmount(microAlgos);
};

const formatAssetAmount = (amount: number, assetId: number): string => {
  return assetService.formatAssetBalance(BigInt(amount), BigInt(assetId));
};

const getAssetName = (assetId: number): string => {
  const assetInfo = assetService.getAssetInfo(BigInt(assetId));
  if (!assetInfo) {
    // Request asset loading
    assetService.requestAsset(BigInt(assetId), () => {
      // Trigger re-render when asset info is loaded
    });
    return `Asset ${assetId}`;
  }
  return assetInfo.name || assetInfo.unitName || `Asset ${assetId}`;
};

const formatTransactionType = (txType: string): string => {
  const typeMap: { [key: string]: string } = {
    pay: "Payment",
    axfer: "Asset Transfer",
    acfg: "Asset Config",
    afrz: "Asset Freeze",
    appl: "Application Call",
    keyreg: "Key Registration",
  };
  return typeMap[txType] || txType;
};

onMounted(() => {
  loadAddressInfo();
});
</script>
