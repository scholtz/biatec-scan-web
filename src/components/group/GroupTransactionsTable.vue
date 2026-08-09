<template>
  <div>
    <!-- Header row -->
    <div
      class="grid gap-2 px-3 py-2 bg-dark-900 border border-gray-700 rounded-t-lg text-xs text-gray-400 font-semibold"
      :style="gridStyle"
    >
      <div class="min-w-0">{{ t("group.txId") }}</div>
      <div class="min-w-0">{{ t("group.groupId") }}</div>
      <div class="min-w-0">{{ t("group.from") }}</div>
      <div class="min-w-0">{{ t("group.to") }}</div>
      <div class="min-w-0">{{ t("group.type") }}</div>
      <div class="min-w-0 text-right">{{ t("group.amount") }}</div>
      <div class="min-w-0 text-right">{{ t("group.fee") }}</div>
    </div>

    <!-- Data rows -->
    <div
      v-for="row in pagedRows"
      :key="row.key"
      class="grid gap-2 px-3 py-2 border-x border-b border-gray-700/60 text-sm items-center hover:bg-gray-800/40 transition-colors"
      :style="gridStyle"
    >
      <!-- Transaction ID + expand toggle -->
      <div
        class="min-w-0 flex items-center gap-1"
        :style="{ paddingLeft: `${row.depth * 1.25}rem` }"
      >
        <button
          v-if="row.hasChildren"
          @click="toggle(row.key)"
          class="text-gray-400 hover:text-white w-4 shrink-0 text-xs"
          :aria-label="t('group.toggleInner')"
        >
          {{ expanded.has(row.key) ? "▾" : "▸" }}
        </button>
        <span v-else class="w-4 shrink-0"></span>
        <router-link
          :to="rowTxRoute(row)"
          class="text-blue-400 hover:text-blue-300 font-mono text-xs truncate"
        >
          {{ rowLabel(row) }}
        </router-link>
      </div>

      <!-- Group ID -->
      <div class="min-w-0">
        <router-link
          v-if="row.tx.group"
          :to="groupRoute(round, row.tx.group)"
          class="text-blue-400 hover:text-blue-300 font-mono text-xs truncate block"
        >
          {{ shortGroup(row.tx.group) }}
        </router-link>
      </div>

      <!-- From -->
      <div class="min-w-0">
        <router-link
          v-if="row.tx.sender"
          :to="{ name: 'AddressDetails', params: { address: row.tx.sender } }"
          class="text-blue-400 hover:text-blue-300 font-mono text-xs truncate block"
        >
          {{ algorandService.formatAddress(row.tx.sender) }}
        </router-link>
      </div>

      <!-- To -->
      <div class="min-w-0">
        <router-link
          v-if="receiverAddress(row.tx)"
          :to="{
            name: 'AddressDetails',
            params: { address: receiverAddress(row.tx) },
          }"
          class="text-blue-400 hover:text-blue-300 font-mono text-xs truncate block"
        >
          {{ algorandService.formatAddress(receiverAddress(row.tx)!) }}
        </router-link>
        <router-link
          v-else-if="targetAppId(row.tx)"
          :to="{
            name: 'ApplicationDetails',
            params: { appId: targetAppId(row.tx)!.toString() },
          }"
          class="text-blue-400 hover:text-blue-300 font-mono text-xs truncate block"
        >
          {{ targetAppId(row.tx)!.toString() }}
        </router-link>
      </div>

      <!-- Type -->
      <div class="min-w-0">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs whitespace-nowrap"
          :class="typeBadgeClass(row.tx)"
        >
          <span>{{ getTypeIcon(row.tx.txType ?? "") }}</span>
          <span class="truncate">{{ typeLabel(row.tx) }}</span>
        </span>
      </div>

      <!-- Amount -->
      <div class="min-w-0 text-right font-mono text-xs text-white">
        <template v-if="row.tx.paymentTransaction">
          {{ algorandService.formatAlgoAmount(row.tx.paymentTransaction.amount) }}
          ALGO
        </template>
        <template v-else-if="row.tx.assetTransferTransaction">
          {{ formatAssetAmount(row.tx.assetTransferTransaction) }}
          <router-link
            :to="{
              name: 'AssetDetails',
              params: {
                assetId: row.tx.assetTransferTransaction.assetId.toString(),
              },
            }"
            class="text-blue-400 hover:text-blue-300"
          >
            {{ assetUnit(row.tx.assetTransferTransaction.assetId) }}
          </router-link>
        </template>
      </div>

      <!-- Fee -->
      <div class="min-w-0 text-right font-mono text-xs text-white">
        {{ algorandService.formatAlgoAmount(row.tx.fee ?? 0) }} ALGO
      </div>
    </div>

    <!-- Footer: rows per page + pagination -->
    <div
      class="flex items-center justify-between flex-wrap gap-2 px-3 py-2 border-x border-b border-gray-700 rounded-b-lg text-xs text-gray-400"
    >
      <label class="flex items-center gap-2">
        {{ t("group.rowsPerPage") }}
        <select
          v-model.number="rowsPerPage"
          class="bg-dark-900 border border-gray-700 rounded px-2 py-1 text-white"
        >
          <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">
            {{ n }}
          </option>
        </select>
      </label>
      <span>{{ t("group.pageOf", { page: page + 1, total: totalPages }) }}</span>
      <div class="flex items-center gap-1">
        <button
          class="btn-secondary text-xs px-2 py-1"
          :disabled="page === 0"
          @click="page = 0"
        >
          «
        </button>
        <button
          class="btn-secondary text-xs px-2 py-1"
          :disabled="page === 0"
          @click="page--"
        >
          ‹
        </button>
        <button
          class="btn-secondary text-xs px-2 py-1"
          :disabled="page + 1 >= totalPages"
          @click="page++"
        >
          ›
        </button>
        <button
          class="btn-secondary text-xs px-2 py-1"
          :disabled="page + 1 >= totalPages"
          @click="page = totalPages - 1"
        >
          »
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { algorandService } from "../../services/algorandService";
import { assetService } from "../../services/assetService";
import { getTypeIcon } from "../../utils/transactionUtils";
import {
  groupRoute,
  rowTxRoute,
  type GroupTxRow,
} from "../../utils/groupUtils";

const props = defineProps<{
  rows: GroupTxRow[];
  round: string;
}>();

const { t } = useI18n();

// 7 columns; minmax(0, …fr) keeps every row's tracks aligned regardless of
// content (see CLAUDE.md grid notes).
const gridStyle = {
  gridTemplateColumns:
    "minmax(0,1.5fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,1.3fr) minmax(0,1.1fr) minmax(0,0.8fr)",
};

const expanded = ref(new Set<string>());
const page = ref(0);
const rowsPerPage = ref(100);
const assetVersion = ref(0);

const toggle = (key: string) => {
  const next = new Set(expanded.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expanded.value = next;
};

// A row is visible when every ancestor is expanded.
const visibleRows = computed(() => {
  const visibleKeys = new Set<string>();
  const result: GroupTxRow[] = [];
  for (const row of props.rows) {
    if (row.parentKey === null || (visibleKeys.has(row.parentKey) && expanded.value.has(row.parentKey))) {
      visibleKeys.add(row.key);
      result.push(row);
    }
  }
  return result;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(visibleRows.value.length / rowsPerPage.value))
);

const pagedRows = computed(() =>
  visibleRows.value.slice(
    page.value * rowsPerPage.value,
    (page.value + 1) * rowsPerPage.value
  )
);

watch([() => props.rows, rowsPerPage], () => {
  page.value = 0;
});

const rowLabel = (row: GroupTxRow) =>
  row.label || algorandService.formatTransactionId(row.tx.id ?? "");

const shortGroup = (group: Uint8Array) => {
  const b64 = algosdk.bytesToBase64(group);
  return `${b64.slice(0, 7)}…`;
};

const receiverAddress = (
  tx: algosdk.indexerModels.Transaction
): string | null =>
  tx.paymentTransaction?.receiver?.toString() ??
  tx.assetTransferTransaction?.receiver?.toString() ??
  null;

const targetAppId = (tx: algosdk.indexerModels.Transaction): bigint | null => {
  const appl = tx.applicationTransaction;
  if (!appl) return null;
  const id = appl.applicationId || tx.createdApplicationIndex;
  return id ? BigInt(id) : null;
};

const isAppCreate = (tx: algosdk.indexerModels.Transaction) =>
  !!tx.applicationTransaction && !tx.applicationTransaction.applicationId;

const typeLabel = (tx: algosdk.indexerModels.Transaction) => {
  if (isAppCreate(tx)) return t("group.appCreate");
  const type = tx.txType ?? "";
  return type ? t(`transaction.type.${type}`) : "";
};

const typeBadgeClass = (tx: algosdk.indexerModels.Transaction) => {
  const classes: Record<string, string> = {
    pay: "bg-red-500/15 text-red-300 border border-red-500/40",
    axfer: "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/40",
    appl: "bg-sky-500/15 text-sky-300 border border-sky-500/40",
    acfg: "bg-orange-500/15 text-orange-300 border border-orange-500/40",
    afrz: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40",
    keyreg: "bg-pink-500/15 text-pink-300 border border-pink-500/40",
    stpf: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/40",
  };
  return (
    classes[tx.txType ?? ""] ||
    "bg-gray-500/15 text-gray-300 border border-gray-500/40"
  );
};

const assetInfoFor = (assetId: bigint | number) => {
  void assetVersion.value;
  const info = assetService.getAssetInfo(BigInt(assetId));
  if (!info) {
    assetService.requestAsset(BigInt(assetId), () => {
      assetVersion.value += 1;
    });
  }
  return info;
};

const assetUnit = (assetId: bigint | number) => {
  const info = assetInfoFor(assetId);
  return info?.unitName || info?.name || `#${assetId}`;
};

const formatAssetAmount = (
  axfer: NonNullable<
    algosdk.indexerModels.Transaction["assetTransferTransaction"]
  >
) => {
  const info = assetInfoFor(axfer.assetId);
  const decimals = info?.decimals ?? 0;
  const value = Number(axfer.amount ?? 0) / Math.pow(10, decimals);
  return value.toLocaleString(undefined, {
    maximumFractionDigits: Math.min(Math.max(decimals, 2), 8),
  });
};
</script>
