<template>
  <div>
    <button
      type="button"
      class="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800/70 border border-dark-700/50 text-white hover:bg-dark-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 min-w-[140px]"
      @click="open = true"
    >
      <AssetIcon
        v-if="modelValue"
        :asset-id="modelValue.id"
        :alt="assetLabel(modelValue)"
        size-class="w-6 h-6"
      />
      <span class="flex-1 min-w-0 text-left truncate font-medium">
        {{ modelValue ? assetLabel(modelValue) : $t("swap.selectAsset") }}
      </span>
      <svg
        class="w-4 h-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-[10000] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        @click.self="close"
      >
        <div
          class="w-full max-w-lg bg-dark-900 border border-dark-700/60 rounded-xl shadow-2xl flex flex-col max-h-[85vh]"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('swap.selectAsset')"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-dark-700/50">
            <h2 class="text-lg font-semibold text-white">
              {{ $t("swap.selectAsset") }}
            </h2>
            <button
              type="button"
              class="text-gray-400 hover:text-white p-1 rounded"
              :aria-label="$t('wallet.close')"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="px-5 py-3">
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              :placeholder="$t('swap.searchAssetPlaceholder')"
              class="w-full px-4 py-2 bg-dark-800/70 border border-dark-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div class="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            <p v-if="searching" class="px-2 py-3 text-sm text-gray-400">
              {{ $t("common.searching") }}…
            </p>
            <template v-else>
              <p
                v-if="query.trim() === '' && heldOptions.length > 0"
                class="px-2 pt-1 text-xs uppercase tracking-wide text-gray-500"
              >
                {{ $t("swap.yourAssets") }}
              </p>
              <button
                v-for="option in visibleOptions"
                :key="option.id.toString()"
                type="button"
                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-700/60 text-left transition-colors"
                :class="{ 'bg-primary-600/20': modelValue?.id === option.id }"
                @click="select(option)"
              >
                <AssetIcon :asset-id="option.id" :alt="assetLabel(option)" />
                <span class="flex-1 min-w-0">
                  <span class="block text-white font-medium truncate">
                    {{ assetLabel(option) }}
                  </span>
                  <span class="block text-xs text-gray-400 truncate">
                    {{ option.name }} · #{{ option.id }}
                  </span>
                </span>
                <span
                  v-if="balanceOf(option.id) !== undefined"
                  class="text-sm text-gray-300 font-mono"
                >
                  {{ formatAmount(balanceOf(option.id)!, option.decimals, 4) }}
                </span>
              </button>
              <p v-if="visibleOptions.length === 0" class="px-2 py-3 text-sm text-gray-400">
                {{ $t("swap.noAssetsFound") }}
              </p>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { getAVMTradeReporterAPI } from "../../api";
import type { BiatecAsset } from "../../api/models";
import { useAmountFormat } from "../../composables/useAmountFormat";
import { algorandService } from "../../services/algorandService";
import {
  assetLabel,
  loadSwapAssetInfo,
  NATIVE_ASSET,
  type SwapAssetInfo,
} from "../../swap/assetInfo";
import AssetIcon from "../AssetIcon.vue";

const props = defineProps<{
  modelValue: SwapAssetInfo | undefined;
  /** asset id -> balance (base units) for the connected account, if any. */
  balances?: ReadonlyMap<bigint, bigint>;
}>();
const emit = defineEmits<{ "update:modelValue": [asset: SwapAssetInfo] }>();

const api = getAVMTradeReporterAPI();
const algod = algorandService.getAlgodClient();
const { formatAmount } = useAmountFormat();

const open = ref(false);
const query = ref("");
const searching = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);
const searchResults = ref<SwapAssetInfo[]>([]);
const heldOptions = ref<SwapAssetInfo[]>([]);
const popular = ref<SwapAssetInfo[]>([]);
let searchSeq = 0;
let heldKey = "";

function toInfo(asset: BiatecAsset): SwapAssetInfo {
  return {
    id: BigInt(asset.index),
    name: asset.params?.name ?? "",
    unitName: asset.params?.unitName ?? "",
    decimals: asset.params?.decimals ?? 0,
  };
}

// Shared across every picker instance and page visit: the "popular" list
// is the same for everyone and changes slowly.
let popularPromise: Promise<SwapAssetInfo[]> | undefined;
function loadPopular(): Promise<SwapAssetInfo[]> {
  if (!popularPromise) {
    popularPromise = (async () => {
      const { data: top } = await api.getApiAssetTop();
      const ids = (top.popular ?? [])
        .map((item) => item.assetId)
        .filter((id): id is number => typeof id === "number");
      const list: SwapAssetInfo[] = [NATIVE_ASSET];
      if (ids.length > 0) {
        const { data: assets } = await api.getApiAsset({ ids: ids.join(",") });
        list.push(...assets.map(toInfo));
      }
      return list;
    })().catch(() => {
      popularPromise = undefined;
      return [NATIVE_ASSET];
    });
  }
  return popularPromise;
}

function balanceOf(id: bigint): bigint | undefined {
  return props.balances?.get(id);
}

const visibleOptions = computed<SwapAssetInfo[]>(() => {
  if (query.value.trim() !== "") return searchResults.value;
  const seen = new Set<string>();
  const merged: SwapAssetInfo[] = [];
  for (const option of [...heldOptions.value, ...popular.value]) {
    const key = option.id.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(option);
  }
  return merged;
});

/** Resolve held assets only when the set of held ids actually changes. */
async function loadHeld(): Promise<void> {
  const ids = [...(props.balances?.keys() ?? [])];
  const key = ids.map(String).join(",");
  if (key === heldKey) return;
  heldKey = key;
  const infos = await Promise.all(
    ids.map((id) => loadSwapAssetInfo(id, algod).catch(() => undefined))
  );
  heldOptions.value = infos.filter((x): x is SwapAssetInfo => x !== undefined);
}

async function runSearch(term: string): Promise<void> {
  const seq = ++searchSeq;
  searching.value = true;
  try {
    const results: SwapAssetInfo[] = [];
    if (/^\d+$/.test(term)) {
      const byId = await loadSwapAssetInfo(BigInt(term), algod).catch(
        () => undefined
      );
      if (byId) results.push(byId);
    }
    const { data: assets } = await api.getApiAsset({ search: term, size: 30 });
    for (const asset of assets) {
      const info = toInfo(asset);
      if (!results.some((r) => r.id === info.id)) results.push(info);
    }
    if (assetLabel(NATIVE_ASSET).toLowerCase().includes(term.toLowerCase())) {
      results.unshift(NATIVE_ASSET);
    }
    if (seq === searchSeq) searchResults.value = results;
  } catch {
    if (seq === searchSeq) searchResults.value = [];
  } finally {
    if (seq === searchSeq) searching.value = false;
  }
}

let debounce: ReturnType<typeof setTimeout> | undefined;
watch(query, (value) => {
  if (debounce) clearTimeout(debounce);
  const term = value.trim();
  if (term === "") {
    searchResults.value = [];
    searching.value = false;
    return;
  }
  debounce = setTimeout(() => void runSearch(term), 300);
});

watch(open, async (isOpen) => {
  if (!isOpen) return;
  query.value = "";
  void loadPopular().then((list) => (popular.value = list));
  void loadHeld();
  await nextTick();
  searchInput.value?.focus();
});

watch(
  () => props.balances,
  () => {
    if (open.value) void loadHeld();
  }
);

function select(asset: SwapAssetInfo) {
  emit("update:modelValue", asset);
  close();
}

function close() {
  open.value = false;
}
</script>
