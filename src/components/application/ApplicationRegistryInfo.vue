<template>
  <div v-if="approvalHash" class="space-y-4" data-testid="arc56-registry-info">
    <div v-if="isLoading" class="card flex justify-center py-6">
      <div class="loading-spinner"></div>
    </div>

    <!-- Hash not in the registry: loud warning, since the contract is unverified/unknown. -->
    <div
      v-else-if="lookup?.state === 'not-found'"
      class="rounded-lg border border-red-500 bg-red-900/40 p-4"
      role="alert"
      data-testid="arc56-not-found"
    >
      <p class="text-red-300 font-semibold">⚠ {{ $t("applicationDetails.registryNotFoundTitle") }}</p>
      <p class="text-red-200 text-sm mt-1">{{ $t("applicationDetails.registryNotFoundBody") }}</p>
    </div>

    <!-- Registry unreachable: neutral notice, never a false "not found". -->
    <div
      v-else-if="lookup?.state === 'error'"
      class="rounded-lg border border-yellow-600 bg-yellow-900/30 p-4"
      data-testid="arc56-error"
    >
      <p class="text-yellow-200 text-sm">{{ $t("applicationDetails.registryUnavailable") }}</p>
    </div>

    <div v-else-if="contract" class="card" data-testid="arc56-found">
      <h2 class="text-xl font-semibold text-white mb-1">
        {{ $t("applicationDetails.registryTitle") }}
      </h2>
      <p class="text-sm text-gray-400 mb-4">{{ $t("applicationDetails.registryHint") }}</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-dark-900 p-4 rounded-lg border border-gray-700 min-w-0">
          <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.registryContractName") }}</p>
          <p class="text-white font-medium break-words">{{ contract.name }}</p>
        </div>
        <div class="bg-dark-900 p-4 rounded-lg border border-gray-700 min-w-0">
          <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.registryMethods") }}</p>
          <p class="text-white font-medium text-lg">{{ contract.methods?.length ?? 0 }}</p>
        </div>
        <div
          v-if="structCount > 0"
          class="bg-dark-900 p-4 rounded-lg border border-gray-700 min-w-0"
        >
          <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.registryStructs") }}</p>
          <p class="text-white font-medium text-lg">{{ structCount }}</p>
        </div>
        <div
          v-if="contract.arcs?.length"
          class="bg-dark-900 p-4 rounded-lg border border-gray-700 min-w-0"
        >
          <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.registryArcs") }}</p>
          <p class="text-white font-medium">
            {{ contract.arcs.map((n) => `ARC-${n}`).join(", ") }}
          </p>
        </div>
        <div
          v-if="compiler"
          class="bg-dark-900 p-4 rounded-lg border border-gray-700 min-w-0"
        >
          <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.registryCompiler") }}</p>
          <p class="text-white font-medium break-words">{{ compiler }}</p>
        </div>
        <div
          v-if="contract.state?.schema?.global"
          class="bg-dark-900 p-4 rounded-lg border border-gray-700 min-w-0"
        >
          <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.registryDeclaredGlobal") }}</p>
          <p class="text-white font-medium">
            {{ $t("applicationDetails.integers") }}: {{ contract.state.schema.global.ints }},
            {{ $t("applicationDetails.byteSlices") }}: {{ contract.state.schema.global.bytes }}
          </p>
        </div>
      </div>

      <div v-if="contract.desc" class="mt-4">
        <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.registryDescription") }}</p>
        <p class="text-gray-200 text-sm whitespace-pre-wrap break-words">{{ contract.desc }}</p>
      </div>

      <div v-if="contract.methods?.length" class="mt-4">
        <p class="text-sm text-gray-400 mb-2">{{ $t("applicationDetails.registryMethodList") }}</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="m in contract.methods"
            :key="m.name + m.args.map((a) => a.type).join(',')"
            class="px-2 py-1 rounded bg-dark-900 border border-gray-700 text-xs font-mono text-gray-200"
            :title="m.desc"
          >
            {{ m.name }}({{ m.args.map((a) => a.type).join(",") }})
          </span>
        </div>
      </div>

      <!-- Owners, ranked by registry reputation score -->
      <div class="mt-6">
        <h3 class="text-lg font-semibold text-purple-400 mb-2">
          {{ $t("applicationDetails.registryOwners") }}
        </h3>
        <p v-if="ownersFailed" class="text-sm text-yellow-200" data-testid="arc56-owners-error">
          {{ $t("applicationDetails.registryOwnersUnavailable") }}
        </p>
        <p v-else-if="ownersLoaded && rankedOwners.length === 0" class="text-sm text-gray-400">
          {{ $t("applicationDetails.registryNoOwners") }}
        </p>
        <ul v-else class="space-y-2">
          <li
            v-for="(o, i) in rankedOwners"
            :key="o.owner + '/' + o.repo"
            class="bg-dark-900 p-3 rounded-lg border border-gray-700 flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0"
            data-testid="arc56-owner"
          >
            <span class="text-gray-400 text-sm">#{{ i + 1 }}</span>
            <a
              v-if="safeGithubUrl(o.url)"
              :href="safeGithubUrl(o.url)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 font-mono text-sm break-all min-w-0"
            >
              {{ o.owner }}/{{ o.repo }} <span class="text-xs">↗</span>
            </a>
            <span v-else class="text-white font-mono text-sm break-all min-w-0">
              {{ o.owner }}/{{ o.repo }}
            </span>
            <span v-if="o.reputationScore !== undefined" class="text-sm text-gray-300">
              {{ $t("applicationDetails.registryReputation") }}:
              <span class="text-white font-medium">{{ o.reputationScore }}</span>
            </span>
            <span
              v-if="o.riskLevel || o.banned"
              class="px-2 py-0.5 rounded text-xs font-medium"
              :class="toneClass(riskTone(o))"
            >
              {{ o.banned ? $t("applicationDetails.registryBanned") : `${$t("applicationDetails.registryRisk")}: ${o.riskLevel}` }}
            </span>
          </li>
        </ul>
      </div>

      <div class="mt-6 pt-4 border-t border-gray-700">
        <a
          :href="specUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-400 hover:text-blue-300 text-sm"
        >
          {{ $t("applicationDetails.registryOpenSpec") }} <span class="text-xs">↗</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { arc56Service } from "../../services/arc56Service";
import { arc56RegistryUrl } from "../../config/env";
import type { Arc56LookupResult, Arc56RegistryOwner } from "../../types/arc56";
import {
  formatCompilerInfo,
  rankOwners,
  riskTone,
  safeGithubUrl,
  type RiskTone,
} from "../../utils/arc56Registry";

const props = defineProps<{ approvalHash: string }>();

const isLoading = ref(false);
const lookup = ref<Arc56LookupResult | null>(null);
const owners = ref<Arc56RegistryOwner[]>([]);
const ownersLoaded = ref(false);
const ownersFailed = ref(false);

const contract = computed(() => (lookup.value?.state === "found" ? lookup.value.contract : null));
const rankedOwners = computed(() => rankOwners(owners.value));
const structCount = computed(() => Object.keys(contract.value?.structs ?? {}).length);
const compiler = computed(() => (contract.value ? formatCompilerInfo(contract.value) : ""));
const specUrl = computed(
  () =>
    `${arc56RegistryUrl}/approval-programs/${props.approvalHash.slice(0, 3)}/${props.approvalHash}.arc56.json`,
);

const toneClass = (tone: RiskTone): string => {
  switch (tone) {
    case "good":
      return "bg-green-900/50 text-green-300";
    case "warn":
      return "bg-yellow-900/50 text-yellow-300";
    case "bad":
      return "bg-red-900/50 text-red-300";
    default:
      return "bg-gray-700 text-gray-200";
  }
};

// Guards against a slow lookup for a previous hash overwriting the current one.
let seq = 0;

watch(
  () => props.approvalHash,
  async (hash) => {
    const mySeq = ++seq;
    lookup.value = null;
    owners.value = [];
    ownersLoaded.value = false;
    ownersFailed.value = false;
    isLoading.value = false;
    if (!hash) return;
    isLoading.value = true;
    const result = await arc56Service.lookupContractByApprovalHash(hash);
    if (mySeq !== seq) return;
    lookup.value = result;
    isLoading.value = false;
    if (result.state === "found") {
      const found = await arc56Service.getOwnersByApprovalHash(hash);
      if (mySeq !== seq) return;
      owners.value = found ?? [];
      ownersFailed.value = found === null;
      ownersLoaded.value = true;
    }
  },
  { immediate: true },
);
</script>
