<template>
  <StyledBox>
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-gray-400">
        <FormattedTime :timestamp="pool.timestamp || Date.now().toString()" />
      </span>
      <span class="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
        {{ pool.protocol }}
      </span>
    </div>

    <div class="space-y-1">
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">Pool:</span>
        <router-link
          :to="{
            name: 'PoolsByAssets',
            params: {
              asset1: pool.assetIdA?.toString(),
              asset2: pool.assetIdB?.toString(),
            },
          }"
          class="font-mono truncate ml-2 text-blue-100 hover:text-blue-300 transition-colors duration-300"
        >
          {{ formatAddress(pool.poolAddress ?? "") }}
        </router-link>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">
          {{ $t("common.reserveA") }}:
        </span>
        <span class="text-sm text-white">
          <router-link
            :to="{
              name: 'AssetDetails',
              params: {
                assetId: pool.assetIdA?.toString(),
              },
            }"
            class="font-mono truncate ml-2 text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            {{ formattedReserveA }}
          </router-link>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-400">
          {{ $t("common.reserveB") }}:
        </span>
        <span class="text-sm text-white">
          <router-link
            :to="{
              name: 'AssetDetails',
              params: {
                assetId: pool.assetIdB?.toString(),
              },
            }"
            class="font-mono truncate ml-2 text-blue-100 hover:text-blue-300 transition-colors duration-300"
          >
            {{ formattedReserveB }}
          </router-link>
        </span>
      </div>
    </div>
  </StyledBox>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";
import { useI18n } from "vue-i18n";
import { assetService } from "../services/assetService";
import FormattedTime from "./FormattedTime.vue";
import { Pool } from "../api/models";
import StyledBox from "./StyledBox.vue";

const { t } = useI18n();

interface Props {
  pool: Pool;
}

const props = defineProps<Props>();

const state = reactive({
  forceUpdate: 0, // Used to trigger reactivity when assets are loaded
});

const formattedReserveA = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  if (!props.pool.a || props.pool.assetIdA == undefined) return "0";

  const assetInfoA = assetService.getAssetInfo(props.pool.assetIdA);
  if (!assetInfoA) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(props.pool.assetIdA, () => {
      state.forceUpdate++;
    });
    return t("common.loading");
  }
  return assetService.formatAssetBalance(props.pool.a, props.pool.assetIdA);
});

const formattedReserveB = computed(() => {
  // Add dependency on forceUpdate to trigger re-computation when assets load
  void state.forceUpdate;
  //console.log("props.pool", props.pool);
  if (!props.pool.b || props.pool.assetIdB == undefined) return "0";
  const assetInfoB = assetService.getAssetInfo(props.pool.assetIdB);
  if (!assetInfoB) {
    // Request asset loading and trigger re-render when loaded
    assetService.requestAsset(props.pool.assetIdB, () => {
      state.forceUpdate++;
    });
    return t("common.loading");
  }
  return assetService.formatAssetBalance(props.pool.b, props.pool.assetIdB);
});

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 4)}..${address.slice(-4)}`;
};
</script>
