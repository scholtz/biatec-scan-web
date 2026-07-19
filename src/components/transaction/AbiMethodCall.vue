<template>
  <div v-if="rawArgs && rawArgs.length > 0" class="space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <p class="text-sm text-gray-400">
        {{ $t("transaction.appArgs") }} ({{ rawArgs.length }})
      </p>
      <button
        v-if="hasDecodedView"
        @click="showRaw = !showRaw"
        class="text-xs text-purple-400 hover:text-purple-300 underline"
      >
        {{ showRaw ? $t("transaction.abi.hideRaw") : $t("transaction.abi.showRaw") }}
      </button>
    </div>

    <!-- Checking against the registry -->
    <p v-if="info.status === 'loading'" class="text-sm text-gray-500 italic">
      {{ $t("transaction.abi.checking") }}
    </p>

    <!-- Hash we computed from this app's on-chain approval program matched a published spec -->
    <div v-else-if="info.status === 'verified'" class="space-y-3">
      <div class="bg-green-900/20 border border-green-700 rounded-lg p-3">
        <p class="text-green-400 text-sm font-semibold flex items-center gap-1.5">
          <span>✅</span>
          {{ $t("transaction.abi.verifiedTitle", { name: info.contract!.name }) }}
        </p>
        <p class="text-white text-sm mt-1 font-mono">
          {{ info.method!.name }}
          <span v-if="info.method!.desc" class="text-gray-400 font-sans">
            — {{ info.method!.desc }}</span
          >
        </p>
        <p class="text-xs text-green-500 mt-1">
          {{ $t("transaction.abi.verifiedHint") }}
        </p>
      </div>
      <div class="space-y-2">
        <AbiArgDisplay v-for="a in info.args" :key="a.index" :arg="a" />
      </div>
    </div>

    <!-- No published spec for this exact bytecode, but other contracts share this method signature -->
    <div v-else-if="info.status === 'unverified-candidates'" class="space-y-3">
      <div class="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
        <p class="text-yellow-400 text-sm font-semibold flex items-center gap-1.5">
          <span>⚠️</span>
          {{ $t("transaction.abi.unverifiedTitle") }}
        </p>
        <p v-if="info.signatureLookup?.abi" class="text-xs text-yellow-500 mt-1 font-mono break-all">
          {{ info.signatureLookup.abi }}
        </p>
        <p class="text-xs text-gray-400 mt-2">
          {{ $t("transaction.abi.unverifiedCandidatesHint", { count: info.candidates!.length }) }}
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <button
            v-for="c in info.candidates"
            :key="c.source"
            @click="selectCandidate(c.source)"
            :disabled="c.loading"
            class="text-xs px-2 py-1 rounded border font-mono transition-colors"
            :class="
              c.source === activeSource
                ? 'bg-yellow-700/40 border-yellow-500 text-yellow-200'
                : 'bg-dark-900 border-gray-700 text-gray-300 hover:border-yellow-600'
            "
          >
            {{ shortSource(c.source) }}
            <span v-if="c.loading">…</span>
            <span v-else-if="c.notFound">✗</span>
            <span v-else-if="c.method">✓</span>
          </button>
        </div>
      </div>

      <div v-if="activeCandidateArgs" class="space-y-2">
        <p class="text-xs text-yellow-500 italic">
          {{ $t("transaction.abi.unverifiedApplied", { name: activeCandidate?.contract?.name }) }}
        </p>
        <AbiArgDisplay v-for="a in activeCandidateArgs" :key="a.index" :arg="a" />
      </div>
      <p
        v-else-if="
          activeCandidate &&
          !activeCandidate.loading &&
          activeCandidate.contract &&
          !activeCandidate.method
        "
        class="text-xs text-gray-500 italic"
      >
        {{ $t("transaction.abi.noMatchingMethod") }}
      </p>
      <p
        v-else-if="activeCandidate?.notFound"
        class="text-xs text-gray-500 italic"
      >
        {{ $t("transaction.abi.candidateNotFound") }}
      </p>
    </div>

    <!-- Looks like an ABI call, but nothing in the registry recognizes this exact signature -->
    <div
      v-else-if="info.status === 'unverified-none'"
      class="bg-gray-800/40 border border-gray-700 rounded-lg p-3"
    >
      <p class="text-gray-300 text-sm font-semibold flex items-center gap-1.5">
        <span>❔</span>
        {{ $t("transaction.abi.unknownTitle") }}
      </p>
      <p v-if="info.selectorHex" class="text-xs text-gray-500 mt-1 font-mono">
        {{ $t("transaction.abi.selector") }}: 0x{{ info.selectorHex }}
      </p>
    </div>

    <!-- Registry lookup itself failed (network/CORS/etc) - never silently treated as verified -->
    <div v-else-if="info.status === 'error'" class="bg-red-900/20 border border-red-700 rounded-lg p-3">
      <p class="text-red-400 text-sm">{{ $t("transaction.abi.error") }}: {{ info.errorMessage }}</p>
    </div>

    <div v-if="showRaw" class="space-y-2">
      <BufferDisplay
        v-for="(arg, index) in rawArgs"
        :key="index"
        :value="arg"
        :title="`${$t('common.argument')} ${index}`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, PropType } from "vue";
import algosdk from "algosdk";
import BufferDisplay from "../BufferDisplay.vue";
import AbiArgDisplay from "./AbiArgDisplay.vue";
import { useAbiCallInfo } from "../../composables/useAbiCallInfo";
import { decodeMethodArgs } from "../../utils/abi56";

const props = defineProps({
  transaction: {
    type: Object as PropType<algosdk.indexerModels.Transaction>,
    required: true,
  },
});

const transactionRef = computed(() => props.transaction);
const { info, loadCandidate } = useAbiCallInfo(transactionRef);

const rawArgs = computed(() => props.transaction.applicationTransaction?.applicationArgs);

const activeSource = ref<string | null>(null);

const activeCandidate = computed(() => {
  if (info.value.status !== "unverified-candidates" || !activeSource.value) return null;
  return info.value.candidates?.find((c) => c.source === activeSource.value) ?? null;
});

const activeCandidateArgs = computed(() => {
  const candidate = activeCandidate.value;
  const args = rawArgs.value;
  if (!candidate?.contract || !candidate.method || !args) return null;
  try {
    return decodeMethodArgs(candidate.method, candidate.contract, args, props.transaction);
  } catch {
    return null;
  }
});

const hasDecodedView = computed(
  () => info.value.status === "verified" || !!activeCandidateArgs.value
);

const showRaw = ref(true);
watch(
  () => info.value.status,
  (status) => {
    showRaw.value = status !== "verified";
    activeSource.value = null;
  }
);

async function selectCandidate(source: string) {
  activeSource.value = source;
  await loadCandidate(source);
}

function shortSource(source: string): string {
  return source.length > 14 ? `${source.slice(0, 6)}…${source.slice(-4)}` : source;
}
</script>
