<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Assets</h1>
      <div class="flex items-center gap-2 text-sm">
        <button class="px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs" @click="refresh">Refresh</button>
      </div>
    </div>

    <div class="flex items-center gap-4 text-xs text-gray-400">
      <div>Page: <span class="text-white">{{ page }}</span></div>
      <div>Page Size:
        <select v-model.number="pageSize" class="bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-white text-xs" @change="changePageSize">
          <option v-for="s in [25,50,100]" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div>Total Loaded: <span class="text-white">{{ assets.length }}</span></div>
    </div>

    <div v-if="loading" class="text-gray-400">Loading assets…</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>

    <div v-else>
      <div class="hidden md:grid md:grid-cols-8 gap-3 px-2 text-xs text-gray-400 mb-2">
        <div>ID</div>
        <div>Name</div>
        <div>Unit</div>
        <div class="text-right">Decimals</div>
        <div class="text-right">Price (USD)</div>
        <div class="text-right">TVL (USD)</div>
        <div class="text-right">Updated</div>
        <div class="text-right">Pools</div>
      </div>
      <div class="space-y-1">
        <div v-for="a in assets" :key="a.index" class="grid grid-cols-1 md:grid-cols-8 gap-3 items-center p-2 rounded bg-gray-800/40 hover:bg-gray-800/60">
          <div class="font-mono text-xs text-blue-400 truncate">
            <RouterLink :to="`/asset/${a.index}`" class="hover:text-blue-300">{{ a.index }}</RouterLink>
          </div>
          <div class="text-sm text-white truncate flex items-center gap-2">
            <img :src="assetImageUrl(a.index)" class="w-6 h-6 rounded" />
            {{ a.params?.name || '-' }}
          </div>
          <div class="text-sm text-white truncate">{{ a.params?.unitName || '-' }}</div>
          <div class="text-sm text-white text-right">{{ a.params?.decimals ?? 0 }}</div>
          <div class="text-sm text-white text-right">{{ formatPrice(a) }}</div>
          <div class="text-sm text-white text-right">{{ formatTVL(a) }}</div>
          <div class="text-xs text-gray-400 text-right">
            <FormattedTime :timestamp="a.timestamp || new Date().toISOString()" />
          </div>
          <div class="text-right">
            <RouterLink :to="`/pools/${a.index}`" class="text-xs text-blue-400 hover:text-blue-300">View Pools</RouterLink>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center mt-4 text-xs">
        <button :disabled="page===1 || loading" class="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 text-gray-200 hover:bg-gray-600" @click="prevPage">Prev</button>
        <div class="text-gray-400">Page {{ page }}</div>
        <button :disabled="loading || assets.length < pageSize" class="px-2 py-1 rounded bg-gray-700 disabled:opacity-40 text-gray-200 hover:bg-gray-600" @click="nextPage">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted, onUnmounted, computed } from 'vue';
import { getAVMTradeReporterAPI } from '../api';
import { BiatecAsset } from '../api/models';
import { signalrService } from '../services/signalrService';
import FormattedTime from '../components/FormattedTime.vue';

interface State {
  page: number;
  pageSize: number;
  loading: boolean;
  error: string;
  assets: BiatecAsset[];
  subscribedIds: Set<number>;
}

const state = reactive<State>({
  page: 1,
  pageSize: 50,
  loading: false,
  error: '',
  assets: [],
  subscribedIds: new Set<number>(),
});

const api = getAVMTradeReporterAPI();

async function fetchAssets() {
  state.loading = true;
  state.error = '';
  try {
    // Assuming backend supports offset & size like aggregated pools
    const offset = (state.page - 1) * state.pageSize;
    const res = await api.getApiAsset({ offset, size: state.pageSize });
    const data = res as unknown as BiatecAsset[] | { data: BiatecAsset[] };
    const list = Array.isArray(data) ? data : (data as any).data;
    state.assets = list || [];
    resubscribeToVisibleAssets();
  } catch (e: any) {
    state.error = e?.message || 'Failed to load assets';
  } finally {
    state.loading = false;
  }
}

function resubscribeToVisibleAssets() {
  // If you had per-asset subscriptions you'd manage them here.
  // Current SignalR sends all Asset updates, so we'll just filter client-side.
  state.subscribedIds = new Set(state.assets.map(a => a.index));
}

function assetUpdateEvent(asset: BiatecAsset) {
  if (!state.subscribedIds.has(asset.index)) return; // ignore assets not on current page
  const idx = state.assets.findIndex(a => a.index === asset.index);
  if (idx !== -1) {
    state.assets[idx] = asset;
  }
}

function refresh() { fetchAssets(); }
function nextPage() { state.page++; fetchAssets(); }
function prevPage() { if (state.page>1) { state.page--; fetchAssets(); } }
function changePageSize() { state.page = 1; fetchAssets(); }

function formatPrice(a: BiatecAsset) {
  if (a.priceUSD === undefined || a.priceUSD === null) return '-';
  return a.priceUSD.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}
function formatTVL(a: BiatecAsset) {
  if (a.tvL_USD === undefined || a.tvL_USD === null) return '-';
  return a.tvL_USD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function assetImageUrl(id: number) { return `https://algorand-trades.de-4.biatec.io/api/asset/image/${id}`; }

watch(() => state.page, fetchAssets);
watch(() => state.pageSize, fetchAssets);

onMounted(async () => {
  signalrService.onAssetReceived(assetUpdateEvent);
  await fetchAssets();
});

onUnmounted(() => {
  signalrService.unsubscribeFromAssetUpdates(assetUpdateEvent);
});

const page = computed(() => state.page);
const pageSize = computed({ get: () => state.pageSize, set: v => state.pageSize = v });
const assets = computed(() => state.assets);
const loading = computed(() => state.loading);
const error = computed(() => state.error);

</script>
