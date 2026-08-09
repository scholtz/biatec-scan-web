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
      v-if="loading"
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
        <div
          v-for="row in deltaRows"
          :key="row.assetId"
          class="flex justify-between items-center p-3 bg-gray-800 rounded"
        >
          <span class="text-white text-sm truncate mr-2">{{ row.label }}</span>
          <span
            class="font-mono text-sm flex-shrink-0"
            :class="row.amount > 0 ? 'text-green-400' : 'text-red-400'"
          >
            {{ row.amount > 0 ? "+" : "-" }}{{ row.formatted }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { assetService } from "../../services/assetService";
import { useAddressBalanceHistory } from "../../composables/useAddressBalanceHistory";
import { computeBalanceDeltas } from "../../utils/balanceDelta";
import { assetDecimals } from "../../utils/txFilter";

const props = defineProps<{ address: string }>();

const { t, locale } = useI18n();

const address = computed(() => props.address);
const { transactions, loading, earliestTime, coversTime } =
  useAddressBalanceHistory(address);

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
  () => !loading.value && !coversTime(sinceSeconds.value),
);

const earliestDateLabel = computed(() => {
  if (earliestTime.value === null) return "";
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(earliestTime.value * 1000));
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
    transactions.value,
    address.value,
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
      return { assetId, amount, formatted, label: assetLabel(assetId) };
    })
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
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
