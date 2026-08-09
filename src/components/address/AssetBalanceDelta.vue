<template>
  <div class="card space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h2 class="text-xl font-semibold">
        {{ t("addressDetails.balanceChange") }}
      </h2>
      <select v-model="durationKey" class="filter-control text-sm w-auto">
        <option v-for="opt in durationOptions" :key="opt.key" :value="opt.key">
          {{ t(opt.labelKey) }}
        </option>
      </select>
    </div>

    <div
      v-if="props.loading"
      class="text-center py-4 text-gray-400 text-sm"
    >
      <div
        class="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
      ></div>
      {{ t("common.loading") }}
    </div>

    <template v-else>
      <div
        v-if="showCoverageWarning"
        class="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-2"
      >
        {{
          t("addressDetails.balanceChangeCoverageWarning", {
            date: earliestDateLabel,
          })
        }}
      </div>

      <div
        v-if="deltaRows.length === 0"
        class="text-center py-4 text-gray-400 text-sm"
      >
        {{ t("addressDetails.balanceChangeEmpty") }}
      </div>

      <div v-else class="space-y-2">
        <div class="flex justify-between items-center px-3 text-xs text-gray-500">
          <span>{{ t("addressDetails.balanceChangeAsset") }}</span>
          <div class="text-right">
            <div>{{ t("addressDetails.balanceChangeAmount") }}</div>
            <div>{{ t("addressDetails.balanceChangeValuationUSD") }}</div>
          </div>
        </div>
        <div
          v-for="row in deltaRows"
          :key="row.assetId"
          class="flex justify-between items-center p-3 bg-gray-800 rounded"
        >
          <span class="text-white text-sm truncate mr-2">{{ row.label }}</span>
          <div class="text-right flex-shrink-0">
            <div
              class="font-mono text-sm"
              :class="row.amount > 0 ? 'text-green-400' : 'text-red-400'"
            >
              {{ row.amount > 0 ? "+" : "-" }}{{ row.formatted }}
            </div>
            <div
              v-if="row.formattedUSD"
              class="font-mono text-xs"
              :class="row.amount > 0 ? 'text-green-400/70' : 'text-red-400/70'"
            >
              {{ row.amount > 0 ? "+" : "-" }}{{ row.formattedUSD }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { assetService } from "../../services/assetService";
import { computeBalanceDeltas, historyCoversTime } from "../../utils/balanceDelta";
import { assetDecimals, type FilterableTransaction } from "../../utils/txFilter";

const props = defineProps<{
  address: string;
  transactions: FilterableTransaction[];
  loading: boolean;
  truncated: boolean;
  earliestTime: number | null;
  assetPrices: Record<number, number>;
}>();

const { t, locale } = useI18n();

const durationOptions = [
  { key: "1h", labelKey: "addressDetails.duration1h", seconds: 60 * 60 },
  { key: "24h", labelKey: "addressDetails.duration24h", seconds: 24 * 60 * 60 },
  { key: "7d", labelKey: "addressDetails.duration7d", seconds: 7 * 24 * 60 * 60 },
  { key: "30d", labelKey: "addressDetails.duration30d", seconds: 30 * 24 * 60 * 60 },
  { key: "90d", labelKey: "addressDetails.duration90d", seconds: 90 * 24 * 60 * 60 },
  { key: "1y", labelKey: "addressDetails.duration1y", seconds: 365 * 24 * 60 * 60 },
];

const durationKey = ref("24h");
const forceUpdate = ref(0);

const sinceSeconds = computed(() => {
  const opt = durationOptions.find((o) => o.key === durationKey.value);
  const seconds = opt?.seconds ?? durationOptions[1].seconds;
  return Math.floor(Date.now() / 1000) - seconds;
});

const showCoverageWarning = computed(
  () =>
    !props.loading &&
    !historyCoversTime(props.truncated, props.earliestTime, sinceSeconds.value),
);

const earliestDateLabel = computed(() => {
  if (props.earliestTime === null) return "";
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(props.earliestTime * 1000));
});

function assetLabel(assetId: number): string {
  if (assetId === 0) return "Algorand (ALGO)";
  const info = assetService.getAssetInfo(BigInt(assetId));
  if (!info) {
    assetService.requestAsset(BigInt(assetId), () => {
      forceUpdate.value += 1;
    });
    return `${t("common.asset")} ${assetId}`;
  }
  const name =
    info.unitName && info.unitName !== info.name
      ? `${info.name} (${info.unitName})`
      : info.name || `${t("common.asset")} ${assetId}`;
  return `${name} · ID ${assetId}`;
}

const deltaRows = computed(() => {
  void forceUpdate.value; // re-run when async asset metadata loads
  const deltas = computeBalanceDeltas(
    props.transactions,
    props.address,
    sinceSeconds.value,
  );
  return Array.from(deltas.entries())
    .filter(([, raw]) => raw !== 0)
    .map(([assetId, raw]) => {
      const decimals = assetDecimals(assetId);
      const amount = raw / Math.pow(10, decimals);
      const formatted = new Intl.NumberFormat(locale.value, {
        maximumFractionDigits: Math.min(Math.max(decimals, 2), 8),
      }).format(Math.abs(amount));
      const price = props.assetPrices[assetId] ?? 0;
      const valuationUSD = amount * price;
      const formattedUSD =
        price > 0
          ? new Intl.NumberFormat(locale.value, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            }).format(Math.abs(valuationUSD))
          : null;
      return {
        assetId,
        amount,
        formatted,
        label: assetLabel(assetId),
        valuationUSD,
        formattedUSD,
      };
    })
    .sort((a, b) => Math.abs(b.valuationUSD) - Math.abs(a.valuationUSD));
});
</script>

<style scoped>
.filter-control {
  border-radius: 0.25rem;
  border: 1px solid rgb(71 85 105 / 0.7);
  background: rgb(15 23 42 / 0.6);
  padding: 0.5rem 0.75rem;
  color: white;
}
</style>
