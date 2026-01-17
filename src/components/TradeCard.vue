<template>
  <StyledBox>
    <div class="text-center" v-if="formattedPrice">
      <span class="text-white text-lg font-bold">
        <router-link
          :to="{
            name: 'PoolsByAssets',
            params: {
              asset1: trade.assetIdIn.toString(),
              asset2: trade.assetIdOut.toString(),
            },
          }"
          class="text-blue-100 hover:text-blue-300 transition-colors duration-300"
        >
          {{ formattedPrice }}
        </router-link>
      </span>
    </div>
    <div class="flex flex-row w-full">
      <div class="text-right w-full flex-grow">
        <p class="text-xs text-gray-400 mb-1">
          <router-link
            :to="{ name: 'AddressDetails', params: { address: trade.trader } }"
            class="text-blue-100 hover:text-blue-300 transition-colors duration-300"
            :title="trade.trader"
          >
            {{ algorandService.formatAddress(trade.trader) }}
          </router-link>
          {{ $t("common.sold") }}
        </p>
        <p class="text-white text-sm">
          <router-link
            :to="{
              name: 'AssetDetails',
              params: { assetId: trade.assetIdIn.toString() },
            }"
            class="text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            {{ formattedAssetIn }}
          </router-link>
        </p>
        <!-- <p class="text-xs text-gray-500">ID: {{ trade.assetIdIn }}</p> -->
      </div>
      <div
        class="flex flex-col min-w-20 items-center justify-center"
        style="width: 1.5rem"
      >
        <p class="text-xs text-gray-400 text-center mt-2">
          <FormattedTime :timestamp="trade.timestamp" />
        </p>
        <div
          v-if="trade.assetIdIn != trade.assetIdOut"
          class="flex justify-between vertical-align-middle items-center"
        >
          <img
            :src="`https://algorand-trades.de-4.biatec.io/api/asset/image/${trade.assetIdIn}`"
            class="inline-block w-6 h-6 mr-1"
          />
          <div
            class="w-4 h-4 rounded-full flex items-center justify-center"
            :class="
              props.trade.tradeState === 'TxPool' ? 'bg-red-600' : 'bg-blue-600'
            "
          >
            <span class="text-white text-xs font-bold">⇄</span>
          </div>
          <img
            :src="`https://algorand-trades.de-4.biatec.io/api/asset/image/${trade.assetIdOut}`"
            class="inline-block w-6 h-6 ml-1"
          />
        </div>
        <div v-else class="flex">
          <span
            class="w-4 h-4 rounded-full flex items-center justify-center"
            :class="
              props.trade.tradeState === 'TxPool' ? 'bg-red-600' : 'bg-blue-600'
            "
          >
            <span class="text-white text-xs font-bold">⇄</span>
          </span>
        </div>
      </div>
      <div class="w-full flex-grow">
        <p class="text-xs text-gray-400 mb-1 flex">
          <span>{{ $t("common.bought") }}</span>
          <router-link
            :to="{
              name: 'TransactionDetails',
              params: { txId: trade.topTxId },
            }"
            class="text-xs ml-2 text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            {{ $t("common.viewTx") }}
          </router-link>
        </p>
        <p class="text-white text-sm">
          <router-link
            :to="{
              name: 'AssetDetails',
              params: { assetId: trade.assetIdOut.toString() },
            }"
            class="text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            {{ formattedAssetOut }}
          </router-link>
        </p>
        <!-- <p class="text-xs text-gray-500">ID: {{ trade.assetIdOut }}</p> -->
      </div>
    </div>

    <div
      v-if="hasUsdEnrichment"
      class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 justify-center"
    >
      <div v-if="trade.valueUSD !== undefined && trade.valueUSD !== null">
        <span class="font-medium">{{ $t("trades.valueUSD") }}:</span>
        <FormattedNumber
          class="ml-1 text-white"
          :value="trade.valueUSD"
          type="currency"
          currency="USD"
          :maximum-fraction-digits="2"
          :small-threshold="0.01"
          :significant-digits="4"
        />
      </div>

      <div
        v-if="
          props.priceMode === 'selected' &&
          selectedAssetPriceUSD !== undefined &&
          selectedAssetPriceUSD !== null
        "
      >
        <span class="font-medium">{{ $t("trades.priceUSD") }}:</span>
        <FormattedNumber
          class="ml-1 text-white"
          :value="selectedAssetPriceUSD"
          type="currency"
          currency="USD"
          :maximum-fraction-digits="6"
          :small-threshold="0.01"
          :significant-digits="4"
        />
      </div>

      <div
        v-if="
          props.priceMode === 'both' &&
          trade.priceAssetInUSD !== undefined &&
          trade.priceAssetInUSD !== null
        "
      >
        <span class="font-medium">{{ $t("trades.priceAssetInUSD") }}:</span>
        <FormattedNumber
          class="ml-1 text-white"
          :value="trade.priceAssetInUSD"
          type="currency"
          currency="USD"
          :maximum-fraction-digits="6"
          :small-threshold="0.01"
          :significant-digits="4"
        />
      </div>

      <div
        v-if="
          props.priceMode === 'both' &&
          trade.priceAssetOutUSD !== undefined &&
          trade.priceAssetOutUSD !== null
        "
      >
        <span class="font-medium">{{ $t("trades.priceAssetOutUSD") }}:</span>
        <FormattedNumber
          class="ml-1 text-white"
          :value="trade.priceAssetOutUSD"
          type="currency"
          currency="USD"
          :maximum-fraction-digits="6"
          :small-threshold="0.01"
          :significant-digits="4"
        />
      </div>
      <div
        v-if="
          props.showFees &&
          trade.feesUSD !== undefined &&
          trade.feesUSD !== null
        "
      >
        <span class="font-medium">{{ $t("trades.feesUSD") }}:</span>
        <FormattedNumber
          class="ml-1 text-white"
          :value="trade.feesUSD"
          type="currency"
          currency="USD"
          :maximum-fraction-digits="2"
          :small-threshold="0.01"
          :significant-digits="4"
        />
      </div>

      <div
        v-if="
          props.showFees &&
          trade.feesUSDProvider !== undefined &&
          trade.feesUSDProvider !== null
        "
      >
        <span class="font-medium">{{ $t("trades.feesUSDProvider") }}:</span>
        <FormattedNumber
          class="ml-1 text-white"
          :value="trade.feesUSDProvider"
          type="currency"
          currency="USD"
          :maximum-fraction-digits="2"
          :small-threshold="0.01"
          :significant-digits="4"
        />
      </div>

      <div
        v-if="
          props.showFees &&
          trade.feesUSDProtocol !== undefined &&
          trade.feesUSDProtocol !== null
        "
      >
        <span class="font-medium">{{ $t("trades.feesUSDProtocol") }}:</span>
        <FormattedNumber
          class="ml-1 text-white"
          :value="trade.feesUSDProtocol"
          type="currency"
          currency="USD"
          :maximum-fraction-digits="2"
          :small-threshold="0.01"
          :significant-digits="4"
        />
      </div>
    </div>
  </StyledBox>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import { useI18n } from "vue-i18n";
import type { AMMTrade } from "../types/algorand";
import { algorandService } from "../services/algorandService";
import { assetService } from "../services/assetService";
import FormattedNumber from "./FormattedNumber.vue";
import FormattedTime from "./FormattedTime.vue";
import StyledBox from "./StyledBox.vue";

const { t } = useI18n();

const state = reactive({
  forceUpdate: 0, // Used to trigger reactivity when assets are loaded
});

const props = withDefaults(
  defineProps<{
    trade: AMMTrade;
    showFees?: boolean;
    priceMode?: "both" | "selected";
    selectedAssetId?: string | bigint;
  }>(),
  {
    showFees: false,
    priceMode: "both",
  }
);

const selectedAssetIdBigInt = computed(() => {
  if (props.selectedAssetId === undefined || props.selectedAssetId === null) {
    return null;
  }
  try {
    return typeof props.selectedAssetId === "bigint"
      ? props.selectedAssetId
      : BigInt(props.selectedAssetId);
  } catch {
    return null;
  }
});

const selectedAssetPriceUSD = computed(() => {
  if (props.priceMode !== "selected") return null;
  const selected = selectedAssetIdBigInt.value;
  if (selected === null) return null;

  if (selected === props.trade.assetIdIn) return props.trade.priceAssetInUSD;
  if (selected === props.trade.assetIdOut) return props.trade.priceAssetOutUSD;

  return null;
});

const hasUsdEnrichment = computed(() => {
  return (
    (props.trade.valueUSD !== undefined && props.trade.valueUSD !== null) ||
    (props.priceMode === "selected"
      ? selectedAssetPriceUSD.value !== undefined &&
        selectedAssetPriceUSD.value !== null
      : (props.trade.priceAssetInUSD !== undefined &&
          props.trade.priceAssetInUSD !== null) ||
        (props.trade.priceAssetOutUSD !== undefined &&
          props.trade.priceAssetOutUSD !== null)) ||
    (props.showFees &&
      ((props.trade.feesUSD !== undefined && props.trade.feesUSD !== null) ||
        (props.trade.feesUSDProvider !== undefined &&
          props.trade.feesUSDProvider !== null) ||
        (props.trade.feesUSDProtocol !== undefined &&
          props.trade.feesUSDProtocol !== null)))
  );
});

const formattedAssetIn = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  return formatAssetBalance(
    props.trade.assetAmountIn,
    BigInt(props.trade.assetIdIn)
  );
});

const formattedAssetOut = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;

  if (props.trade.tradeState === "TxPool") {
    return "Trade is in the mempool";
  }

  return formatAssetBalance(
    props.trade.assetAmountOut,
    BigInt(props.trade.assetIdOut)
  );
});

const formattedPrice = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;

  if (props.trade.tradeState === "TxPool") {
    return "";
  }
  if (
    assetService.needToReverseAssets(
      props.trade.assetIdIn,
      props.trade.assetIdOut
    )
  ) {
    return formatSwapPrice(
      props.trade.assetAmountIn,
      props.trade.assetAmountOut,
      BigInt(props.trade.assetIdIn),
      BigInt(props.trade.assetIdOut)
    );
  }
  return formatSwapPrice(
    props.trade.assetAmountOut,
    props.trade.assetAmountIn,
    BigInt(props.trade.assetIdOut),
    BigInt(props.trade.assetIdIn)
  );
});

const formatSwapPrice = (
  balanceIn: bigint | number,
  balanceOut: bigint | number,
  assetIdIn: bigint,
  assetIdOut: bigint
): string => {
  if (
    balanceIn === 0n ||
    balanceIn === 0 ||
    balanceOut === 0n ||
    balanceOut === 0
  )
    return "0";

  const assetInfoIn = assetService.getAssetInfo(assetIdIn);
  const assetInfoOut = assetService.getAssetInfo(assetIdOut);
  if (!assetInfoIn) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(assetIdIn, () => {
      state.forceUpdate++;
    });
    return t("common.loading");
  }
  if (!assetInfoOut) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(assetIdOut, () => {
      state.forceUpdate++;
    });
    return t("common.loading");
  }
  const priceAssetIn = Number(balanceIn) / 10 ** assetInfoIn.decimals;
  const priceAssetOut = Number(balanceOut) / 10 ** assetInfoOut.decimals;

  const swapPrice = priceAssetIn / priceAssetOut;
  if (isNaN(swapPrice) || !isFinite(swapPrice)) {
    return "Invalid Price";
  }
  // round to 4 digits os significant figures
  // find significant figures .. calculate zeroes to the right, and add 4 digits
  // for example, if swapPrice is
  //  19 significantIndex = 2
  //  10 significantIndex = 2
  //  1 significantIndex = 1
  //  0 significantIndex = 0
  //  0.1 significantIndex = -1
  //  0.9 significantIndex = -1
  //  0.001 significantIndex = -3

  const significantIndex = Math.floor(Math.log10(swapPrice));
  const roundPlaces = Math.max(0, -1 * (significantIndex - 4));
  const priceStr = swapPrice.toFixed(roundPlaces);
  return `${priceStr} ${assetInfoOut.unitName ?? assetInfoOut.name}/${assetInfoIn.unitName ?? assetInfoIn.name}`;
};

const formatAssetBalance = (
  balance: bigint | number,
  assetId: bigint
): string => {
  if (balance === 0n || balance === 0) return "0";

  const assetInfo = assetService.getAssetInfo(assetId);
  if (!assetInfo) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(assetId, () => {
      state.forceUpdate++;
    });
    return t("common.loading");
  }

  return assetService.formatAssetBalance(balance, assetId);
};
</script>
