<template>
  <div
    class="grid grid-cols-1 md:grid-cols-13 gap-3 items-center p-2 rounded bg-gray-800/40 hover:bg-gray-800/60"
  >
    <!-- Protocol -->
    <div class="order-2 md:order-none">
      <span class="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
        {{ state.pool.protocol }}
      </span>
    </div>

    <!-- Type -->
    <div class="order-2 md:order-none">
      <span
        class="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300"
        v-if="state.pool.ammType == AMMType.StableSwap"
      >
        Stable swap
      </span>
      <span
        class="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-300"
        v-else-if="state.pool.ammType == 'OldAMM'"
      >
        Traditional AMM
      </span>
      <span
        class="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300"
        v-else-if="state.pool.ammType == 'ConcentratedLiquidityAMM'"
      >
        Concentrated liquidity
      </span>
      <span
        class="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-300"
        v-else
      >
        {{ state.pool.ammType }}
      </span>
    </div>

    <!-- Address -->
    <div class="order-7 md:order-none">
      <router-link
        v-if="state.pool.poolAddress"
        :to="{
          name: 'AddressDetails',
          params: { address: state.pool.poolAddress },
        }"
        class="text-xs text-blue-100 hover:text-blue-300 font-mono truncate transition-colors duration-200"
        :title="state.pool.poolAddress"
      >
        {{ formatAddress(state.pool.poolAddress) }}
      </router-link>
      <CopyToClipboard
        :text="state.pool.poolAddress ?? ''"
        :toast-message="`Copied pool address: ${formatAddress(state.pool.poolAddress ?? '')}`"
        title="Copy pool address to clipboard"
        class="p-2 text-gray-400 hover:text-white transition-colors"
      />
    </div>

    <!-- Pool ID -->
    <div class="order-1 md:order-none text-right">
      <router-link
        v-if="state.pool.poolAppId"
        :to="{
          name: 'PoolDetails',
          params: { poolAddress: state.pool.poolAddress },
        }"
        class="text-sm text-blue-100 hover:text-blue-300 transition-colors duration-200"
      >
        {{ state.pool.poolAppId.toString() }}
      </router-link>

      <CopyToClipboard
        :text="state.pool.poolAppId?.toString() ?? ''"
        :toast-message="`Copied pool app ID: ${state.pool.poolAppId?.toString() ?? ''}`"
        title="Copy pool app id to clipboard"
        class="p-2 text-gray-400 hover:text-white transition-colors"
      />
    </div>

    <!-- Fee -->
    <div class="order-1 md:order-none text-sm text-white text-right">
      <div v-if="state.pool.lpFee ?? 0 > 0">
        {{ Number((state.pool.lpFee ?? 0) * 100).toLocaleString() }} %
      </div>
      <div v-else>-</div>
    </div>
    <!-- Protocol Fee -->
    <div class="order-1 md:order-none text-sm text-white text-right">
      <div v-if="state.pool.protocolFeePortion ?? 0 > 0">
        {{
          Number((state.pool.protocolFeePortion ?? 0) * 100).toLocaleString()
        }}
        %
      </div>
      <div v-else>-</div>
    </div>

    <!-- Price Min -->
    <div class="order-3 md:order-none text-sm text-white text-right">
      {{ formattedPriceMin }}
    </div>
    <!-- Price -->
    <div class="order-3 md:order-none text-sm text-white text-right">
      <router-link
        :to="{
          name: 'PoolsByAssets',
          params: { asset1: state.pool.assetIdA, asset2: state.pool.assetIdB },
        }"
        class="text-sm text-blue-100 hover:text-blue-300 transition-colors duration-200"
      >
        {{ formattedPrice }}
      </router-link>
    </div>
    <!-- Price Max -->
    <div class="order-3 md:order-none text-sm text-white text-right">
      {{ formattedPriceMax }}
    </div>

    <!-- Reserve A -->
    <div class="order-4 md:order-none text-sm text-white text-right">
      <div title="Real reserve">
        <router-link
          :to="{
            name: 'AssetDetails',
            params: { assetId: state.pool.assetIdA },
          }"
          class="text-sm text-blue-100 hover:text-blue-300 transition-colors duration-200"
        >
          {{ formattedReserveA }}
        </router-link>
      </div>
      <div title="Virtual reserve">{{ formattedVirtualReserveA }}</div>
    </div>

    <!-- Reserve B -->
    <div class="order-5 md:order-none text-sm text-white text-right">
      <div title="Real reserve">
        <router-link
          :to="{
            name: 'AssetDetails',
            params: { assetId: state.pool.assetIdB },
          }"
          class="text-sm text-blue-100 hover:text-blue-300 transition-colors duration-200"
        >
          {{ formattedReserveB }}
        </router-link>
      </div>
      <div title="Virtual reserve">{{ formattedVirtualReserveB }}</div>
    </div>

    <!-- 24H Volume -->
    <div class="order-6 md:order-none text-sm text-white text-right">
      <template
        v-if="
          state.pool.volume24H === undefined || state.pool.volume24H === null
        "
        >-</template
      >
      <template v-else>
        <FormattedNumber
          :value="state.pool.volume24H"
          type="currency"
          :maximum-fraction-digits="2"
          :small-threshold="0.01"
          :significant-digits="4"
        />
      </template>
    </div>

    <!-- Time -->
    <div class="order-8 md:order-none text-right">
      <span class="text-xs text-gray-400">
        <FormattedTime
          :timestamp="state.pool.timestamp || Date.now().toString()"
        />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted } from "vue";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";
import FormattedNumber from "./FormattedNumber.vue";
import CopyToClipboard from "./CopyToClipboard.vue";
import { signalrService } from "../services/signalrService";
import { AMMType, Pool } from "../api/models";

interface Props {
  pool: Pool;
}

const props = defineProps<Props>();

const state = reactive({ forceUpdate: 0, pool: props.pool });
onMounted(() => {
  state.pool = props.pool;
  if (
    assetService.needToReverseAssets(
      BigInt(props.pool.assetIdA ?? 0n),
      BigInt(props.pool.assetIdB ?? 0n),
    )
  ) {
    state.pool = assetService.reversePool(props.pool);
  }

  signalrService.onPoolReceived(poolUpdateEvent);
});

onUnmounted(() => {
  signalrService.unsubscribeFromPoolUpdates(poolUpdateEvent);
});

const poolUpdateEvent = (pool: Pool) => {
  if (
    pool.poolAppId === state.pool.poolAppId &&
    state.pool.poolAddress == pool.poolAddress
  ) {
    if (
      assetService.needToReverseAssets(
        BigInt(pool.assetIdA ?? 0n),
        BigInt(pool.assetIdB ?? 0n),
      )
    ) {
      state.pool = assetService.reversePool(pool);
    } else {
      state.pool = pool;
    }
  }
};

const formattedPrice = computed(() => {
  void state.forceUpdate;
  if (
    !state.pool.virtualAmountA ||
    !state.pool.virtualAmountB ||
    state.pool.assetIdA === undefined ||
    state.pool.assetIdA === null
  )
    return "0";
  return assetService.formatPairBalance(
    state.pool.virtualAmountA,
    state.pool.assetIdA ?? 0,
    state.pool.virtualAmountB,
    state.pool.assetIdB ?? 0,
    false,
  );
});
const formattedPriceMin = computed(() => {
  if (!state.pool.pMin) return "0";
  return assetService.formatPairBalanceWithRealValue(
    state.pool.pMin,
    state.pool.assetIdA ?? 0,
    state.pool.assetIdB ?? 0,
  );
});
const formattedPriceMax = computed(() => {
  if (!state.pool.pMax) return "∞";
  return assetService.formatPairBalanceWithRealValue(
    state.pool.pMax,
    state.pool.assetIdA ?? 0,
    state.pool.assetIdB ?? 0,
  );
});
const formattedReserveA = computed(() => {
  void state.forceUpdate;
  if (
    !state.pool.realAmountA ||
    state.pool.assetIdA === undefined ||
    state.pool.assetIdA === null
  )
    return "0";
  return assetService.formatAssetBalance(
    state.pool.realAmountA,
    state.pool.assetIdA ?? 0,
    false,
  );
});

const formattedVirtualReserveA = computed(() => {
  void state.forceUpdate;
  if (
    state.pool.ammType === AMMType.OldAMM &&
    state.pool.virtualAmountA == state.pool.realAmountA
  )
    return "";
  if (
    !state.pool.virtualAmountA ||
    state.pool.assetIdA === undefined ||
    state.pool.assetIdA === null
  )
    return "0";
  return assetService.formatAssetBalance(
    state.pool.virtualAmountA,
    state.pool.assetIdA ?? 0,
    false,
  );
});
const formattedVirtualReserveB = computed(() => {
  void state.forceUpdate;
  if (
    state.pool.ammType === AMMType.OldAMM &&
    state.pool.virtualAmountB == state.pool.realAmountB
  )
    return "";
  if (
    !state.pool.virtualAmountB ||
    state.pool.assetIdB === undefined ||
    state.pool.assetIdB === null
  )
    return "0";
  return assetService.formatAssetBalance(
    state.pool.virtualAmountB,
    state.pool.assetIdB ?? 0,
    false,
  );
});

const formattedReserveB = computed(() => {
  void state.forceUpdate;
  if (
    !state.pool.realAmountB ||
    state.pool.assetIdB === undefined ||
    state.pool.assetIdB === null
  )
    return "0";
  return assetService.formatAssetBalance(
    state.pool.realAmountB,
    state.pool.assetIdB ?? 0,
    false,
  );
});

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};
</script>

<style scoped></style>
