<template>
  <div class="min-h-screen bg-background text-white">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-4">{{ $t("poolDetails.title") }}</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-400"
            >{{ $t("poolDetails.poolAddress") }}:</span
          >
          <span class="font-mono text-blue-400">{{ poolAddress }}</span>
          <CopyToClipboard
            :text="poolAddress"
            :toast-message="$t('poolDetails.poolAddressCopied')"
            :title="$t('poolDetails.copyPoolAddress')"
            class="p-2 text-gray-400 hover:text-white transition-colors"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
        ></div>
        <p class="text-gray-400">{{ $t("poolDetails.loadingPoolInfo") }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-400 mb-4">{{ error }}</p>
        <button
          @click="loadPoolInfo"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          {{ $t("poolDetails.retry") }}
        </button>
      </div>

      <!-- Pool Information -->
      <div v-else-if="poolInfo" class="space-y-6">
        <!-- Basic Pool Information -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">
            {{ $t("poolDetails.poolInformation") }}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-400"
                >{{ $t("poolDetails.poolAddress") }}:</span
              >
              <router-link
                :to="{
                  name: 'AddressDetails',
                  params: { address: poolInfo.poolAddress },
                }"
                class="text-blue-400 hover:text-blue-300 font-mono text-sm transition-colors"
              >
                {{ formatAddress(poolInfo.poolAddress) }}
              </router-link>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Protocol:</span>
              <span class="text-purple-400">{{ poolInfo.protocol }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Asset A ID:</span>
              <span class="text-white">{{ poolInfo.assetIdA ?? 0 }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Asset B ID:</span>
              <span class="text-white">{{ poolInfo.assetIdB ?? 0n }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">LP Token ID:</span>
              <span class="text-white">{{ poolInfo.assetIdLP }}</span>
            </div>
            <div
              class="flex justify-between items-center"
              v-if="poolInfo.poolAppId"
            >
              <span class="text-gray-400">Pool App ID:</span>
              <router-link
                :to="{
                  name: 'ApplicationDetails',
                  params: { appId: poolInfo.poolAppId.toString() },
                }"
                class="text-purple-400 hover:text-purple-300 font-mono text-sm transition-colors"
              >
                {{ poolInfo.poolAppId.toString() }}
              </router-link>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Last Updated:</span>
              <span class="text-white">
                <FormattedTime
                  v-if="poolInfo.timestamp"
                  :timestamp="poolInfo.timestamp"
                  format="both"
                />
                <span v-else>N/A</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Application Details Section -->
        <div v-if="applicationInfo">
          <div class="card mb-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-4">
                <div
                  class="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-lg"
                >
                  <span class="font-bold text-xl">⚙️</span>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-white">
                    Application Details
                  </h2>
                  <p class="text-gray-400">App ID: {{ poolInfo.poolAppId }}</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
                <p class="text-sm text-gray-400 mb-1">Application ID</p>
                <p class="text-white font-medium text-lg">
                  {{ poolInfo.poolAppId }}
                </p>
              </div>
              <div
                v-if="applicationInfo.params?.creator"
                class="bg-dark-900 p-4 rounded-lg border border-gray-700"
              >
                <p class="text-sm text-gray-400 mb-1">Creator</p>
                <router-link
                  :to="{
                    name: 'AddressDetails',
                    params: {
                      address: applicationInfo.params.creator.toString(),
                    },
                  }"
                  class="text-purple-400 hover:text-purple-300 font-mono text-sm break-all"
                >
                  {{ formatAddress(applicationInfo.params.creator.toString()) }}
                </router-link>
              </div>
              <div
                v-if="applicationInfo['created-at-round']"
                class="bg-dark-900 p-4 rounded-lg border border-gray-700"
              >
                <p class="text-sm text-gray-400 mb-1">Created at Round</p>
                <p class="text-white font-medium">
                  {{ applicationInfo["created-at-round"]?.toLocaleString() }}
                </p>
              </div>
            </div>
          </div>

          <!-- State Schemas -->
          <ApplicationStateSchemas
            v-if="applicationInfo.params"
            :global-state-schema="applicationInfo.params.globalStateSchema"
            :local-state-schema="applicationInfo.params.localStateSchema"
          />

          <!-- Smart Contract Programs -->
          <div v-if="applicationInfo.params" class="space-y-6">
            <ApplicationProgram
              v-if="applicationInfo.params.approvalProgram"
              title="Approval Program"
              :program="applicationInfo.params.approvalProgram"
              :decompiled-code="decompiledApproval"
              :is-decompiling="isDecompiling"
              @decompile="decompileProgram('approval')"
            />

            <ApplicationProgram
              v-if="applicationInfo.params.clearStateProgram"
              title="Clear State Program"
              :program="applicationInfo.params.clearStateProgram"
              :decompiled-code="decompiledClear"
              :is-decompiling="isDecompiling"
              @decompile="decompileProgram('clear')"
            />
          </div>
        </div>

        <!-- Pool Reserves -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Pool Reserves</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center p-4 bg-gray-800 rounded-lg">
              <h3 class="text-lg font-medium text-white mb-2">
                Asset A Reserve
              </h3>
              <div class="text-2xl font-bold text-blue-400 mb-1">
                {{ formatReserveA }}
              </div>
              <div class="text-sm text-gray-400">
                {{ getAssetName(poolInfo.assetIdA || BigInt(0)) }}
              </div>
            </div>

            <div class="text-center p-4 bg-gray-800 rounded-lg">
              <h3 class="text-lg font-medium text-white mb-2">
                Asset B Reserve
              </h3>
              <div class="text-2xl font-bold text-green-400 mb-1">
                {{ formatReserveB }}
              </div>
              <div class="text-sm text-gray-400">
                {{ getAssetName(poolInfo.assetIdB || BigInt(0)) }}
              </div>
            </div>

            <div class="text-center p-4 bg-gray-800 rounded-lg">
              <h3 class="text-lg font-medium text-white mb-2">
                LP Token Supply
              </h3>
              <div class="text-2xl font-bold text-purple-400 mb-1">
                {{ formatLPSupply }}
              </div>
              <div class="text-sm text-gray-400">
                {{ getAssetName(poolInfo.assetIdLP || BigInt(0)) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Pool Stats -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Pool Statistics</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Current Price (A/B):</span>
              <span class="text-white font-mono">{{ currentPrice }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Inverse Price (B/A):</span>
              <span class="text-white font-mono">{{ inversePrice }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Total Value Locked:</span>
              <span class="text-white">Calculating...</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Pool Utilization:</span>
              <span class="text-white">{{ poolUtilization }}%</span>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Recent Pool Activity</h2>
          <div class="text-center py-8 text-gray-400">
            Activity tracking coming soon...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import type { AMMPool } from "../types/algorand";
import { assetService } from "../services/assetService";
import { algorandService } from "../services/algorandService";
import FormattedTime from "../components/FormattedTime.vue";
import ApplicationStateSchemas from "../components/ApplicationStateSchemas.vue";
import ApplicationProgram from "../components/ApplicationProgram.vue";
import CopyToClipboard from "../components/CopyToClipboard.vue";

const route = useRoute();
const poolAddress = computed(() => route.params.poolAddress as string);

const loading = ref(false);
const error = ref("");
const poolInfo = ref<AMMPool | null>(null);
const applicationInfo = ref<any>(null);
const isDecompiling = ref(false);
const decompiledApproval = ref("");
const decompiledClear = ref("");

const loadPoolInfo = async () => {
  if (!poolAddress.value) return;

  loading.value = true;
  error.value = "";

  try {
    // Fetch pool information from the API
    const response = await fetch(
      `https://algorand-trades.de-4.biatec.io/api/pool/${poolAddress.value}`
    );

    if (!response.ok) {
      throw new Error(
        `Pool not found: ${response.status} ${response.statusText}`
      );
    }

    const poolData = await response.json();

    // Map the API response to our AMMPool interface
    poolInfo.value = {
      poolAddress: poolData.poolAddress || poolAddress.value,
      poolAppId: BigInt(poolData.poolAppId || 0),
      assetIdA:
        poolData.assetIdA !== undefined ? BigInt(poolData.assetIdA) : undefined,
      assetIdB:
        poolData.assetIdB !== undefined ? BigInt(poolData.assetIdB) : undefined,
      assetIdLP: poolData.assetIdLP ? BigInt(poolData.assetIdLP) : undefined,
      a: poolData.a ? BigInt(poolData.a) : undefined,
      b: poolData.b ? BigInt(poolData.b) : undefined,
      l: poolData.l ? BigInt(poolData.l) : undefined,
      protocol: poolData.protocol || "Unknown",
      timestamp: poolData.timestamp || new Date().toISOString(),
      isReversed: assetService.needToReverseAssets(
        poolData.assetIdA !== undefined ? BigInt(poolData.assetIdA) : 0n,
        poolData.assetIdB !== undefined ? BigInt(poolData.assetIdB) : 0n
      ),
    };
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : "Failed to load pool information";
    console.error("Error loading pool info:", err);
  } finally {
    loading.value = false;
  }
};

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const getAssetName = (assetId: bigint): string => {
  if (assetId === BigInt(0)) return "ALGO";

  const assetInfo = assetService.getAssetInfo(assetId);
  if (!assetInfo) {
    assetService.requestAsset(assetId, () => {
      // Trigger re-render when asset info is loaded
    });
    return `Asset ${assetId}`;
  }
  return assetInfo.name || assetInfo.unitName || `Asset ${assetId}`;
};

const formatReserveA = computed(() => {
  if (!poolInfo.value?.a || poolInfo.value?.assetIdA === undefined) return "0";
  return assetService.formatAssetBalance(
    poolInfo.value.a,
    poolInfo.value.assetIdA
  );
});

const formatReserveB = computed(() => {
  if (!poolInfo.value?.b || poolInfo.value?.assetIdB === undefined) return "0";
  return assetService.formatAssetBalance(
    poolInfo.value.b,
    poolInfo.value.assetIdB
  );
});

const formatLPSupply = computed(() => {
  if (!poolInfo.value?.l || poolInfo.value?.assetIdLP === undefined) return "0";
  return assetService.formatAssetBalance(
    poolInfo.value.l,
    poolInfo.value.assetIdLP
  );
});

const currentPrice = computed(() => {
  if (!poolInfo.value?.a || !poolInfo.value?.b) return "N/A";

  const reserveA = Number(poolInfo.value.a);
  const reserveB = Number(poolInfo.value.b);

  if (reserveB === 0) return "N/A";

  const price = reserveA / reserveB;
  return price.toFixed(6);
});

const inversePrice = computed(() => {
  if (!poolInfo.value?.a || !poolInfo.value?.b) return "N/A";

  const reserveA = Number(poolInfo.value.a);
  const reserveB = Number(poolInfo.value.b);

  if (reserveA === 0) return "N/A";

  const price = reserveB / reserveA;
  return price.toFixed(6);
});

const poolUtilization = computed(() => {
  // This is a mock calculation - in reality, this would depend on the specific AMM formula
  if (!poolInfo.value?.a || !poolInfo.value?.b) return "0";

  const reserveA = Number(poolInfo.value.a);
  const reserveB = Number(poolInfo.value.b);

  // Mock utilization based on balance ratio
  const ratio = Math.min(reserveA, reserveB) / Math.max(reserveA, reserveB);
  return (ratio * 100).toFixed(2);
});

const loadApplicationInfo = async (appId: bigint) => {
  try {
    const algodClient = algorandService.getAlgodClient();
    const appInfo = await algodClient.getApplicationByID(Number(appId)).do();
    applicationInfo.value = appInfo;
  } catch (error) {
    console.error("Error loading application info:", error);
    applicationInfo.value = null;
  }
};

const decompileProgram = async (type: "approval" | "clear") => {
  if (!applicationInfo.value || !applicationInfo.value.params) return;

  isDecompiling.value = true;
  try {
    const algodClient = algorandService.getAlgodClient();
    const program =
      type === "approval"
        ? applicationInfo.value.params.approvalProgram
        : applicationInfo.value.params.clearStateProgram;

    if (!program) return;

    // Decompile using algod endpoint
    const response = await algodClient.disassemble(program).do();

    if (type === "approval") {
      decompiledApproval.value = response.result;
    } else {
      decompiledClear.value = response.result;
    }
  } catch (error) {
    console.error(`Error decompiling ${type} program:`, error);
    if (type === "approval") {
      decompiledApproval.value = `Error decompiling program: ${error}`;
    } else {
      decompiledClear.value = `Error decompiling program: ${error}`;
    }
  }
  isDecompiling.value = false;
};

// Watch poolInfo and load application when it changes
watch(poolInfo, (newPoolInfo) => {
  if (newPoolInfo?.poolAppId && newPoolInfo.poolAppId > 0) {
    loadApplicationInfo(newPoolInfo.poolAppId);
  }
});

onMounted(() => {
  loadPoolInfo();
});
</script>
