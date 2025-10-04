<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between mb-2">
      <RouterLink
        :to="{
          name: 'AggregatedPoolsByAsset',
          params: { assetId },
        }"
        class="text-base font-semibold text-white hover:text-blue-300 transition-colors"
      >
        {{ $t('assetDetails.aggregatedPools') }}
      </RouterLink>
      <div class="text-xs text-gray-400">
        {{ pools.length }}
      </div>
    </div>

    <div v-if="loading" class="text-gray-400 text-center py-3 text-xs">
      {{ $t('common.loading') }}
    </div>
    
    <div v-else-if="error" class="text-red-400 text-center py-3 text-xs">
      {{ error }}
    </div>
    
    <div v-else-if="!pools.length" class="text-gray-400 text-center py-3 text-xs">
      {{ $t('assetDetails.noAggregatedPools') }}
    </div>
    
    <div v-else class="space-y-1">
      <div
        v-for="pool in pools.slice(0, maxItems)"
        :key="pool.id || `${pool.assetIdA}-${pool.assetIdB}`"
        v-observe-visibility="poolKey(pool)"
        class="bg-gray-800/40 hover:bg-gray-800/60 rounded px-2 py-1.5 transition-colors"
      >
        <!-- Single Row with 3 Columns -->
        <div class="grid grid-cols-[1fr_auto_auto] gap-2 items-center text-xs">
          <!-- Column 1: Icons, Name and Pool Count -->
          <div class="flex items-center gap-1.5 min-w-0">
            <div class="flex -space-x-1 flex-shrink-0">
              <img
                :src="assetImageUrl(pool.assetIdA)"
                class="w-4 h-4 rounded border border-gray-700 bg-gray-900"
                :alt="assetUnitName"
              />
              <img
                :src="assetImageUrl(pool.assetIdB)"
                class="w-4 h-4 rounded border border-gray-700 bg-gray-900"
                :alt="String(otherAssetUnitName(pool))"
              />
            </div>
            <RouterLink
              :to="`/pools/${assetId}/${pool.assetIdB}`"
              class="font-mono text-blue-100 hover:text-blue-300 transition-colors truncate"
            >
              {{ pairLabel(pool) }} <span class="text-amber-400">({{ pool.poolCount }})</span>
            </RouterLink>
          </div>
          
          <!-- Column 2: Price (right-aligned) -->
          <div class="text-right font-mono text-white whitespace-nowrap">
            {{ formatPrice(pool) }}
          </div>
          
          <!-- Column 3: TVL with $ (right-aligned) -->
          <div class="text-right text-white whitespace-nowrap">
            ${{ formatTVLAUSD(pool) }}
          </div>
        </div>
      </div>
      
      <!-- Show More Link -->
      <div v-if="pools.length > maxItems" class="text-center pt-1">
        <RouterLink
          :to="{
            name: 'AggregatedPoolsByAsset',
            params: { assetId },
          }"
          class="text-xs text-blue-300 hover:text-blue-100 transition-colors"
        >
          +{{ pools.length - maxItems }} {{ $t('assetDetails.pools') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted, watch } from "vue";
import { getAVMTradeReporterAPI } from "../api";
import { AggregatedPool } from "../api/models";
import { assetService } from "../services/assetService";
import { signalrService } from "../services/signalrService";

const props = defineProps<{
  assetId: string;
  maxItems?: number;
}>();

interface State {
  pools: AggregatedPool[];
  loading: boolean;
  error: string;
  forceUpdate: number;
  visibleIds: Set<string>;
}

const state = reactive<State>({
  pools: [],
  loading: false,
  error: "",
  forceUpdate: 0,
  visibleIds: new Set<string>(),
});

const api = getAVMTradeReporterAPI();
const maxItems = computed(() => props.maxItems || 5);

async function fetchAggregatedPools() {
  state.loading = true;
  state.error = "";
  try {
    const asset = Number(props.assetId);
    const size = 100; // Limit to reasonable number for compact display
    const [resA, resB] = await Promise.all([
      api.getApiAggregatedPool({ assetIdA: asset, size }),
      api.getApiAggregatedPool({ assetIdB: asset, size }),
    ]);
    
    const listA = (resA.data as AggregatedPool[]) || [];
    const listB = (resB.data as AggregatedPool[]) || [];
    const map = new Map<string, AggregatedPool>();
    const selected = BigInt(asset);

    function normalizeAndStore(p: AggregatedPool) {
      if (p.assetIdA === undefined || p.assetIdB === undefined) return;
      // Ensure selected asset is always assetIdA in stored version for consistent display
      let pool = p;
      if (BigInt(p.assetIdA) !== selected && BigInt(p.assetIdB) === selected) {
        pool = assetService.reverseAggregatedPool(p);
      }
      const key = `${Math.min(pool.assetIdA ?? 0, pool.assetIdB ?? 0)}-${Math.max(pool.assetIdA ?? 0, pool.assetIdB ?? 0)}`;
      // Keep the one with latest update if duplicate
      if (!map.has(key)) {
        map.set(key, pool);
      } else {
        const existing = map.get(key)!;
        if ((pool.lastUpdated || "") > (existing.lastUpdated || "")) {
          map.set(key, pool);
        }
      }
    }

    listA.forEach(normalizeAndStore);
    listB.forEach(normalizeAndStore);

    let merged = Array.from(map.values());
    // Sort by selected asset reserve descending (tvL_A since selected asset is assetIdA in all entries)
    merged.sort((a, b) => (b.tvL_A || 0) - (a.tvL_A || 0));
    state.pools = merged;

    // Schedule subscription update
    scheduleSubscriptionUpdate();
  } catch (e: unknown) {
    state.error = (e as Error)?.message || "Failed to load aggregated pools";
  } finally {
    state.loading = false;
  }
}

function aggregatedPoolUpdateEvent(p: AggregatedPool) {
  if (p.assetIdA === undefined || p.assetIdB === undefined) return;
  const selected = BigInt(props.assetId);
  // Only consider pools containing selected asset
  if (BigInt(p.assetIdA) !== selected && BigInt(p.assetIdB) !== selected)
    return;
  
  let pool = p;
  if (BigInt(p.assetIdA) !== selected && BigInt(p.assetIdB) === selected) {
    pool = assetService.reverseAggregatedPool(p);
  }
  
  // Only update if pool is visible (as requested)
  const key = poolKey(pool);
  if (!state.visibleIds.has(key)) return;
  
  // Replace if exists else push
  const idx = state.pools.findIndex(
    (x) =>
      (x.assetIdA === pool.assetIdA && x.assetIdB === pool.assetIdB) ||
      (x.assetIdA === pool.assetIdB && x.assetIdB === pool.assetIdA)
  );
  if (idx >= 0) {
    state.pools[idx] = pool;
  } else {
    state.pools.push(pool);
  }
  // Resort
  state.pools.sort((a, b) => (b.tvL_A || 0) - (a.tvL_A || 0));
}

// Asset name / unit helpers
function ensureAssetLoaded(assetId: bigint) {
  void state.forceUpdate;
  const info = assetService.getAssetInfo(assetId);
  if (!info) {
    assetService.requestAsset(assetId, () => state.forceUpdate++);
  }
  return info;
}

const assetInfo = computed(() => ensureAssetLoaded(BigInt(props.assetId)));
const assetUnitName = computed(
  () => assetInfo.value?.unitName || assetInfo.value?.name || "-"
);

function otherAssetInfo(p: AggregatedPool) {
  if (p.assetIdB === undefined || p.assetIdB === null) return null;
  return ensureAssetLoaded(BigInt(p.assetIdB));
}

function pairLabel(p: AggregatedPool) {
  const other = otherAssetInfo(p);
  const otherName = other?.unitName || other?.name || p.assetIdB;
  return `${assetUnitName.value}/${otherName}`;
}

function formatPrice(p: AggregatedPool) {
  if (p.assetIdA === undefined || p.assetIdB === undefined) return "-";
  if (p.virtualSumA === undefined || p.virtualSumB === undefined) return "-";
  return assetService.formatPairBalance(
    p.virtualSumA || 0,
    BigInt(p.assetIdA),
    p.virtualSumB || 0,
    BigInt(p.assetIdB),
    false
  );
}

function formatTVLAUSD(p: AggregatedPool) {
  if (p.totalTVLAssetAInUSD === undefined || p.totalTVLAssetAInUSD === null)
    return "-";
  return p.totalTVLAssetAInUSD.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function assetImageUrl(id?: number) {
  if (id === undefined || id === null) return "";
  return `https://algorand-trades.de-4.biatec.io/api/asset/image/${id}`;
}

function otherAssetUnitName(p: AggregatedPool) {
  const other = otherAssetInfo(p);
  return other?.unitName || other?.name || p.assetIdB;
}

// Visibility tracking & dynamic subscription
let intersectionObserver: IntersectionObserver | null = null;
let subscriptionDebounce: number | null = null;
let lastSubscriptionSignature = "";

function poolKey(p: AggregatedPool): string {
  return (
    p.id ||
    `${Math.min(p.assetIdA ?? 0, p.assetIdB ?? 0)}-${Math.max(p.assetIdA ?? 0, p.assetIdB ?? 0)}`
  );
}

function handleVisibility(id: string, isVisible: boolean) {
  if (isVisible) state.visibleIds.add(id);
  else state.visibleIds.delete(id);
  scheduleSubscriptionUpdate();
}

function scheduleSubscriptionUpdate() {
  if (subscriptionDebounce) window.clearTimeout(subscriptionDebounce);
  subscriptionDebounce = window.setTimeout(updateSubscription, 300);
}

function updateSubscription() {
  const ids = Array.from(state.visibleIds.values());
  const payload = {
    PoolsAddresses: [] as string[],
    AggregatedPoolsIds: ids,
    AssetIds: [props.assetId],
    MainAggregatedPools: false,
    RecentAggregatedPool: false,
    RecentBlocks: false,
    RecentLiquidity: false,
    RecentAssets: false,
    RecentPool: false,
    RecentTrades: false,
  };
  const signature = JSON.stringify({
    ids: ids.sort(),
    asset: props.assetId,
  });
  if (signature === lastSubscriptionSignature) return; // no change
  lastSubscriptionSignature = signature;
  signalrService.subscribe(payload);
}

// Directive to observe visibility of each row
const vObserveVisibility = {
  mounted(el: HTMLElement, binding: { value: string }) {
    const id: string = binding.value;
    if (!intersectionObserver) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const rowId = (entry.target as HTMLElement).dataset.aggId;
            if (!rowId) return;
            handleVisibility(rowId, entry.isIntersecting);
          });
        },
        { root: null, threshold: 0.01 }
      );
    }
    el.dataset.aggId = id;
    intersectionObserver.observe(el);
  },
  unmounted(el: HTMLElement) {
    if (intersectionObserver) intersectionObserver.unobserve(el);
    const id = el.dataset.aggId;
    if (id) handleVisibility(id, false);
  },
};

// Computed properties
const pools = computed(() => state.pools);
const loading = computed(() => state.loading);
const error = computed(() => state.error);

// Watch for asset ID changes
watch(
  () => props.assetId,
  () => {
    fetchAggregatedPools();
  }
);

onMounted(async () => {
  signalrService.onAggregatedPoolReceived(aggregatedPoolUpdateEvent);
  await fetchAggregatedPools();
});

onUnmounted(() => {
  signalrService.unsubscribeFromAggregatedPoolUpdates(aggregatedPoolUpdateEvent);
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }
});
</script>

<style scoped></style>