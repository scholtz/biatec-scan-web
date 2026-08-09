<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="members.length > 0" class="space-y-6">
      <!-- Group Header -->
      <div class="card">
        <h1 class="text-2xl font-bold text-white mb-4">
          {{ $t("group.title") }}
        </h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">{{ $t("group.groupId") }}</p>
            <div class="flex items-center gap-1 min-w-0">
              <p class="text-white font-mono text-sm break-all">
                {{ groupIdBase64 }}
              </p>
              <CopyToClipboard
                :text="groupIdBase64"
                :toast-message="$t('group.groupIdCopied')"
              />
            </div>
          </div>
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">{{ $t("transaction.block") }}</p>
            <router-link
              :to="{ name: 'BlockDetails', params: { round: round } }"
              class="text-primary-400 hover:text-primary-300 font-medium transition-colors duration-200 text-lg"
            >
              #{{ round }}
            </router-link>
            <p class="text-sm text-gray-400 mt-1">
              {{ $t("group.transactionCount", { count: rows.length }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Asset Balance Change -->
      <GroupBalanceChanges :transactions="memberTxs" />

      <!-- Transactions: Visual / Table -->
      <div class="card">
        <h2 class="text-xl font-semibold text-primary-400 mb-4">
          {{ $t("group.transactions") }}
        </h2>
        <div class="border-b border-gray-700 mb-4 flex gap-6">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="pb-2 text-sm font-medium transition-colors border-b-2 -mb-px"
            :class="
              activeTab === tab.key
                ? 'text-white border-primary-400'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            "
          >
            {{ $t(tab.labelKey) }}
          </button>
        </div>

        <GroupTransactionsVisual v-if="activeTab === 'visual'" :rows="rows" :round="round" />
        <GroupTransactionsTable v-else :rows="rows" :round="round" />
      </div>
    </div>

    <div v-else class="card text-center py-12">
      <h2 class="text-xl font-semibold text-white mb-2">
        {{ $t("group.notFound") }}
      </h2>
      <p class="text-gray-400 mb-4">
        {{ $t("group.notFoundDesc", { round: round }) }}
      </p>
      <router-link to="/" class="btn-primary">{{
        $t("common.backToDashboard")
      }}</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { algorandService } from "../services/algorandService";
import CopyToClipboard from "../components/CopyToClipboard.vue";
import GroupBalanceChanges from "../components/group/GroupBalanceChanges.vue";
import GroupTransactionsTable from "../components/group/GroupTransactionsTable.vue";
import GroupTransactionsVisual from "../components/group/GroupTransactionsVisual.vue";
import {
  buildGroupRows,
  collectGroupMembers,
  groupHexToBase64,
  type GroupMember,
} from "../utils/groupUtils";

const props = defineProps<{
  round: string;
  groupId: string; // hex-encoded 32-byte group id
}>();

const isLoading = ref(true);
const members = ref<GroupMember[]>([]);
const activeTab = ref<"visual" | "table">("visual");

const tabs = [
  { key: "visual" as const, labelKey: "group.visual" },
  { key: "table" as const, labelKey: "group.table" },
];

const groupIdBase64 = computed(() => {
  try {
    return groupHexToBase64(props.groupId);
  } catch {
    return "";
  }
});

const memberTxs = computed(() => members.value.map((m) => m.tx));
const rows = computed(() => buildGroupRows(members.value));

const load = async () => {
  isLoading.value = true;
  members.value = [];
  try {
    if (groupIdBase64.value) {
      // There is no indexer/algod query by group id, so load the whole
      // block and pick out the transactions with the requested group
      // (including inner transaction groups).
      const txns = await algorandService.getBlockTransactions(
        BigInt(props.round)
      );
      members.value = collectGroupMembers(txns, groupIdBase64.value);
    }
  } catch (error) {
    console.error("Error loading transaction group:", error);
    members.value = [];
  }
  isLoading.value = false;
};

watch(() => [props.round, props.groupId], load, { immediate: true });
</script>
