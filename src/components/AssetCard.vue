<template>
  <StyledBox>
    <div class="flex w-full">
      <div class="flex-grow justify-between align-middle items-center h-full">
        <RouterLink
          :to="`/asset/${state.asset.index}`"
          class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
        >
          <img
            :src="`https://algorand-trades.de-4.biatec.io/api/asset/image/${asset.index}`"
            class="inline-block w-10 h-10 mr-1"
          />
        </RouterLink>
      </div>
      <div class="flex flex-col">
        <div class="text-xs text-gray-400 text-right">
          <FormattedTime
            :timestamp="state.asset.timestamp || new Date().toISOString()"
          />
        </div>

        <div class="text-sm text-white text-right">
          <RouterLink
            :to="`/asset/${state.asset.index}`"
            class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            <template v-if="assetInfoA === null">{{
              t("common.loading")
            }}</template>
            <template v-else>
              <template
                v-if="
                  state.asset.priceUSD === undefined ||
                  state.asset.priceUSD === null
                "
                >-</template
              >
              <template v-else>
                <FormattedNumber
                  :value="Number(state.asset.priceUSD)"
                  type="number"
                  :minimum-fraction-digits="2"
                  :maximum-fraction-digits="6"
                  :small-threshold="0.01"
                  :significant-digits="4"
                />
                {{ " " }}{{ assetInfoA.unitName }}/USD
              </template>
            </template>
          </RouterLink>
        </div>
        <div class="text-sm text-white text-right">
          <RouterLink
            :to="`/pools/${state.asset.index}`"
            class="font-mono truncate text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            <template
              v-if="
                state.asset.tvL_USD === undefined ||
                state.asset.tvL_USD === null
              "
              >-</template
            >
            <template v-else>
              <FormattedNumber
                :value="Number(state.asset.tvL_USD)"
                type="currency"
                currency="USD"
                :maximum-fraction-digits="2"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </template>
          </RouterLink>
        </div>
      </div>
    </div>
  </StyledBox>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";
import { signalrService } from "../services/signalrService";
import { BiatecAsset } from "../api/models";
import StyledBox from "./StyledBox.vue";
import FormattedNumber from "./FormattedNumber.vue";

const { t } = useI18n();

const props = defineProps<{ asset: BiatecAsset }>();

const state = reactive({
  forceUpdate: 0,
  asset: props.asset,
});

onMounted(() => {
  // Trigger reactivity when assets are loaded
  state.forceUpdate++;

  signalrService.onAssetReceived(assetUpdateEvent);
});
onUnmounted(() => {
  signalrService.unsubscribeFromAssetUpdates(assetUpdateEvent);
});

const assetUpdateEvent = (asset: BiatecAsset) => {
  if (asset.index === state.asset.index) {
    state.asset = asset;
  }
};

const assetInfoA = computed(() => {
  void state.forceUpdate;
  const assetInfo = assetService.getAssetInfo(state.asset.index);
  if (!assetInfo) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(state.asset.index, () => {
      state.forceUpdate++;
    });
    return null;
  }
  return assetInfo;
});
</script>
