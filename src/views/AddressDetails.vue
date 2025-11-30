<template>
  <div class="min-h-screen bg-background text-white">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-4">
          {{ $t("addressDetails.title") }}
        </h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-400">{{
            $t("addressDetails.addressLabel")
          }}</span>
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
        <p class="text-gray-400">{{ $t("addressDetails.loading") }}</p>
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
          <h2 class="text-xl font-semibold mb-4">
            {{ $t("addressDetails.accountInfo") }}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{
                $t("addressDetails.balance")
              }}</span>
              <span class="text-white font-mono">
                {{ formatAlgoAmount(accountInfo?.amount || 0) }} ALGO
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{
                $t("addressDetails.minBalance")
              }}</span>
              <span class="text-white font-mono">
                {{ formatAlgoAmount(accountInfo?.["min-balance"] || 0) }} ALGO
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{
                $t("addressDetails.round")
              }}</span>
              <span class="text-white">{{ accountInfo?.round || "N/A" }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{
                $t("addressDetails.status")
              }}</span>
              <span class="text-white">{{
                formatStatus(accountInfo?.status)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Assets -->
        <div v-if="enrichedAssets.length > 0" class="card">
          <h2 class="text-xl font-semibold mb-4">
            {{ $t("addressDetails.assets") }}
          </h2>
          <div class="space-y-3">
            <div
              v-for="asset in enrichedAssets"
              :key="asset['asset-id']"
              class="flex justify-between items-center p-3 bg-gray-800 rounded"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-white font-medium">{{ asset.name }}</span>
                  <span
                    class="text-gray-400 text-sm"
                    v-if="asset['asset-id'] !== 0"
                    >(ID: {{ asset["asset-id"] }})</span
                  >
                </div>
                <div class="text-xs text-gray-500" v-if="asset.priceUSD > 0">
                  {{ formatUSD(asset.priceUSD) }}
                  {{ $t("addressDetails.perUnit") }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-white font-mono">
                  {{ formatAssetAmount(asset.amount, asset["asset-id"]) }}
                </div>
                <div class="text-sm text-green-400" v-if="asset.valueUSD > 0">
                  {{ formatUSD(asset.valueUSD) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">
            {{ $t("addressDetails.recentTransactions") }}
          </h2>
          <div
            v-if="transactions.length === 0"
            class="text-center py-8 text-gray-400"
          >
            {{ $t("addressDetails.noTransactions") }}
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
                <span class="text-xs text-gray-400" v-if="tx['round-time']">
                  <FormattedTime :timestamp="BigInt(tx['round-time'])" />
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-400 text-sm">{{
                  formatTransactionType(tx["tx-type"] || "unknown")
                }}</span>
                <div class="text-right">
                  <div class="text-white text-sm">
                    {{ $t("addressDetails.round") }}
                    {{ tx["confirmed-round"] || "N/A" }}
                  </div>
                  <div class="text-gray-400 text-xs">
                    {{ $t("addressDetails.fee") }}
                    {{ algorandService.formatAlgoAmount(tx.fee) }} ALGO
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
import { getAVMTradeReporterAPI } from "../api";
import FormattedTime from "../components/FormattedTime.vue";

const { t } = useI18n();
const api = getAVMTradeReporterAPI();

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

interface IndexerTransaction {
  id: string;
  fee: number;
  "round-time"?: number;
  "tx-type"?: string;
  "confirmed-round"?: number;
  [key: string]: any;
}

const route = useRoute();
const address = computed(() => route.params.address as string);

const loading = ref(false);
const error = ref("");
const accountInfo = ref<AccountInfo | null>(null);
const transactions = ref<IndexerTransaction[]>([]);
const loadingTransactions = ref(false);
const hasMoreTransactions = ref(true);
const nextToken = ref("");
const assetPrices = ref<Record<number, number>>({});

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
      throw new Error(t("addressDetails.notFound"));
    }

    const accountData = await accountResponse.json();
    accountInfo.value = accountData.account;

    // Load asset prices
    fetchAssetPrices();

    // Load initial transactions
    await loadTransactions(true);
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : t("addressDetails.loadError");
    console.error("Error loading address info:", err);
  } finally {
    loading.value = false;
  }
};

const fetchAssetPrices = async () => {
  if (!accountInfo.value) return;

  const assetsToFetch = new Set<number>();
  // Add Algo
  assetsToFetch.add(0);

  // Add other assets
  if (accountInfo.value.assets) {
    accountInfo.value.assets.forEach((a) => assetsToFetch.add(a["asset-id"]));
  }

  // Fetch prices one by one (limitation of API)
  // We use a simple concurrency limit to avoid overwhelming the browser/network
  const queue = Array.from(assetsToFetch);
  const batchSize = 5;

  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (assetId) => {
        try {
          // For Algo (0), we might need a special handling if search "0" doesn't work
          // But let's try searching for the ID first
          const response = await api.getApiSearch({ q: assetId.toString() });

          if (response.data.assets && response.data.assets.length > 0) {
            // Find the exact match
            const asset = response.data.assets.find((a) => a.index === assetId);
            if (asset && asset.priceUSD) {
              assetPrices.value[assetId] = asset.priceUSD;
            }
          }
        } catch (e) {
          console.error(`Failed to fetch price for asset ${assetId}`, e);
        }
      })
    );
  }
};

const enrichedAssets = computed(() => {
  if (!accountInfo.value) return [];

  const assets = [];

  // Add Algo
  assets.push({
    "asset-id": 0,
    amount: accountInfo.value.amount,
    "is-frozen": false,
    name: "Algorand",
    unitName: "ALGO",
    decimals: 6,
    priceUSD: assetPrices.value[0] || 0,
    valueUSD:
      (accountInfo.value.amount / Math.pow(10, 6)) *
      (assetPrices.value[0] || 0),
  });

  // Add other assets
  if (accountInfo.value.assets) {
    accountInfo.value.assets.forEach((asset) => {
      const assetId = asset["asset-id"];
      const assetInfo = assetService.getAssetInfo(BigInt(assetId));

      // Ensure asset info is requested if missing
      if (!assetInfo) {
        assetService.requestAsset(BigInt(assetId), () => {
          // Trigger re-render when asset info is loaded
        });
      }

      const decimals = assetInfo?.decimals ?? 0;
      const price = assetPrices.value[assetId] || 0;
      const amount = asset.amount;
      const valueUSD = (amount / Math.pow(10, decimals)) * price;

      assets.push({
        ...asset,
        name: assetInfo?.name || `Asset ${assetId}`,
        unitName: assetInfo?.unitName || t("assets.unit"),
        decimals,
        priceUSD: price,
        valueUSD,
      });
    });
  }

  // Sort by USD value descending
  return assets.sort((a, b) => b.valueUSD - a.valueUSD);
});

const loadTransactions = async (reset = false) => {
  if (!address.value) return;

  loadingTransactions.value = true;

  try {
    const url = `https://mainnet-idx.algonode.cloud/v2/accounts/${address.value}/transactions?limit=20${nextToken.value ? `&next=${nextToken.value}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(t("addressDetails.loadTxError"));
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

const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatTransactionType = (txType: string): string => {
  const typeMap: { [key: string]: string } = {
    pay: t("transaction.type.pay"),
    axfer: t("transaction.type.axfer"),
    acfg: t("transaction.type.acfg"),
    afrz: t("transaction.type.afrz"),
    appl: t("transaction.type.appl"),
    keyreg: t("transaction.type.keyreg"),
  };
  return typeMap[txType] || txType;
};

const formatStatus = (status?: string) => {
  if (!status) return "N/A";
  if (status === "Online") return t("status.online");
  if (status === "Offline") return t("status.offline");
  return status;
};

onMounted(() => {
  loadAddressInfo();
});
</script>
