<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-white">{{ $t('assetDetails.recentLiquidity') }}</h3>
      <div v-if="loading" class="text-sm text-gray-400">{{ $t('common.loading') }}...</div>
    </div>
    
    <div v-if="error" class="text-red-400 text-sm bg-red-900/20 p-3 rounded">
      {{ error }}
    </div>
    
    <div v-if="!loading && liquidity.length === 0" class="text-gray-400 text-center py-8">
      {{ $t('assetDetails.noLiquidity') }}
    </div>
    
    <div v-else class="space-y-2">
      <div 
        v-for="liquidityItem in liquidity" 
        :key="`${liquidityItem.txId}-${liquidityItem.timestamp}`"
        class="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800/70 transition-colors"
      >
        <LiquidityCard :liquidity="convertToAMMLiquidity(liquidityItem)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Liquidity } from '../api/models';
import { getAVMTradeReporterAPI } from '../api';
import { signalrService } from '../services/signalrService';
import type { AMMLiquidity } from '../types/algorand';
import type { SubscriptionFilter } from '../types/SubscriptionFilter';
import LiquidityCard from './LiquidityCard.vue';

const { t } = useI18n();

const props = defineProps<{
  assetId: string;
}>();

const liquidity = ref<Liquidity[]>([]);
const loading = ref(false);
const error = ref<string>('');
let subscriptionFilter: SubscriptionFilter | null = null;

// Convert Liquidity API model to AMMLiquidity interface expected by LiquidityCard
function convertToAMMLiquidity(liquidityItem: Liquidity): AMMLiquidity {
  return {
    assetIdA: liquidityItem.assetIdA ?? 0,
    assetIdB: liquidityItem.assetIdB ?? 0,
    assetIdLP: liquidityItem.assetIdLP ?? 0,
    assetAmountA: liquidityItem.assetAmountA ?? 0,
    assetAmountB: liquidityItem.assetAmountB ?? 0,
    assetAmountLP: liquidityItem.assetAmountLP ?? 0,
    txId: liquidityItem.txId ?? '',
    blockId: liquidityItem.blockId ?? 0,
    txGroup: liquidityItem.txGroup ?? '',
    timestamp: liquidityItem.timestamp ?? '',
    protocol: liquidityItem.protocol ?? 'Biatec',
    liquidityProvider: liquidityItem.liquidityProvider ?? '',
    poolAddress: liquidityItem.poolAddress ?? '',
    poolAppId: liquidityItem.poolAppId ?? 0,
    topTxId: liquidityItem.topTxId ?? '',
    txState: liquidityItem.txState ?? 'Confirmed',
    direction: liquidityItem.direction ?? 'DepositLiquidity',
    a: liquidityItem.a ?? 0,
    b: liquidityItem.b ?? 0,
    l: liquidityItem.l ?? 0,
  };
}

async function fetchLiquidity() {
  if (!props.assetId || props.assetId === '0') return;
  
  try {
    loading.value = true;
    error.value = '';
    
    console.log(`Fetching liquidity for asset ${props.assetId}`);
    
    // Use the real API endpoint
    const api = getAVMTradeReporterAPI();
    
    // Fetch liquidity where this asset is assetIdA
    const responseA = await api.getApiLiquidity({
      assetIdA: Number(props.assetId),
      size: 20 // Fetch last 20 liquidity updates
    });
    
    // Fetch liquidity where this asset is assetIdB
    const responseB = await api.getApiLiquidity({
      assetIdB: Number(props.assetId),
      size: 20 // Fetch last 20 liquidity updates
    });
    
    // Combine and sort by timestamp (most recent first)
    const allLiquidity = [...(responseA.data || []), ...(responseB.data || [])];
    allLiquidity.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    
    // Take only the 20 most recent
    liquidity.value = allLiquidity.slice(0, 20);
    
  } catch (err: unknown) {
    console.error('Error fetching liquidity:', err);
    error.value = t('assetDetails.liquidityFetchError');
  } finally {
    loading.value = false;
  }
}

function handleLiquidityUpdate(liquidityUpdate: AMMLiquidity) {
  // Only add liquidity updates for this specific asset
  if (
    liquidityUpdate.assetIdA.toString() === props.assetId ||
    liquidityUpdate.assetIdB.toString() === props.assetId
  ) {
    // Convert AMMLiquidity back to Liquidity for consistency
    const apiLiquidity: Liquidity = {
      assetIdA: liquidityUpdate.assetIdA,
      assetIdB: liquidityUpdate.assetIdB,
      assetIdLP: liquidityUpdate.assetIdLP,
      assetAmountA: liquidityUpdate.assetAmountA,
      assetAmountB: liquidityUpdate.assetAmountB,
      assetAmountLP: liquidityUpdate.assetAmountLP,
      txId: liquidityUpdate.txId,
      blockId: liquidityUpdate.blockId,
      txGroup: liquidityUpdate.txGroup,
      timestamp: liquidityUpdate.timestamp,
      protocol: liquidityUpdate.protocol as any, // Type assertion needed for compatibility
      liquidityProvider: liquidityUpdate.liquidityProvider,
      poolAddress: liquidityUpdate.poolAddress,
      poolAppId: liquidityUpdate.poolAppId,
      topTxId: liquidityUpdate.topTxId,
      txState: liquidityUpdate.txState as any, // Type assertion needed for compatibility
      direction: liquidityUpdate.direction as any, // Type assertion needed for compatibility
      a: liquidityUpdate.a,
      b: liquidityUpdate.b,
      l: liquidityUpdate.l,
    };
    
    // Add to beginning of list and keep only 20 most recent
    liquidity.value = [apiLiquidity, ...liquidity.value].slice(0, 20);
  }
}

onMounted(() => {
  fetchLiquidity();
  signalrService.onLiquidityReceived(handleLiquidityUpdate);
  
  // Subscribe to liquidity updates for this specific asset
  subscriptionFilter = {
    RecentBlocks: false,
    RecentTrades: false,
    RecentLiquidity: true,
    RecentPool: false,
    RecentAggregatedPool: false,
    RecentAssets: false,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: [props.assetId], // Subscribe to liquidity for this specific asset
  };
  signalrService.subscribe(subscriptionFilter);
});

onUnmounted(() => {
  signalrService.unsubscribeFromLiquidityUpdates(handleLiquidityUpdate);
  if (subscriptionFilter) {
    signalrService.unsubscribeFilter(subscriptionFilter);
  }
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>