<template>
  <div
    class="p-3 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
    :class="{ 'ring-1 ring-blue-500': isCurrent }"
  >
    <div class="flex justify-between items-start mb-1">
      <router-link
        v-if="tx.id"
        :to="{ name: 'TransactionDetails', params: { txId: tx.id }, query: linkQuery }"
        class="text-blue-400 hover:text-blue-300 font-mono text-xs"
      >
        {{ algorandService.formatTransactionId(tx.id) }}
      </router-link>
      <span class="text-xs text-gray-400" v-if="tx['round-time']">
        <FormattedTime :timestamp="BigInt(tx['round-time'])" />
      </span>
    </div>
    <div class="flex justify-between items-center">
      <span class="text-gray-400 text-xs">{{ formatTransactionType(tx["tx-type"] || "unknown") }}</span>
      <div class="text-right">
        <div v-if="amountDisplay" class="text-white text-xs font-mono">
          {{ amountDisplay }}
        </div>
        <div class="text-white text-xs">
          {{ t("addressDetails.round") }} {{ tx["confirmed-round"] || "N/A" }}
        </div>
        <div class="text-gray-400 text-xs">
          {{ t("addressDetails.fee") }} {{ algorandService.formatAlgoAmount(tx.fee ?? 0) }} ALGO
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { algorandService } from "../../services/algorandService";
import { assetService } from "../../services/assetService";
import type { FilterableTransaction } from "../../utils/txFilter";
import FormattedTime from "../FormattedTime.vue";

const props = defineProps<{
  tx: FilterableTransaction;
  linkQuery?: Record<string, string | undefined>;
  isCurrent?: boolean;
}>();

const { t } = useI18n();

const formatTransactionType = (txType: string): string => {
  const typeMap: { [key: string]: string } = {
    pay: t("transaction.type.pay"),
    axfer: t("transaction.type.axfer"),
    acfg: t("transaction.type.acfg"),
    afrz: t("transaction.type.afrz"),
    appl: t("transaction.type.appl"),
    keyreg: t("transaction.type.keyreg"),
  };
  return typeMap[txType] || txType;
};

const amountDisplay = computed(() => {
  const txType = props.tx["tx-type"];
  if (txType === "pay") {
    const amount = props.tx["payment-transaction"]?.amount ?? 0;
    return `${algorandService.formatAlgoAmount(amount)} ALGO`;
  }
  if (txType === "axfer") {
    const axfer = props.tx["asset-transfer-transaction"];
    if (!axfer) return "";
    const assetId = axfer["asset-id"] ?? 0;
    const amount = axfer.amount ?? 0;
    const assetInfo = assetService.getAssetInfo(BigInt(assetId));
    if (!assetInfo) {
      assetService.requestAsset(BigInt(assetId), () => {});
      return `${amount} (${t("common.asset")} ${assetId})`;
    }
    const decimals = assetInfo.decimals || 0;
    const value = amount / Math.pow(10, decimals);
    const unitName = assetInfo.unitName || assetInfo.name || `${t("common.asset")} ${assetId}`;
    const formatted = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: Math.min(Math.max(decimals, 2), 8),
    }).format(value);
    return `${formatted} ${unitName} (ID ${assetId})`;
  }
  return "";
});
</script>
