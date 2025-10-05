<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="application">
      <!-- Application Header -->
      <div class="card mb-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
              <span class="font-bold text-2xl">⚙️</span>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-white">Application Details</h1>
              <p class="text-gray-400">App ID: {{ appId }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">Application ID</p>
            <p class="text-white font-medium text-lg">{{ appId }}</p>
          </div>
          <div v-if="application.params?.creator" class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">Creator</p>
            <router-link
              :to="{ name: 'AddressDetails', params: { address: application.params.creator } }"
              class="text-purple-400 hover:text-purple-300 font-mono text-sm break-all"
            >
              {{ formatAddress(application.params.creator) }}
            </router-link>
          </div>
          <div class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-400 mb-1">Created at Round</p>
            <p class="text-white font-medium">{{ application['created-at-round']?.toLocaleString() || 'Unknown' }}</p>
          </div>
        </div>
      </div>

      <!-- State Schemas -->
      <div v-if="application.params" class="card mb-6">
        <h2 class="text-xl font-semibold text-white mb-4">State Schemas</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-if="application.params['global-state-schema']">
            <h3 class="text-lg font-semibold text-purple-400 mb-3">Global State</h3>
            <div class="bg-dark-900 p-4 rounded-lg border border-gray-700 space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-400">Integers (uint):</span>
                <span class="text-white font-medium">{{ application.params['global-state-schema']['num-uint'] || 0 }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Byte Slices:</span>
                <span class="text-white font-medium">{{ application.params['global-state-schema']['num-byte-slice'] || 0 }}</span>
              </div>
            </div>
          </div>
          <div v-if="application.params['local-state-schema']">
            <h3 class="text-lg font-semibold text-purple-400 mb-3">Local State</h3>
            <div class="bg-dark-900 p-4 rounded-lg border border-gray-700 space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-400">Integers (uint):</span>
                <span class="text-white font-medium">{{ application.params['local-state-schema']['num-uint'] || 0 }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Byte Slices:</span>
                <span class="text-white font-medium">{{ application.params['local-state-schema']['num-byte-slice'] || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Smart Contract Programs -->
      <div v-if="application.params" class="space-y-6">
        <!-- Approval Program -->
        <div v-if="application.params['approval-program']" class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">Approval Program</h2>
            <button
              @click="decompileProgram('approval')"
              :disabled="isDecompiling"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
            >
              {{ isDecompiling ? 'Decompiling...' : 'Decompile' }}
            </button>
          </div>
          
          <div v-if="decompiledApproval" class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <pre class="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">{{ decompiledApproval }}</pre>
          </div>
          <div v-else class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-gray-400 text-sm">Click 'Decompile' to view the TEAL code</p>
            <p class="text-gray-500 text-xs mt-2">Base64 encoded: {{ application.params['approval-program'].substring(0, 100) }}...</p>
          </div>
        </div>

        <!-- Clear State Program -->
        <div v-if="application.params['clear-state-program']" class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">Clear State Program</h2>
            <button
              @click="decompileProgram('clear')"
              :disabled="isDecompiling"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
            >
              {{ isDecompiling ? 'Decompiling...' : 'Decompile' }}
            </button>
          </div>
          
          <div v-if="decompiledClear" class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <pre class="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">{{ decompiledClear }}</pre>
          </div>
          <div v-else class="bg-dark-900 p-4 rounded-lg border border-gray-700">
            <p class="text-gray-400 text-sm">Click 'Decompile' to view the TEAL code</p>
            <p class="text-gray-500 text-xs mt-2">Base64 encoded: {{ application.params['clear-state-program'].substring(0, 100) }}...</p>
          </div>
        </div>
      </div>

      <!-- Additional Info -->
      <div v-if="application.params" class="card mt-6">
        <h2 class="text-xl font-semibold text-white mb-4">Additional Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="application.params['extra-program-pages']">
            <p class="text-sm text-gray-400 mb-1">Extra Program Pages</p>
            <p class="text-white font-medium">{{ application.params['extra-program-pages'] }}</p>
          </div>
          <div v-if="application.deleted !== undefined">
            <p class="text-sm text-gray-400 mb-1">Status</p>
            <p :class="application.deleted ? 'text-red-400' : 'text-green-400'" class="font-medium">
              {{ application.deleted ? 'Deleted' : 'Active' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-12">
      <h2 class="text-xl font-semibold text-white mb-2">Application Not Found</h2>
      <p class="text-gray-400 mb-4">
        The requested application could not be found or may not exist.
      </p>
      <router-link to="/" class="btn-primary">Back to Dashboard</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { algorandService } from "../services/algorandService";

const route = useRoute();
const appId = ref<string>("");
const application = ref<any>(null);
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

const decompileProgram = async (type: 'approval' | 'clear') => {
  if (!application.value || !application.value.params) return;
  
  isDecompiling.value = true;
  try {
    const algodClient = algorandService.getAlgodClient();
    const program = type === 'approval' 
      ? application.value.params['approval-program']
      : application.value.params['clear-state-program'];
    
    if (!program) return;

    // Decompile using algod endpoint
    const response = await algodClient.disassemble(Buffer.from(program, 'base64')).do();
    
    if (type === 'approval') {
      decompiledApproval.value = response.result;
    } else {
      decompiledClear.value = response.result;
    }
  } catch (error) {
    console.error(`Error decompiling ${type} program:`, error);
    if (type === 'approval') {
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
