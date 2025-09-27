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
import { Liquidity, DEXProtocol, TxState } from '../api/models';
import { signalrService } from '../services/signalrService';
import type { AMMLiquidity } from '../types/algorand';
import LiquidityCard from './LiquidityCard.vue';

const { t } = useI18n();

const props = defineProps<{
  assetId: string;
}>();

const liquidity = ref<Liquidity[]>([]);
const loading = ref(false);
const error = ref<string>('');

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
    protocol: (liquidityItem.protocol as string) ?? 'Biatec',
    liquidityProvider: liquidityItem.liquidityProvider ?? '',
    poolAddress: liquidityItem.poolAddress ?? '',
    poolAppId: liquidityItem.poolAppId ?? 0,
    topTxId: liquidityItem.topTxId ?? '',
    txState: (liquidityItem.txState as string) ?? 'Confirmed',
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
    
    // For now, we'll use demo data since the API endpoint might not exist yet
    // TODO: Replace with actual API call when /api/liquidity endpoint is available
    console.log(`Fetching liquidity for asset ${props.assetId}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Demo data
    liquidity.value = [
      {
        assetIdA: Number(props.assetId),
        assetIdB: 0,
        assetIdLP: 1234567,
        assetAmountA: 1000000,
        assetAmountB: 500000,
        assetAmountLP: 750000,
        txId: 'LIQDEM1XW7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJ',
        blockId: 32145678,
        timestamp: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        protocol: 'Biatec',
        liquidityProvider: 'LPDEMO7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHL',
        poolAddress: 'POOL7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAppId: 67890,
        txState: 'Confirmed',
        direction: 'DepositLiquidity',
        a: 1000000,
        b: 500000,
        l: 750000,
      } as Liquidity,
      {
        assetIdA: 0,
        assetIdB: Number(props.assetId),
        assetIdLP: 1234568,
        assetAmountA: 300000,
        assetAmountB: 200000,
        assetAmountLP: 100000,
        txId: 'LIQDEM2XW7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJ',
        blockId: 32145670,
        timestamp: new Date(Date.now() - 480000).toISOString(), // 8 minutes ago
        protocol: 'Pact',
        liquidityProvider: 'LPDEMO2LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHL',
        poolAddress: 'POOL2LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAppId: 67891,
        txState: 'Confirmed',
        direction: 'WithdrawLiquidity',
        a: 300000,
        b: 200000,
        l: 100000,
      } as Liquidity,
      {
        assetIdA: Number(props.assetId),
        assetIdB: 31566704, // USDC
        assetIdLP: 1234569,
        assetAmountA: 2000000,
        assetAmountB: 1000000,
        assetAmountLP: 1500000,
        txId: 'LIQDEM3XW7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJ',
        blockId: 32145665,
        timestamp: new Date(Date.now() - 720000).toISOString(), // 12 minutes ago
        protocol: 'Tiny',
        liquidityProvider: 'LPDEMO3LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHL',
        poolAddress: 'POOL3LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAppId: 67892,
        txState: 'Confirmed',
        direction: 'DepositLiquidity',
        a: 2000000,
        b: 1000000,
        l: 1500000,
      } as Liquidity,
    ];
    
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
      protocol: (liquidityUpdate.protocol as DEXProtocol) ?? 'Biatec',
      liquidityProvider: liquidityUpdate.liquidityProvider,
      poolAddress: liquidityUpdate.poolAddress,
      poolAppId: liquidityUpdate.poolAppId,
      topTxId: liquidityUpdate.topTxId,
      txState: (liquidityUpdate.txState as TxState) ?? 'Confirmed',
      direction: liquidityUpdate.direction,
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
  signalrService.subscribe({
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
  });
});

onUnmounted(() => {
  signalrService.unsubscribeFromLiquidityUpdates(handleLiquidityUpdate);
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>