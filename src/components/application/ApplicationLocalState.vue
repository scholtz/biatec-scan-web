<template>
  <div class="card">
    <h2 class="text-xl font-semibold text-white mb-1">
      {{ $t("applicationDetails.localState") }}
    </h2>
    <p class="text-sm text-gray-400 mb-4">
      {{ $t("applicationDetails.localStateHint") }}
    </p>

    <form @submit.prevent="lookup" class="flex flex-col sm:flex-row gap-3 mb-4">
      <input
        v-model.trim="address"
        type="text"
        :placeholder="$t('applicationDetails.addressPlaceholder')"
        class="flex-1 bg-dark-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-purple-500"
      />
      <button
        type="submit"
        class="btn-primary text-sm whitespace-nowrap"
        :disabled="isLoading || !address"
      >
        {{ isLoading ? $t("applicationDetails.lookingUp") : $t("applicationDetails.lookup") }}
      </button>
    </form>

    <p v-if="errorMessage" class="text-sm text-red-400 mb-4">{{ errorMessage }}</p>

    <ApplicationKeyValueTable
      v-if="localState !== null"
      :items="localState"
      :empty-text="$t('applicationDetails.localStateEmptyForAddress')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { algorandService } from "../../services/algorandService";
import ApplicationKeyValueTable from "./ApplicationKeyValueTable.vue";

const props = defineProps<{ appId: string }>();

const { t } = useI18n();
const address = ref("");
const isLoading = ref(false);
const errorMessage = ref("");
const localState = ref<algosdk.modelsv2.TealKeyValue[] | null>(null);

const lookup = async () => {
  errorMessage.value = "";
  localState.value = null;

  if (!algosdk.isValidAddress(address.value)) {
    errorMessage.value = t("applicationDetails.invalidAddress");
    return;
  }

  isLoading.value = true;
  try {
    const algodClient = algorandService.getAlgodClient();
    const info = await algodClient
      .accountApplicationInformation(address.value, parseInt(props.appId))
      .do();
    localState.value = info.appLocalState?.keyValue ?? [];
  } catch (error) {
    // Algod returns 404 when the address has not opted into this application.
    console.warn("Error fetching local state:", error);
    localState.value = [];
  }
  isLoading.value = false;
};
</script>
