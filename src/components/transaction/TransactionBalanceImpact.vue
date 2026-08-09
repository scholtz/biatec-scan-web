<template>
  <div class="card mb-6">
    <h2 class="text-xl font-semibold text-white mb-1">
      {{ $t("transaction.balanceImpact") }}
    </h2>
    <p class="text-sm text-gray-400 mb-4">
      {{ $t("transaction.balanceImpactDesc") }}
    </p>

    <div v-if="impacts.length > 0" class="space-y-3">
      <div
        v-for="impact in impacts"
        :key="impact.address"
        class="bg-dark-900 rounded-lg border border-gray-700 p-4"
      >
        <router-link
          :to="{
            name: 'AddressDetails',
            params: { address: impact.address },
          }"
          class="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
        >
          {{ impact.address }}
        </router-link>

        <div class="mt-3">
          <div
            v-for="change in impact.changes"
            :key="change.assetId"
            class="flex items-center justify-between gap-4 py-2 border-t border-gray-800"
          >
            <div class="min-w-0 flex items-baseline gap-2">
              <span
                v-if="change.assetId === '0'"
                class="text-white font-medium truncate"
              >
                ALGO
              </span>
              <router-link
                v-else
                :to="{
                  name: 'AssetDetails',
                  params: { assetId: change.assetId },
                }"
                class="text-blue-400 hover:text-blue-300 font-medium truncate"
              >
                {{ assetLabel(change.assetId) }}
              </router-link>
              <span
                v-if="change.assetId !== '0'"
                class="text-gray-500 text-xs shrink-0"
              >
                #{{ change.assetId }}
              </span>
            </div>

            <div class="text-right shrink-0">
              <p
                class="font-mono font-semibold"
                :class="
                  change.amount > 0n
                    ? 'text-green-400'
                    : change.amount < 0n
                      ? 'text-red-400'
                      : 'text-gray-400'
                "
              >
                {{ formatChange(change) }}
              </p>
              <p
                v-if="change.assetId === '0' && impact.fee > 0n"
                class="text-xs text-gray-500"
              >
                {{
                  $t("transaction.balanceImpactInclFee", {
                    fee: formatMicroAlgo(impact.fee),
                  })
                }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-else class="text-gray-400">
      {{ $t("transaction.balanceImpactNone") }}
    </p>

    <p
      v-if="totalFee > 0n"
      class="text-sm text-gray-400 mt-4 pt-3 border-t border-gray-700"
    >
      {{
        $t("transaction.balanceImpactTotalFees", {
          fee: formatMicroAlgo(totalFee),
        })
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { PropType, computed, ref, watch } from "vue";
import algosdk from "algosdk";
import { useI18n } from "vue-i18n";
import { assetService } from "../../services/assetService";
import { getTokenFromLocalStorage } from "../../scripts/algo/getTokenFromLocalStorage";
import {
  computeAddressImpacts,
  type AddressImpact,
  type AssetChange,
} from "../../utils/balanceImpact";

const { locale } = useI18n();

const props = defineProps({
  transaction: {
    type: Object as PropType<algosdk.indexerModels.Transaction>,
    required: true,
  },
});

// Bumped whenever a previously unknown asset finishes loading so the
// computed impacts re-render with the correct decimals/unit names.
const assetVersion = ref(0);

const impacts = computed<AddressImpact[]>(() => {
  // Re-evaluate when a queued asset finishes loading
  void assetVersion.value;
  return computeAddressImpacts([props.transaction]);
});

const totalFee = computed(() => {
  let sum = 0n;
  for (const impact of impacts.value) {
    sum += impact.fee;
  }
  return sum;
});

// Queue metadata loading for any asset we cannot resolve locally yet
watch(
  () => props.transaction,
  () => {
    const requested = new Set<string>();
    for (const impact of impacts.value) {
      for (const change of impact.changes) {
        if (change.assetId === "0" || requested.has(change.assetId)) continue;
        requested.add(change.assetId);
        if (!getTokenFromLocalStorage(BigInt(change.assetId))) {
          assetService.requestAsset(BigInt(change.assetId), () => {
            assetVersion.value++;
          });
        }
      }
    }
  },
  { immediate: true }
);

const assetInfo = (assetId: string) =>
  getTokenFromLocalStorage(BigInt(assetId));

const assetLabel = (assetId: string) => {
  const info = assetInfo(assetId);
  return info?.unitName || info?.name || `Asset ${assetId}`;
};

const formatChange = (change: AssetChange) => {
  const decimals =
    change.assetId === "0" ? 6 : assetInfo(change.assetId)?.decimals ?? 0;
  const value = Number(change.amount) / Math.pow(10, decimals);
  const formatted = value.toLocaleString(locale.value, {
    maximumFractionDigits: decimals,
  });
  return change.amount > 0n ? `+${formatted}` : formatted;
};

const formatMicroAlgo = (amount: bigint) => {
  return (Number(amount) / 1_000_000).toLocaleString(locale.value, {
    maximumFractionDigits: 6,
  });
};
</script>
