<template>
  <div class="space-y-2">
    <div class="grid grid-cols-2 gap-2">
      <div class="space-y-1">
        <label class="text-xs text-gray-400">{{
          t("addressDetails.txTypeFilter")
        }}</label>
        <select v-model="type" class="filter-control text-sm">
          <option value="">{{ t("addressDetails.allTypes") }}</option>
          <option value="pay">{{ t("transaction.type.pay") }}</option>
          <option value="axfer">{{ t("transaction.type.axfer") }}</option>
          <option value="acfg">{{ t("transaction.type.acfg") }}</option>
          <option value="afrz">{{ t("transaction.type.afrz") }}</option>
          <option value="appl">{{ t("transaction.type.appl") }}</option>
          <option value="keyreg">{{ t("transaction.type.keyreg") }}</option>
        </select>
      </div>
      <div class="space-y-1">
        <label class="text-xs text-gray-400">{{
          t("addressDetails.txMinAmountFilter")
        }}</label>
        <input
          type="number"
          v-model="minAmount"
          min="0"
          step="any"
          inputmode="decimal"
          class="filter-control text-sm"
        />
      </div>
    </div>
    <div v-if="type === 'axfer'" class="space-y-1">
      <label class="text-xs text-gray-400">{{
        t("addressDetails.txAssetIdFilter")
      }}</label>
      <input
        type="number"
        v-model="assetIdInput"
        min="0"
        step="1"
        inputmode="numeric"
        :placeholder="t('addressDetails.txAssetIdPlaceholder')"
        class="filter-control text-sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { TxFilterState } from "../../utils/txFilter";

const { t } = useI18n();

const filter = defineModel<TxFilterState>({ required: true });

const type = computed({
  get: () => filter.value.type,
  set: (v: string) => {
    filter.value = { ...filter.value, type: v, assetId: v === "axfer" ? filter.value.assetId : null };
  },
});

const minAmount = computed({
  get: () => filter.value.minAmount,
  set: (v: string) => {
    filter.value = { ...filter.value, minAmount: v };
  },
});

const assetIdInput = computed({
  get: () => (filter.value.assetId !== null ? String(filter.value.assetId) : ""),
  set: (v: string) => {
    const parsed = v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;
    filter.value = { ...filter.value, assetId: parsed };
  },
});
</script>

<style scoped>
.filter-control {
  width: 100%;
  border-radius: 0.25rem;
  border: 1px solid rgb(71 85 105 / 0.7);
  background: rgb(15 23 42 / 0.6);
  padding: 0.5rem 0.75rem;
  color: white;
}

.filter-control::placeholder {
  color: #64748b;
}
</style>
