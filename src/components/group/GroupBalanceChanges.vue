<template>
  <div class="card space-y-4">
    <div>
      <h2 class="text-xl font-semibold text-white mb-1">
        {{ t("group.balanceChange") }}
      </h2>
      <p class="text-sm text-gray-400">
        {{ t("group.balanceChangeDesc") }}
      </p>
    </div>

    <div
      v-if="impacts.length === 0"
      class="text-center py-4 text-gray-400 text-sm"
    >
      {{ t("group.balanceChangeEmpty") }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="impact in impacts"
        :key="impact.address"
        class="bg-dark-900 rounded-lg border border-gray-700 p-4"
      >
        <router-link
          :to="{ name: 'AddressDetails', params: { address: impact.address } }"
          class="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
        >
          {{ impact.address }}
        </router-link>

        <div class="mt-2 space-y-2">
          <div
            v-for="row in impactRows(impact)"
            :key="row.assetId"
            class="flex justify-between items-center p-3 bg-gray-800 rounded"
          >
            <span class="text-white text-sm truncate mr-2">{{ row.label }}</span>
            <div class="text-right flex-shrink-0">
              <div
                class="font-mono text-sm"
                :class="row.positive ? 'text-green-400' : 'text-red-400'"
              >
                {{ row.positive ? "+" : "-" }}{{ row.formatted }}
              </div>
              <div
                v-if="row.formattedUSD"
                class="font-mono text-xs"
                :class="row.positive ? 'text-green-400/70' : 'text-red-400/70'"
              >
                {{ row.positive ? "+" : "-" }}{{ row.formattedUSD }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p
        v-if="totalFee > 0n"
        class="text-sm text-gray-400 pt-3 border-t border-gray-700"
      >
        {{
          t("transaction.balanceImpactTotalFees", {
            fee: formatMicroAlgo(totalFee),
          })
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { assetService } from "../../services/assetService";
import { getAVMTradeReporterAPI } from "../../api";
import {
  computeAddressImpacts,
  type AddressImpact,
} from "../../utils/balanceImpact";

const props = defineProps<{
  transactions: algosdk.indexerModels.Transaction[];
}>();

const { t, locale } = useI18n();
const api = getAVMTradeReporterAPI();

// Bumped whenever a previously unknown asset finishes loading so the rows
// re-render with the correct decimals/unit names.
const assetVersion = ref(0);
const assetPrices = ref<Record<string, number>>({});

const impacts = computed<AddressImpact[]>(() => {
  void assetVersion.value;
  return computeAddressImpacts(props.transactions);
});

const totalFee = computed(() => {
  let sum = 0n;
  for (const impact of impacts.value) {
    sum += impact.fee;
  }
  return sum;
});

function assetLabel(assetId: string): string {
  if (assetId === "0") return "Algorand (ALGO)";
  const info = assetService.getAssetInfo(BigInt(assetId));
  if (!info) return `${t("common.asset")} ${assetId}`;
  const name =
    info.unitName && info.unitName !== info.name
      ? `${info.name} (${info.unitName})`
      : info.name || `${t("common.asset")} ${assetId}`;
  return `${name} · ID ${assetId}`;
}

function assetDecimals(assetId: string): number {
  if (assetId === "0") return 6;
  return assetService.getAssetInfo(BigInt(assetId))?.decimals ?? 0;
}

function impactRows(impact: AddressImpact) {
  return impact.changes
    .filter((change) => change.amount !== 0n)
    .map((change) => {
      const decimals = assetDecimals(change.assetId);
      const amount = Number(change.amount) / Math.pow(10, decimals);
      const formatted = new Intl.NumberFormat(locale.value, {
        maximumFractionDigits: Math.min(Math.max(decimals, 2), 8),
      }).format(Math.abs(amount));
      const price = assetPrices.value[change.assetId] ?? 0;
      const formattedUSD =
        price > 0
          ? new Intl.NumberFormat(locale.value, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            }).format(Math.abs(amount * price))
          : null;
      return {
        assetId: change.assetId,
        positive: change.amount > 0n,
        label: assetLabel(change.assetId),
        formatted,
        formattedUSD,
      };
    });
}

const formatMicroAlgo = (amount: bigint) =>
  (Number(amount) / 1_000_000).toLocaleString(locale.value, {
    maximumFractionDigits: 6,
  });

// Load metadata + USD prices for every asset touched by the group.
watch(
  impacts,
  (list) => {
    const assetIds = new Set<string>();
    for (const impact of list) {
      for (const change of impact.changes) {
        assetIds.add(change.assetId);
      }
    }
    for (const assetId of assetIds) {
      if (assetId !== "0" && !assetService.getAssetInfo(BigInt(assetId))) {
        assetService.requestAsset(BigInt(assetId), () => {
          assetVersion.value += 1;
        });
      }
      if (assetPrices.value[assetId] === undefined) {
        assetPrices.value[assetId] = 0;
        api
          .getApiSearch({ q: assetId })
          .then((response) => {
            const asset = response.data.assets?.find(
              (a) => a.index === Number(assetId)
            );
            if (asset?.priceUSD) {
              assetPrices.value[assetId] = asset.priceUSD;
            }
          })
          .catch((e) => {
            console.error(`Failed to fetch price for asset ${assetId}`, e);
          });
      }
    }
  },
  { immediate: true }
);
</script>
