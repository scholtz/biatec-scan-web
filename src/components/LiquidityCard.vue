<template>
  <StyledBox>
    <div class="flex items-center justify-between mb-3">
      <span
        v-if="liquidity.direction === 'DepositLiquidity'"
        class="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 flex items-center justify-center"
      >
        <span
          class="w-5 h-5 mr-2 rounded-full bg-green-700 flex items-center justify-center"
        >
          <span class="text-white text-xs font-bold">+</span>
        </span>
        Deposit
      </span>
      <span
        v-else-if="liquidity.direction == 'WithdrawLiquidity'"
        class="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 flex items-center justify-center"
      >
        <span
          class="w-5 h-5 mr-2 rounded-full bg-red-700 flex items-center justify-center"
        >
          <span class="text-white text-xs font-bold">-</span>
        </span>
        Withdraw
      </span>
      <span v-else class="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
        {{ liquidity.direction }}
      </span>
      <span class="text-xs text-gray-400" v-if="liquidity.timestamp">
        <FormattedTime :timestamp="liquidity.timestamp" />
      </span>
      <span v-else class="text-xs text-gray-400"> In tx pool </span>
    </div>

    <div class="flex justify-between items-center">
      <span class="text-sm text-gray-400">Pool:</span>
      <router-link
        :to="{
          name: 'PoolsByAssets',
          params: {
            asset1: liquidity.assetIdA.toString(),
            asset2: liquidity.assetIdB.toString(),
          },
        }"
        class="font-mono truncate ml-2 text-blue-100 hover:text-blue-300 transition-colors duration-300"
        :title="liquidity.poolAddress"
      >
        {{ formatAddress(liquidity.poolAddress) }}
      </router-link>
    </div>
    <div class="space-y-1">
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Asset A:</span>
        <span class="text-sm text-white">
          <router-link
            :to="{
              name: 'AssetDetails',
              params: {
                assetId: liquidity.assetIdA.toString(),
              },
            }"
            class="font-mono truncate ml-2 text-blue-100 hover:text-blue-300 transition-colors duration-300"
            :title="liquidity.assetIdA"
          >
            {{ formattedAssetA }}
          </router-link>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Asset B:</span>
        <span class="text-sm text-white">
          <router-link
            :to="{
              name: 'AssetDetails',
              params: {
                assetId: liquidity.assetIdB.toString(),
              },
            }"
            class="font-mono truncate ml-2 text-blue-100 hover:text-blue-300 transition-colors duration-300"
            :title="liquidity.assetIdB"
          >
            {{ formattedAssetB }}
          </router-link>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">{{ $t('common.liquidityProvider') }}:</span>
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: liquidity.liquidityProvider },
          }"
          class="font-mono truncate ml-2 text-blue-100 hover:text-blue-300 transition-colors duration-300"
          :title="liquidity.liquidityProvider"
        >
          {{ formatAddress(liquidity.liquidityProvider) }}
        </router-link>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">{{ $t('common.txId') }}:</span>
        <router-link
          :to="{ name: 'TransactionDetails', params: { txId: liquidity.txId } }"
          class="font-mono truncate ml-2 text-blue-100 hover:text-blue-300 transition-colors duration-300"
          :title="liquidity.txId"
        >
          {{ formatAddress(liquidity.txId) }}
        </router-link>
      </div>
    </div>
  </StyledBox>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AMMLiquidity } from "../types/algorand";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";
import StyledBox from "./StyledBox.vue";

const { t } = useI18n();

interface Props {
  liquidity: AMMLiquidity;
}

const props = defineProps<Props>();

const state = reactive({
  forceUpdate: 0, // Used to trigger reactivity when assets are loaded
});

const formattedAssetA = computed(() => {
  void state.forceUpdate;
  const assetInfo = assetService.getAssetInfo(BigInt(props.liquidity.assetIdA));
  if (!assetInfo) {
    assetService.requestAsset(BigInt(props.liquidity.assetIdA), () => {
      state.forceUpdate++;
    });
    return t('common.loading');
  }
  return assetService.formatAssetBalance(
    props.liquidity.assetAmountA,
    BigInt(props.liquidity.assetIdA)
  );
});

const formattedAssetB = computed(() => {
  void state.forceUpdate;
  const assetInfo = assetService.getAssetInfo(BigInt(props.liquidity.assetIdB));
  if (!assetInfo) {
    assetService.requestAsset(BigInt(props.liquidity.assetIdB), () => {
      state.forceUpdate++;
    });
    return t('common.loading');
  }
  return assetService.formatAssetBalance(
    props.liquidity.assetAmountB,
    BigInt(props.liquidity.assetIdB)
  );
});

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 4)}..${address.slice(-4)}`;
};
</script>
