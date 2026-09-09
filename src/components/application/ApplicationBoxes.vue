<template>
  <div class="card">
    <div class="flex items-center justify-between gap-3 mb-1">
      <h2 class="text-xl font-semibold text-white">{{ $t("applicationDetails.boxes") }}</h2>
      <button
        v-if="!hasLoadedOnce"
        @click="loadBoxes"
        :disabled="isLoading"
        class="btn-secondary text-sm whitespace-nowrap"
      >
        {{ isLoading ? $t("applicationDetails.loadingBoxes") : $t("applicationDetails.loadBoxes") }}
      </button>
    </div>
    <p class="text-sm text-gray-400 mb-4">{{ $t("applicationDetails.boxesHint") }}</p>

    <div v-if="hasLoadedOnce">
      <p v-if="boxes.length === 0" class="text-sm text-gray-400">
        {{ $t("applicationDetails.noBoxes") }}
      </p>
      <div v-else class="space-y-2">
        <div
          v-for="box in boxes"
          :key="box.key"
          class="bg-dark-900 rounded-lg border border-gray-700 overflow-hidden"
        >
          <button
            @click="toggleBox(box)"
            class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-dark-800/60 transition-colors"
          >
            <span class="font-mono text-sm text-white break-all">{{ box.label }}</span>
            <span class="text-xs text-gray-500 flex-shrink-0">
              {{ expandedKey === box.key ? "▲" : "▼" }}
            </span>
          </button>
          <div v-if="expandedKey === box.key" class="px-4 pb-4">
            <p v-if="boxValues[box.key] === undefined" class="text-sm text-gray-400">
              {{ $t("applicationDetails.loadingBoxValue") }}
            </p>
            <BufferDisplay v-else :value="boxValues[box.key]" />
          </div>
        </div>
      </div>

      <div v-if="nextToken" class="mt-4 text-center">
        <button @click="loadBoxes" :disabled="isLoading" class="btn-secondary text-sm">
          {{ isLoading ? $t("common.loading") : $t("common.loadMore") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Buffer } from "buffer";
import { algorandService } from "../../services/algorandService";
import BufferDisplay from "../BufferDisplay.vue";

const props = defineProps<{ appId: string }>();

const PAGE_SIZE = 20;

interface DisplayBox {
  key: string;
  name: Uint8Array;
  label: string;
}

const boxes = ref<DisplayBox[]>([]);
const boxValues = ref<Record<string, Uint8Array>>({});
const nextToken = ref<string | undefined>(undefined);
const isLoading = ref(false);
const hasLoadedOnce = ref(false);
const expandedKey = ref<string | null>(null);

const describeBoxName = (name: Uint8Array): string => {
  try {
    // fatal: true so invalid UTF-8 falls through to the hex fallback below.
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(name);
    const printableRatio =
      decoded.split("").filter((c) => {
        const code = c.charCodeAt(0);
        return (code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9;
      }).length / (decoded.length || 1);
    if (printableRatio > 0.8) return decoded;
  } catch {
    // Not valid UTF-8 - fall through to hex representation.
  }
  return `0x${Array.from(name)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
};

const loadBoxes = async () => {
  isLoading.value = true;
  try {
    const algodClient = algorandService.getAlgodClient();
    let request = algodClient.getApplicationBoxes(parseInt(props.appId)).limit(PAGE_SIZE);
    if (nextToken.value) {
      request = request.next(nextToken.value);
    }
    const response = await request.do();
    const newBoxes = (response.boxes || []).map((b) => ({
      key: Buffer.from(b.name).toString("base64"),
      name: b.name,
      label: describeBoxName(b.name),
    }));
    boxes.value = [...boxes.value, ...newBoxes];
    nextToken.value = response.nextToken;
  } catch (error) {
    console.error("Error loading application boxes:", error);
  }
  hasLoadedOnce.value = true;
  isLoading.value = false;
};

const toggleBox = async (box: DisplayBox) => {
  if (expandedKey.value === box.key) {
    expandedKey.value = null;
    return;
  }
  expandedKey.value = box.key;

  if (boxValues.value[box.key] === undefined) {
    try {
      const algodClient = algorandService.getAlgodClient();
      const boxResponse = await algodClient
        .getApplicationBoxByName(parseInt(props.appId), box.name)
        .do();
      boxValues.value = { ...boxValues.value, [box.key]: boxResponse.value };
    } catch (error) {
      console.error("Error loading box value:", error);
      boxValues.value = { ...boxValues.value, [box.key]: new Uint8Array() };
    }
  }
};
</script>
