<template>
  <div class="overflow-x-auto">
    <div :style="{ minWidth: `${11 + lanes.length * 9}rem` }">
      <!-- Lane headers -->
      <div class="flex">
        <div class="w-44 shrink-0"></div>
        <div class="flex-1 relative">
          <div
            class="grid"
            :style="{
              gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr))`,
            }"
          >
            <div
              v-for="lane in lanes"
              :key="lane.key"
              class="min-w-0 px-1 pb-3 text-center text-xs"
            >
              <template v-if="lane.kind === 'app'">
                <div class="flex items-center justify-center gap-1 min-w-0">
                  <router-link
                    :to="{
                      name: 'ApplicationDetails',
                      params: { appId: lane.appId!.toString() },
                    }"
                    class="text-blue-400 hover:text-blue-300 font-mono truncate"
                  >
                    {{ lane.appId!.toString() }}
                  </router-link>
                  <span
                    class="lane-badge border-gray-500 text-gray-300 shrink-0"
                    >{{ lane.number }}</span
                  >
                </div>
                <div
                  class="flex items-center justify-center gap-1 min-w-0 mt-0.5"
                >
                  <span class="text-gray-500 shrink-0">🔗</span>
                  <router-link
                    :to="{
                      name: 'AddressDetails',
                      params: { address: lane.address },
                    }"
                    class="text-blue-400 hover:text-blue-300 font-mono truncate"
                  >
                    {{ algorandService.formatAddress(lane.address!) }}
                  </router-link>
                </div>
              </template>
              <template v-else-if="lane.kind === 'account'">
                <div class="flex items-center justify-center gap-1 min-w-0">
                  <router-link
                    :to="{
                      name: 'AddressDetails',
                      params: { address: lane.address },
                    }"
                    class="text-blue-400 hover:text-blue-300 font-mono truncate"
                  >
                    {{ algorandService.formatAddress(lane.address!) }}
                  </router-link>
                  <span
                    class="lane-badge border-gray-500 text-gray-300 shrink-0"
                    >{{ lane.number }}</span
                  >
                </div>
              </template>
              <template v-else>
                <span class="text-gray-300 font-mono">{{
                  t("group.opUp")
                }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction rows -->
      <div
        v-for="spec in rowSpecs"
        :key="spec.row.key"
        class="flex items-stretch"
      >
        <!-- Tree label -->
        <div
          class="w-44 shrink-0 flex items-center min-w-0"
          :style="{ paddingLeft: `${spec.row.depth * 0.75}rem` }"
        >
          <span
            v-if="spec.row.depth > 0"
            class="text-gray-600 shrink-0 font-mono"
            >└</span
          >
          <router-link
            :to="rowTxRoute(spec.row)"
            class="text-blue-400 hover:text-blue-300 font-mono text-xs truncate underline decoration-dotted underline-offset-4"
          >
            {{
              spec.row.label ||
              `${(spec.row.tx.id ?? "").slice(0, 7)}…`
            }}
          </router-link>
        </div>

        <!-- Lanes area -->
        <div class="flex-1 relative h-16">
          <!-- vertical dashed guide lines -->
          <div
            v-for="(lane, i) in lanes"
            :key="lane.key"
            class="absolute top-0 bottom-0 border-l border-dashed border-gray-700/70"
            :style="{ left: laneCenter(i) }"
          ></div>

          <!-- self loop -->
          <div
            v-if="spec.fromIndex === spec.toIndex"
            class="absolute top-1/2 -translate-y-1/2 flex items-center"
            :style="{ left: `calc(${laneCenter(spec.fromIndex)} - 0.625rem)` }"
          >
            <span
              class="lane-badge shrink-0"
              :style="{ borderColor: spec.color, color: spec.color }"
              >{{ spec.fromBadge }}</span
            >
            <div
              class="border rounded px-2 py-0.5 text-xs text-center leading-tight -ml-px"
              :style="{ borderColor: spec.color, color: spec.color }"
            >
              <div>{{ spec.typeText }}</div>
              <div v-if="spec.row.tx.assetTransferTransaction">
                {{ spec.amountText }}
                <router-link
                  :to="{
                    name: 'AssetDetails',
                    params: {
                      assetId:
                        spec.row.tx.assetTransferTransaction.assetId.toString(),
                    },
                  }"
                  class="underline"
                  :style="{ color: spec.color }"
                >
                  {{ assetUnit(spec.row.tx.assetTransferTransaction.assetId) }}
                </router-link>
              </div>
              <div v-else-if="spec.amountText">{{ spec.amountText }}</div>
            </div>
          </div>

          <!-- arrow between two lanes -->
          <div
            v-else
            class="absolute top-1/2 -translate-y-1/2"
            :style="{
              left: `calc(${laneCenter(Math.min(spec.fromIndex, spec.toIndex))} - 0.625rem)`,
              width: `calc(${arrowWidth(spec)} + 1.25rem)`,
            }"
          >
            <div class="flex items-center">
              <!-- left endpoint -->
              <span
                class="lane-badge shrink-0 bg-dark-900"
                :style="{ borderColor: spec.color, color: spec.color }"
                >{{
                  spec.fromIndex < spec.toIndex ? spec.fromBadge : spec.toBadge
                }}</span
              >
              <!-- line + label -->
              <div class="flex-1 relative flex items-center min-w-0">
                <span
                  v-if="spec.fromIndex > spec.toIndex"
                  class="shrink-0 text-[10px] leading-none"
                  :style="{ color: spec.color }"
                  >◀</span
                >
                <div
                  class="flex-1 border-t"
                  :style="{ borderColor: spec.color }"
                ></div>
                <div
                  class="absolute left-1/2 -translate-x-1/2 bottom-1/2 text-xs text-center leading-tight whitespace-nowrap px-1"
                  :style="{ color: spec.color }"
                >
                  <div>{{ spec.typeText }}</div>
                  <div v-if="spec.row.tx.assetTransferTransaction">
                    {{ spec.amountText }}
                    <router-link
                      :to="{
                        name: 'AssetDetails',
                        params: {
                          assetId:
                            spec.row.tx.assetTransferTransaction.assetId.toString(),
                        },
                      }"
                      class="underline"
                      :style="{ color: spec.color }"
                    >
                      {{
                        assetUnit(spec.row.tx.assetTransferTransaction.assetId)
                      }}
                    </router-link>
                  </div>
                  <div v-else-if="spec.amountText">{{ spec.amountText }}</div>
                </div>
                <span
                  v-if="spec.fromIndex < spec.toIndex"
                  class="shrink-0 text-[10px] leading-none"
                  :style="{ color: spec.color }"
                  >▶</span
                >
              </div>
              <!-- right endpoint -->
              <span
                class="lane-badge shrink-0 bg-dark-900"
                :style="{ borderColor: spec.color, color: spec.color }"
                >{{
                  spec.fromIndex < spec.toIndex ? spec.toBadge : spec.fromBadge
                }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { algorandService } from "../../services/algorandService";
import { assetService } from "../../services/assetService";
import { nativeTokenUnit } from "../../config/env";
import { rowTxRoute, type GroupTxRow } from "../../utils/groupUtils";

const props = defineProps<{
  rows: GroupTxRow[];
  round: string;
}>();

const { t } = useI18n();
const assetVersion = ref(0);

interface Lane {
  key: string;
  kind: "account" | "app" | "opup";
  appId?: bigint;
  address?: string;
  number: number | null;
}

interface RowSpec {
  row: GroupTxRow;
  fromIndex: number;
  toIndex: number;
  color: string;
  typeText: string;
  amountText: string;
  fromBadge: string;
  toBadge: string;
}

const TYPE_COLORS: Record<string, string> = {
  pay: "#f87171",
  axfer: "#e879f9",
  appl: "#38bdf8",
  acfg: "#fb923c",
  afrz: "#22d3ee",
  keyreg: "#f472b6",
  stpf: "#facc15",
};

// App ids that are actually called (not just created) somewhere in the
// group. Apps created but never called are ephemeral "OpUp" budget apps and
// share one unlabeled lane, like Lora does.
const calledAppIds = computed(() => {
  const ids = new Set<string>();
  for (const { tx } of props.rows) {
    const appId = tx.applicationTransaction?.applicationId;
    if (appId) ids.add(appId.toString());
  }
  return ids;
});

const laneModel = computed(() => {
  const lanes: Lane[] = [];
  const byAddress = new Map<string, number>();
  const byAppId = new Map<string, number>();
  let opupIndex = -1;

  const laneForApp = (appId: bigint): number => {
    const key = appId.toString();
    const existing = byAppId.get(key);
    if (existing !== undefined) return existing;
    const address = algosdk.getApplicationAddress(appId).toString();
    const addrLane = byAddress.get(address);
    if (addrLane !== undefined) {
      // Upgrade an account lane that turned out to be this app's escrow
      lanes[addrLane].kind = "app";
      lanes[addrLane].appId = appId;
      byAppId.set(key, addrLane);
      return addrLane;
    }
    const index = lanes.length;
    lanes.push({
      key: `app:${key}`,
      kind: "app",
      appId,
      address,
      number: index + 1,
    });
    byAppId.set(key, index);
    byAddress.set(address, index);
    return index;
  };

  const laneForAddress = (address: string): number => {
    const existing = byAddress.get(address);
    if (existing !== undefined) return existing;
    const index = lanes.length;
    lanes.push({
      key: `addr:${address}`,
      kind: "account",
      address,
      number: index + 1,
    });
    byAddress.set(address, index);
    return index;
  };

  const laneForOpUp = (): number => {
    if (opupIndex === -1) {
      opupIndex = lanes.length;
      lanes.push({ key: "opup", kind: "opup", number: null });
    }
    return opupIndex;
  };

  const specs: RowSpec[] = [];
  for (const row of props.rows) {
    const tx = row.tx;
    const sender = tx.sender?.toString() ?? "";
    const fromIndex = laneForAddress(sender);

    let toIndex = fromIndex;
    let typeText = tx.txType ? t(`transaction.type.${tx.txType}`) : "";
    let amountText = "";

    if (tx.paymentTransaction) {
      toIndex = laneForAddress(tx.paymentTransaction.receiver.toString());
      typeText = t("group.payment");
      amountText = `${algorandService.formatAlgoAmount(
        tx.paymentTransaction.amount
      )} ${nativeTokenUnit}`;
    } else if (tx.assetTransferTransaction) {
      toIndex = laneForAddress(
        tx.assetTransferTransaction.receiver.toString()
      );
      typeText = t("group.transfer");
      amountText = formatAssetAmount(tx.assetTransferTransaction);
    } else if (tx.applicationTransaction) {
      const appl = tx.applicationTransaction;
      if (appl.applicationId) {
        toIndex = laneForApp(BigInt(appl.applicationId));
        typeText = t("group.appCall");
      } else {
        typeText = t("group.appCreate");
        const createdId = tx.createdApplicationIndex;
        toIndex =
          createdId && calledAppIds.value.has(createdId.toString())
            ? laneForApp(BigInt(createdId))
            : laneForOpUp();
      }
    }

    const toLane = lanes[toIndex];
    specs.push({
      row,
      fromIndex,
      toIndex,
      color: TYPE_COLORS[tx.txType ?? ""] ?? "#9ca3af",
      typeText,
      amountText,
      fromBadge: (fromIndex + 1).toString(),
      // App/OpUp targets show an empty circle, account targets their number
      toBadge: toLane.kind === "account" ? (toIndex + 1).toString() : "",
    });
  }

  return { lanes, specs };
});

const lanes = computed(() => laneModel.value.lanes);
const rowSpecs = computed(() => laneModel.value.specs);

const laneCenter = (index: number) =>
  `${(((index + 0.5) / lanes.value.length) * 100).toFixed(4)}%`;

const arrowWidth = (spec: RowSpec) =>
  `${(
    (Math.abs(spec.toIndex - spec.fromIndex) / lanes.value.length) *
    100
  ).toFixed(4)}%`;

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
  return (Number(axfer.amount ?? 0) / Math.pow(10, decimals)).toLocaleString(
    undefined,
    { maximumFractionDigits: Math.min(Math.max(decimals, 2), 8) }
  );
};
</script>

<style scoped>
.lane-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  border-width: 1px;
  font-size: 0.65rem;
  font-family: ui-monospace, monospace;
}
</style>
