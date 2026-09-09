<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="application" class="space-y-6">
      <!-- Application Header -->
      <div class="card">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div class="flex items-center space-x-4">
            <div
              class="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center shadow-lg flex-shrink-0"
            >
              <span class="font-bold text-2xl">⚙️</span>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-white">
                {{ $t("applicationDetails.title") }}
              </h1>
              <p class="text-gray-400 font-mono">{{ $t("applicationDetails.appIdLabel") }}: {{ appId }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.appIdLabel") }}</p>
            <p class="text-white font-medium text-lg">{{ appId }}</p>
          </div>
          <div
            v-if="application.params?.creator"
            class="bg-dark-900 p-4 rounded-lg border border-gray-700"
          >
            <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.creator") }}</p>
            <router-link
              :to="{
                name: 'AddressDetails',
                params: { address: application.params.creator?.toString() },
              }"
              class="text-purple-400 hover:text-purple-300 font-mono text-sm break-all"
            >
              {{ formatAddress(application.params.creator.toString()) }}
            </router-link>
          </div>
          <div
            v-if="application.params?.version !== undefined"
            class="bg-dark-900 p-4 rounded-lg border border-gray-700"
          >
            <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.version") }}</p>
            <p class="text-white font-medium text-lg">{{ application.params.version }}</p>
          </div>
          <div
            v-if="application.params?.extraProgramPages"
            class="bg-dark-900 p-4 rounded-lg border border-gray-700"
          >
            <p class="text-sm text-gray-400 mb-1">{{ $t("applicationDetails.extraProgramPages") }}</p>
            <p class="text-white font-medium text-lg">{{ application.params.extraProgramPages }}</p>
          </div>
        </div>

        <!-- External Links (Algorand-mainnet-only explorers) -->
        <div
          v-if="isAlgorandMainnet"
          class="flex flex-wrap gap-x-4 gap-y-2 mt-6 pt-6 border-t border-gray-700"
        >
          <span class="text-sm text-gray-500">{{ $t("common.externalLinks") }}:</span>
          <a
            :href="`https://allo.info/application/${appId}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
          >
            Allo <span class="text-xs">↗</span>
          </a>
          <a
            :href="`https://lora.algokit.io/mainnet/application/${appId}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
          >
            Lora <span class="text-xs">↗</span>
          </a>
          <a
            :href="`https://explorer.perawallet.app/application/${appId}/`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
          >
            Pera <span class="text-xs">↗</span>
          </a>
        </div>
      </div>

      <!-- State Schemas -->
      <div v-if="application.params" class="card">
        <h2 class="text-xl font-semibold text-white mb-4">
          {{ $t("applicationDetails.stateSchema") }}
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-if="application.params.globalStateSchema">
            <h3 class="text-lg font-semibold text-purple-400 mb-3">
              {{ $t("applicationDetails.globalStateSchemaLabel") }}
            </h3>
            <div class="bg-dark-900 p-4 rounded-lg border border-gray-700 space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-400">{{ $t("applicationDetails.integers") }}:</span>
                <span class="text-white font-medium">{{
                  application.params.globalStateSchema.numUint || 0
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">{{ $t("applicationDetails.byteSlices") }}:</span>
                <span class="text-white font-medium">{{
                  application.params.globalStateSchema.numByteSlice || 0
                }}</span>
              </div>
            </div>
          </div>
          <div v-if="application.params.localStateSchema">
            <h3 class="text-lg font-semibold text-purple-400 mb-3">
              {{ $t("applicationDetails.localStateSchemaLabel") }}
            </h3>
            <div class="bg-dark-900 p-4 rounded-lg border border-gray-700 space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-400">{{ $t("applicationDetails.integers") }}:</span>
                <span class="text-white font-medium">{{
                  application.params.localStateSchema.numUint || 0
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">{{ $t("applicationDetails.byteSlices") }}:</span>
                <span class="text-white font-medium">{{
                  application.params.localStateSchema.numByteSlice || 0
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Global State -->
      <div class="card">
        <h2 class="text-xl font-semibold text-white mb-1">
          {{ $t("applicationDetails.globalState") }}
        </h2>
        <p class="text-sm text-gray-400 mb-4">
          {{ $t("applicationDetails.globalStateHint") }}
        </p>
        <ApplicationKeyValueTable
          :items="application.params?.globalState"
          :empty-text="$t('applicationDetails.globalStateEmpty')"
        />
      </div>

      <!-- Local State (per-address lookup) -->
      <ApplicationLocalState :app-id="appId" />

      <!-- Boxes -->
      <ApplicationBoxes :app-id="appId" />

      <!-- Smart Contract Programs -->
      <div v-if="application.params" class="space-y-6">
        <!-- Approval Program -->
        <div v-if="application.params.approvalProgram" class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">
              {{ $t("applicationDetails.approvalProgram") }}
            </h2>
            <button
              @click="decompileProgram('approval')"
              :disabled="isDecompiling"
              class="btn-primary text-sm"
            >
              {{ isDecompiling ? $t("applicationDetails.decompiling") : $t("applicationDetails.decompile") }}
            </button>
          </div>

          <div
            v-if="decompiledApproval"
            class="bg-dark-900 p-4 rounded-lg border border-gray-700"
          >
            <pre
              class="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap"
              >{{ decompiledApproval }}</pre
            >
          </div>
          <div v-else class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-gray-400 text-sm">
              {{ $t("applicationDetails.decompileHint") }}
            </p>
            <p
              class="text-gray-500 text-xs mt-2 break-all"
              v-if="application.params.approvalProgram"
            >
              {{ $t("applicationDetails.base64Encoded") }}:
              {{
                Buffer.from(application.params.approvalProgram)
                  .toString("base64")
                  .substring(0, 100)
              }}...
            </p>
          </div>
        </div>

        <!-- Clear State Program -->
        <div v-if="application.params.clearStateProgram" class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">
              {{ $t("applicationDetails.clearStateProgram") }}
            </h2>
            <button
              @click="decompileProgram('clear')"
              :disabled="isDecompiling"
              class="btn-primary text-sm"
            >
              {{ isDecompiling ? $t("applicationDetails.decompiling") : $t("applicationDetails.decompile") }}
            </button>
          </div>

          <div
            v-if="decompiledClear"
            class="bg-dark-900 p-4 rounded-lg border border-gray-700"
          >
            <pre
              class="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap"
              >{{ decompiledClear }}</pre
            >
          </div>
          <div v-else class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-gray-400 text-sm">
              {{ $t("applicationDetails.decompileHint") }}
            </p>
            <p class="text-gray-500 text-xs mt-2 break-all">
              {{ $t("applicationDetails.base64Encoded") }}:
              {{ Buffer.from(application.params.clearStateProgram).toString("base64").substring(0, 100) }}...
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-12">
      <h2 class="text-xl font-semibold text-white mb-2">
        {{ $t("applicationDetails.notFoundTitle") }}
      </h2>
      <p class="text-gray-400 mb-4">
        {{ $t("applicationDetails.notFoundBody") }}
      </p>
      <router-link to="/" class="btn-primary">{{ $t("common.backToDashboard") }}</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { algorandService } from "../services/algorandService";
import { isAlgorandMainnet } from "../config/env";
import algosdk, { ProgramSourceMap } from "algosdk";
import { Buffer } from "buffer";
import ApplicationKeyValueTable from "../components/application/ApplicationKeyValueTable.vue";
import ApplicationLocalState from "../components/application/ApplicationLocalState.vue";
import ApplicationBoxes from "../components/application/ApplicationBoxes.vue";

const route = useRoute();
const appId = ref<string>("");
const application = ref<algosdk.modelsv2.Application | null>(null);
const isLoading = ref(true);
const isDecompiling = ref(false);
const decompiledApproval = ref("");
const decompiledClear = ref("");

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
};

const loadApplication = async (id: string) => {
  isLoading.value = true;
  try {
    // Use algod client to get application info
    const algodClient = algorandService.getAlgodClient();
    const appInfo = await algodClient.getApplicationByID(parseInt(id)).do();
    application.value = appInfo;
  } catch (error) {
    console.error("Error loading application:", error);
    application.value = null;
  }
  isLoading.value = false;
};

const decompileProgram = async (type: "approval" | "clear") => {
  if (!application.value || !application.value.params) return;

  isDecompiling.value = true;
  try {
    const algodClient = algorandService.getAlgodClient();
    const program =
      type === "approval"
        ? application.value.params.approvalProgram
        : application.value.params.clearStateProgram;

    if (!program) return;

    // Decompile using algod endpoint
    const disassembled = await algodClient.disassemble(program).do();

    // Compile with sourcemap to get PC mappings
    const compile = await algodClient
      .compile(disassembled.result)
      .sourcemap(true)
      .do();

    let result = disassembled.result;

    if (compile.sourcemap) {
      const raw = compile.sourcemap.data as Map<string, unknown>;
      const map = {
        version: Number(raw.get("version")),
        sources: raw.get("sources"),
        names: raw.get("names"),
        mappings: raw.get("mappings"),
      } as {
        version: number;
        sources: string[];
        names: string[];
        mappings: string;
      };

      const sm = new ProgramSourceMap(map);
      const pcs = sm.getPcs();
      let sourceLines = disassembled.result.split("\n");
      pcs.forEach((pc) => {
        const location = sm.getLocationForPc(pc);
        if (location?.line !== undefined) {
          const line = location.line;
          if (sourceLines.length > line) {
            // Pad line to at least 50 characters
            while (sourceLines[line].length < 50) {
              sourceLines[line] = sourceLines[line] + " ";
            }
            sourceLines[line] = sourceLines[line] + ` // PC: ${pc}`;
          }
        }
      });
      result = sourceLines.join("\n");
    }

    if (type === "approval") {
      decompiledApproval.value = result;
    } else {
      decompiledClear.value = result;
    }
  } catch (error) {
    console.error(`Error decompiling ${type} program:`, error);
    if (type === "approval") {
      decompiledApproval.value = `Error decompiling program: ${error}`;
    } else {
      decompiledClear.value = `Error decompiling program: ${error}`;
    }
  }
  isDecompiling.value = false;
};

watch(
  () => route.params.appId,
  (newAppId) => {
    if (newAppId) {
      appId.value = newAppId as string;
      decompiledApproval.value = "";
      decompiledClear.value = "";
      loadApplication(appId.value);
    }
  }
);

onMounted(() => {
  appId.value = route.params.appId as string;
  if (appId.value) {
    loadApplication(appId.value);
  }
});
</script>
