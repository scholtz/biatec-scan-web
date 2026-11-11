<template>
  <div class="min-h-screen bg-background text-white">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-4">{{ $t("poolDetails.title") }}</h1>
        <div class="flex items-center gap-4 flex-wrap">
          <span class="text-gray-400"
            >{{ $t("poolDetails.poolAddress") }}:</span
          >
          <span class="font-mono text-blue-400 break-all">{{ poolAddress }}</span>
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
        <!-- Scam warning -->
        <div
          v-if="scamRating > 0"
          role="alert"
          :class="[
            'rounded-lg border p-4 flex gap-3 items-start',
            isKnownScam
              ? 'bg-red-950/60 border-red-600 text-red-100'
              : 'bg-amber-950/60 border-amber-500 text-amber-100',
          ]"
        >
          <span class="text-2xl leading-none shrink-0" aria-hidden="true">&#9888;</span>
          <div class="min-w-0">
            <div class="font-semibold mb-1">
              {{ $t("poolDetails.scamWarningTitle") }}
            </div>
            <p class="text-sm">
              {{
                $t(
                  isKnownScam
                    ? "poolDetails.scamWarningKnown"
                    : "poolDetails.scamWarningSuspicious",
                  { rating: scamRating }
                )
              }}
            </p>
          </div>
        </div>

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
              <span
                :class="
                  poolInfo.protocol === 'Scam'
                    ? 'text-red-400 font-semibold'
                    : 'text-purple-400'
                "
                >{{ poolInfo.protocol }}</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400"
                >{{ $t("poolDetails.scamRating") }}:</span
              >
              <span
                :class="
                  isKnownScam
                    ? 'text-red-400 font-semibold'
                    : scamRating > 0
                      ? 'text-amber-400'
                      : 'text-green-400'
                "
                >{{ scamRating }}/100</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Asset A ID:</span>
              <router-link
                v-if="poolInfo.assetIdA !== undefined"
                :to="{
                  name: 'AssetDetails',
                  params: { assetId: poolInfo.assetIdA.toString() },
                }"
                class="text-blue-400 hover:text-blue-300 font-mono text-sm transition-colors"
              >
                {{ poolInfo.assetIdA }}
              </router-link>
              <span v-else class="text-white">0</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Asset B ID:</span>
              <router-link
                v-if="poolInfo.assetIdB !== undefined"
                :to="{
                  name: 'AssetDetails',
                  params: { assetId: poolInfo.assetIdB.toString() },
                }"
                class="text-blue-400 hover:text-blue-300 font-mono text-sm transition-colors"
              >
                {{ poolInfo.assetIdB }}
              </router-link>
              <span v-else class="text-white">0</span>
            </div>
            <div
              v-if="
                !isKnownScam &&
                poolInfo.assetIdA !== undefined &&
                poolInfo.assetIdB !== undefined
              "
              class="flex justify-between items-center"
            >
              <span class="text-gray-400">{{
                $t("poolDetails.aggregatedPair")
              }}:</span>
              <router-link
                :to="{
                  name: 'PoolsByAssets',
                  params: {
                    asset1: poolInfo.assetIdA.toString(),
                    asset2: poolInfo.assetIdB.toString(),
                  },
                }"
                class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                {{ $t("poolDetails.allPoolsForPair") }}
              </router-link>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">LP Token ID:</span>
              <!-- hasLpToken guarantees assetIdLP is defined and non-zero -->
              <router-link
                v-if="hasLpToken"
                :to="{
                  name: 'AssetDetails',
                  params: { assetId: poolInfo.assetIdLP!.toString() },
                }"
                class="text-blue-400 hover:text-blue-300 font-mono text-sm transition-colors"
              >
                {{ poolInfo.assetIdLP }}
              </router-link>
              <span v-else class="text-amber-400">{{
                $t("poolDetails.noLpToken")
              }}</span>
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
                <span v-if="hasLpToken">{{
                  getAssetName(poolInfo.assetIdLP || BigInt(0))
                }}</span>
                <span v-else-if="estimatedLpSupply !== null">{{
                  $t("poolDetails.estimatedLpSupply")
                }}</span>
                <span v-else>{{ $t("poolDetails.noLpToken") }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pool Stats -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Pool Statistics</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex justify-between items-center gap-2">
              <span class="text-gray-400">
                {{ $t("poolDetails.priceOf", { unitName: unitA }) }}:
              </span>
              <span class="text-white font-mono">
                <FormattedNumber :value="spotPrice" :maximum-significant-digits="6" placeholder="N/A" />
                {{ spotPrice !== undefined ? unitB : "" }}
              </span>
            </div>
            <div class="flex justify-between items-center gap-2">
              <span class="text-gray-400">
                {{ $t("poolDetails.priceOf", { unitName: unitB }) }}:
              </span>
              <span class="text-white font-mono">
                <FormattedNumber :value="inverseSpotPrice" :maximum-significant-digits="6" placeholder="N/A" />
                {{ inverseSpotPrice !== undefined ? unitA : "" }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Total Value Locked:</span>
              <span class="text-white">{{ totalValueLockedUsd }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{ $t("poolDetails.volume24h") }}:</span>
              <span class="text-white">
                <FormattedNumber :value="rawPool?.volume24H" type="currency" currency="USD" :maximum-fraction-digits="2" placeholder="N/A" />
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Pool Utilization:</span>
              <span class="text-white">{{ poolUtilization }}%</span>
            </div>
          </div>
        </div>

        <!-- Liquidity distribution of tick based CLAMM pools (ranges read from the pool's box storage) -->
        <div v-if="isPactTickClamm && liquidityRanges.length > 0" class="card">
          <h2 class="text-xl font-semibold mb-2">
            {{ $t("poolDetails.liquidityDistribution") }}
          </h2>
          <LiquidityDistribution
            :ranges="liquidityRanges"
            :current-price="spotPrice"
            :current-tick="rawPool?.currentTick"
            :unit-a="unitA"
            :unit-b="unitB"
            :decimals-a="decimalsA"
            :decimals-b="decimalsB"
          />
        </div>

        <!-- Recent Activity -->
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">
            {{ $t("poolDetails.recentActivity") }}
          </h2>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="min-w-0">
              <TradesList :pool-address="poolAddress" />
            </div>
            <div class="min-w-0">
              <LiquidityList :pool-address="poolAddress" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import type { AMMPool } from "../types/algorand";
import { assetService } from "../services/assetService";
import { nativeTokenUnit } from "../config/env";
import { getAVMTradeReporterAPI } from "../api";
import { useAssetInfo } from "../composables/useAssetInfo";
import FormattedTime from "../components/FormattedTime.vue";
import CopyToClipboard from "../components/CopyToClipboard.vue";
import TradesList from "../components/TradesList.vue";
import LiquidityList from "../components/LiquidityList.vue";
import FormattedNumber from "../components/FormattedNumber.vue";
import LiquidityDistribution from "../components/LiquidityDistribution.vue";
import type { Pool } from "../api/models";
import { poolSpotPrice } from "../utils/poolPrice";

const api = getAVMTradeReporterAPI();
// assetService caches in localStorage (not reactive); assetInfo() subscribes
// computeds to asset loads so "Loading..." resolves once the asset arrives.
const { assetInfo } = useAssetInfo(assetService);
const route = useRoute();
const poolAddress = computed(() => route.params.poolAddress as string);

const loading = ref(false);
const error = ref("");
const poolInfo = ref<AMMPool | null>(null);
// the API pool as returned, for the fields the AMMPool view model does not carry (prices, ranges, volume)
const rawPool = ref<Pool | null>(null);

const loadPoolInfo = async () => {
  if (!poolAddress.value) return;

  loading.value = true;
  error.value = "";

  try {
    // Fetch pool information from the API. The backend has no
    // /api/pool/{address} route - pools are looked up via the list endpoint's
    // `address` filter, and the shared client attaches the ARC-14 auth header.
    const response = await api.getApiPool({
      address: poolAddress.value,
      size: 1,
    });
    const poolData = response.data?.[0];

    if (!poolData) {
      throw new Error(`Pool not found: ${poolAddress.value}`);
    }
    rawPool.value = poolData;

    // Map the API response to our AMMPool interface
    poolInfo.value = {
      poolAddress: poolData.poolAddress || poolAddress.value,
      poolAppId: BigInt(poolData.poolAppId || 0),
      assetIdA:
        poolData.assetIdA != null ? BigInt(poolData.assetIdA) : undefined,
      assetIdB:
        poolData.assetIdB != null ? BigInt(poolData.assetIdB) : undefined,
      assetIdLP:
        poolData.assetIdLP != null ? BigInt(poolData.assetIdLP) : undefined,
      a: poolData.a ? BigInt(poolData.a) : undefined,
      b: poolData.b ? BigInt(poolData.b) : undefined,
      l: poolData.l ? BigInt(poolData.l) : undefined,
      protocol: poolData.protocol || "Biatec",
      ammType: poolData.ammType,
      timestamp: poolData.timestamp || new Date().toISOString(),
      scamRating: poolData.scamRating ?? 0,
      isReversed: assetService.needToReverseAssets(
        poolData.assetIdA != null ? BigInt(poolData.assetIdA) : 0n,
        poolData.assetIdB != null ? BigInt(poolData.assetIdB) : 0n
      ),
      totalTVLAssetAInUSD: poolData.totalTVLAssetAInUSD ?? undefined,
      totalTVLAssetBInUSD: poolData.totalTVLAssetBInUSD ?? undefined,
    };
  } catch (err: unknown) {
    rawPool.value = null;
    error.value =
      err instanceof Error ? err.message : "Failed to load pool information";
    console.error("Error loading pool info:", err);
  } finally {
    loading.value = false;
  }
};

const scamRating = computed(() => poolInfo.value?.scamRating ?? 0);
// Mirrors the backend ScamRatingPolicy.ZeroBalancesThreshold: above 80 the API reports 0 balances.
const isKnownScam = computed(() => scamRating.value > 80);

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const getAssetName = (assetId: bigint, preferUnitName = false): string => {
  if (assetId === BigInt(0)) return nativeTokenUnit;

  const info = assetInfo(assetId);
  if (!info) return `Asset ${assetId}`;
  return (preferUnitName ? info.unitName || info.name : info.name || info.unitName) || `Asset ${assetId}`;
};

const formatReserveA = computed(() => {
  if (!poolInfo.value?.a || poolInfo.value?.assetIdA === undefined) return "0";
  assetInfo(poolInfo.value.assetIdA);
  return assetService.formatAssetBalance(
    poolInfo.value.a,
    poolInfo.value.assetIdA
  );
});

const formatReserveB = computed(() => {
  if (!poolInfo.value?.b || poolInfo.value?.assetIdB === undefined) return "0";
  assetInfo(poolInfo.value.assetIdB);
  return assetService.formatAssetBalance(
    poolInfo.value.b,
    poolInfo.value.assetIdB
  );
});

// A pool with no LP asset id (or id 0) mints no fungible LP token at all —
// e.g. Pact's tick-based CLAMM tracks positions as boxes, not an ASA.
const hasLpToken = computed(
  () => !!poolInfo.value?.assetIdLP && poolInfo.value.assetIdLP !== 0n
);

const isPactTickClamm = computed(
  () =>
    poolInfo.value?.protocol === "Pact" &&
    poolInfo.value?.ammType === "TickBasedCLAMM"
);

// Pact CLAMM has no LP token, so there is no on-chain supply to read. As a
// stand-in, derive a constant-product-style geometric mean (sqrt(a*b)) from
// the pool's current reserves in base units, matching the usual xy=k LP
// share convention — the pool's own liquidity constant `l` is tick-range
// specific and not directly comparable to that convention.
const estimatedLpSupply = computed(() => {
  if (
    !isPactTickClamm.value ||
    !poolInfo.value?.a ||
    !poolInfo.value?.b ||
    poolInfo.value.assetIdA === undefined ||
    poolInfo.value.assetIdB === undefined
  )
    return null;

  const assetInfoA = assetInfo(poolInfo.value.assetIdA);
  const assetInfoB = assetInfo(poolInfo.value.assetIdB);
  if (!assetInfoA || !assetInfoB) return null;

  const baseA = Number(poolInfo.value.a) / Math.pow(10, assetInfoA.decimals || 0);
  const baseB = Number(poolInfo.value.b) / Math.pow(10, assetInfoB.decimals || 0);
  return Math.sqrt(baseA * baseB);
});

const formatLPSupply = computed(() => {
  if (hasLpToken.value && poolInfo.value?.l && poolInfo.value?.assetIdLP !== undefined) {
    assetInfo(poolInfo.value.assetIdLP);
    return assetService.formatAssetBalance(
      poolInfo.value.l,
      poolInfo.value.assetIdLP
    );
  }
  if (estimatedLpSupply.value !== null) {
    return `~${estimatedLpSupply.value.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })}`;
  }
  return "0";
});

// Spot price of 1 A in B (decimals adjusted). The reserve ratio is not a price for anything but a 50/50 pool with
// equal decimals - concentrated, weighted, stable and tick based pools need the pool's own price, e.g. Pact ALGO/USDC
// 3762241535 holds ~170k ALGO and ~3.7k USDC at a price of ~0.09. A tick based pool carries its contract price; any
// pool falls back to it when its virtual amounts are missing (e.g. zeroed balances).
const spotPrice = computed(() => {
  const pool = rawPool.value;
  if (!pool) return undefined;
  const contractPrice = pool.currentPrice != null && pool.currentPrice > 0 ? pool.currentPrice : undefined;
  if (pool.ammType === "TickBasedCLAMM" && contractPrice !== undefined) return contractPrice;
  return poolSpotPrice(pool) ?? contractPrice;
});
const inverseSpotPrice = computed(() =>
  spotPrice.value !== undefined && spotPrice.value > 0 ? 1 / spotPrice.value : undefined
);

const unitA = computed(() =>
  poolInfo.value?.assetIdA === undefined ? "" : getAssetName(poolInfo.value.assetIdA, true)
);
const unitB = computed(() =>
  poolInfo.value?.assetIdB === undefined ? "" : getAssetName(poolInfo.value.assetIdB, true)
);
// the pool's decimals, else the asset's (pools enriched before the field existed)
const decimalsA = computed(
  () =>
    rawPool.value?.assetADecimals ??
    (poolInfo.value?.assetIdA !== undefined ? assetInfo(poolInfo.value.assetIdA)?.decimals : undefined) ??
    0
);
const decimalsB = computed(
  () =>
    rawPool.value?.assetBDecimals ??
    (poolInfo.value?.assetIdB !== undefined ? assetInfo(poolInfo.value.assetIdB)?.decimals : undefined) ??
    0
);

const liquidityRanges = computed(() => rawPool.value?.liquidityRanges ?? []);

const totalValueLockedUsd = computed(() => {
  const tvlA = poolInfo.value?.totalTVLAssetAInUSD;
  const tvlB = poolInfo.value?.totalTVLAssetBInUSD;
  if (tvlA == null && tvlB == null) return "N/A";

  const total = (tvlA ?? 0) + (tvlB ?? 0);
  return total.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
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

onMounted(() => {
  loadPoolInfo();
});
</script>
