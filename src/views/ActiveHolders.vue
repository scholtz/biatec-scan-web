<template>
  <div class="min-h-screen bg-background text-white">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <router-link
          :to="{ name: 'AssetDetails', params: { assetId } }"
          class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          &larr; {{ $t("activeHolders.backToAsset", { name: assetName }) }}
        </router-link>
        <h1 class="text-3xl font-bold mt-2">
          {{ $t("activeHolders.title", { name: assetName }) }}
        </h1>
      </div>

      <div v-if="assetId === '0'" class="card text-center py-12">
        <p class="text-amber-400">
          {{ $t("activeHolders.notAvailableForNative") }}
        </p>
      </div>

      <template v-else>
        <!-- Loading State -->
        <div v-if="loading && rows.length === 0" class="text-center py-12">
          <div
            class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          ></div>
          <p class="text-gray-400">{{ $t("activeHolders.loading") }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-12">
          <p class="text-red-400 mb-4">{{ error }}</p>
          <button
            @click="reload"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            {{ $t("activeHolders.retry") }}
          </button>
        </div>

        <div v-else class="card">
          <div
            v-if="rows.length === 0"
            class="text-center py-12 text-gray-400"
          >
            {{ $t("activeHolders.noHolders") }}
          </div>

          <template v-else>
            <div
              class="hidden md:grid grid-cols-3 gap-3 px-2 text-xs text-gray-400 mb-2"
            >
              <div class="min-w-0">{{ $t("activeHolders.address") }}</div>
              <div class="min-w-0 text-right">
                {{ $t("activeHolders.balance") }}
              </div>
              <div class="min-w-0 text-right">
                {{ $t("activeHolders.usdValue") }}
              </div>
            </div>

            <div class="space-y-1">
              <div
                v-for="(row, index) in rows"
                :key="row.address"
                class="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-3 items-center p-2 rounded"
                :class="index % 2 === 1 ? 'bg-gray-800/20' : 'bg-gray-800/40'"
              >
                <div class="min-w-0">
                  <router-link
                    :to="{
                      name: 'AddressDetails',
                      params: { address: row.address },
                    }"
                    class="text-blue-400 hover:text-blue-300 font-mono text-sm truncate block"
                  >
                    {{ formatAddress(row.address) }}
                  </router-link>
                </div>
                <div class="min-w-0 text-left md:text-right text-sm text-gray-100">
                  {{ formatBalance(row.balance) }}
                </div>
                <div class="min-w-0 text-left md:text-right text-sm text-gray-100">
                  <FormattedNumber
                    :value="row.usdValue"
                    type="currency"
                    :maximum-fraction-digits="2"
                    :small-threshold="0.01"
                    :significant-digits="4"
                  />
                </div>
              </div>
            </div>
          </template>

          <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              class="btn-secondary text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="tokenStack.length === 0 || loading"
              @click="goPrev"
            >
              {{ $t("common.prev") }}
            </button>
            <span class="text-sm text-gray-400">{{
              $t("activeHolders.page", { page: pageNumber })
            }}</span>
            <button
              type="button"
              class="btn-secondary text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!nextTokenValue || loading"
              @click="goNext"
            >
              {{ $t("common.next") }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { algorandService } from "../services/algorandService";
import { assetService } from "../services/assetService";
import { getAVMTradeReporterAPI } from "../api";
import FormattedNumber from "../components/FormattedNumber.vue";

const route = useRoute();
const api = getAVMTradeReporterAPI();

const PAGE_SIZE = 50;

const assetId = computed(() => (route.params.assetId as string) ?? "0");

interface RawHolder {
  address: string;
  amount: bigint;
}

const forceUpdate = ref(0);
const loading = ref(false);
const error = ref("");
const priceUSD = ref<number | null>(null);
const rawBalances = ref<RawHolder[]>([]);
const tokenStack = ref<Array<string | undefined>>([]);
const currentToken = ref<string | undefined>(undefined);
const nextTokenValue = ref<string | undefined>(undefined);

const pageNumber = computed(() => tokenStack.value.length + 1);

const assetInfo = computed(() => {
  void forceUpdate.value;
  return assetService.getAssetInfo(BigInt(assetId.value || "0"));
});

const assetName = computed(
  () =>
    assetInfo.value?.name ||
    assetInfo.value?.unitName ||
    `Asset ${assetId.value}`,
);

const decimals = computed(() => assetInfo.value?.decimals ?? 0);
const unitName = computed(
  () => assetInfo.value?.unitName || assetInfo.value?.name || "",
);

const rows = computed(() => {
  const d = decimals.value;
  const price = priceUSD.value;
  return rawBalances.value.map((b) => {
    const balance = Number(b.amount) / Math.pow(10, d);
    return {
      address: b.address,
      balance,
      usdValue: price != null ? balance * price : null,
    };
  });
});

function ensureAssetLoaded() {
  assetService.requestAsset(BigInt(assetId.value || "0"), () => {
    forceUpdate.value++;
  });
}

function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatBalance(balance: number): string {
  const formatted = balance.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
  return unitName.value ? `${formatted} ${unitName.value}` : formatted;
}

async function loadPrice() {
  try {
    const response = await api.getApiAsset({ ids: assetId.value, size: 1 });
    priceUSD.value = response.data?.[0]?.priceUSD ?? null;
  } catch (err) {
    console.error("Error loading asset price:", err);
    priceUSD.value = null;
  }
}

async function loadHolders(token?: string) {
  if (assetId.value === "0") return;

  loading.value = true;
  error.value = "";

  try {
    const indexer = algorandService.getIndexerClient();
    let request = indexer
      .lookupAssetBalances(BigInt(assetId.value))
      .currencyGreaterThan(0)
      .limit(PAGE_SIZE);
    if (token) {
      request = request.nextToken(token);
    }
    const response = await request.do();
    rawBalances.value = (response.balances ?? []).map((b) => ({
      address: b.address,
      amount: b.amount,
    }));
    nextTokenValue.value = response.nextToken;
  } catch (err: unknown) {
    error.value =
      err instanceof Error
        ? err.message
        : "Failed to load asset holders";
    rawBalances.value = [];
  } finally {
    loading.value = false;
  }
}

async function goNext() {
  if (!nextTokenValue.value) return;
  tokenStack.value.push(currentToken.value);
  currentToken.value = nextTokenValue.value;
  await loadHolders(currentToken.value);
}

async function goPrev() {
  if (tokenStack.value.length === 0) return;
  currentToken.value = tokenStack.value.pop();
  await loadHolders(currentToken.value);
}

async function reload() {
  tokenStack.value = [];
  currentToken.value = undefined;
  await Promise.all([loadPrice(), loadHolders()]);
}

onMounted(() => {
  ensureAssetLoaded();
  reload();
});

watch(assetId, () => {
  ensureAssetLoaded();
  reload();
});
</script>

<style scoped></style>
