<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-white">{{ $t('assetDetails.recentTrades') }}</h3>
      <div v-if="loading" class="text-sm text-gray-400">{{ $t('common.loading') }}...</div>
    </div>
    
    <div v-if="error" class="text-red-400 text-sm bg-red-900/20 p-3 rounded">
      {{ error }}
    </div>
    
    <div v-if="!loading && trades.length === 0" class="text-gray-400 text-center py-8">
      {{ $t('assetDetails.noTrades') }}
    </div>
    
    <div v-else class="space-y-2">
      <div 
        v-for="trade in trades" 
        :key="`${trade.txId}-${trade.timestamp}`"
        class="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800/70 transition-colors"
      >
        <TradeCard :trade="convertToAMMTrade(trade)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Trade, DEXProtocol, TxState } from '../api/models';
import { signalrService } from '../services/signalrService';
import type { AMMTrade } from '../types/algorand';
import TradeCard from './TradeCard.vue';

const { t } = useI18n();

const props = defineProps<{
  assetId: string;
}>();

const trades = ref<Trade[]>([]);
const loading = ref(false);
const error = ref<string>('');

// Convert Trade API model to AMMTrade interface expected by TradeCard
function convertToAMMTrade(trade: Trade): AMMTrade {
  return {
    assetIdIn: BigInt(trade.assetIdIn ?? 0),
    assetIdOut: BigInt(trade.assetIdOut ?? 0),
    assetAmountIn: trade.assetAmountIn ?? 0,
    assetAmountOut: trade.assetAmountOut ?? 0,
    txId: trade.txId ?? '',
    blockId: BigInt(trade.blockId ?? 0),
    txGroup: trade.txGroup ?? '',
    timestamp: trade.timestamp ?? '',
    protocol: (trade.protocol as DEXProtocol) ?? 'Biatec',
    trader: trade.trader ?? '',
    poolAddress: trade.poolAddress ?? '',
    poolAppId: BigInt(trade.poolAppId ?? 0),
    topTxId: trade.topTxId ?? '',
    tradeState: (trade.tradeState as TxState) ?? 'Confirmed',
  };
}

async function fetchTrades() {
  if (!props.assetId || props.assetId === '0') return;
  
  try {
    loading.value = true;
    error.value = '';
    
    // For now, we'll use demo data since the API endpoint might not exist yet
    // TODO: Replace with actual API call when /api/trade endpoint is available
    console.log(`Fetching trades for asset ${props.assetId}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Demo data
    trades.value = [
      {
        assetIdIn: Number(props.assetId),
        assetIdOut: 0,
        assetAmountIn: 1000000,
        assetAmountOut: 500000,
        txId: 'DEMO1XW7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAH',
        blockId: 32145678,
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        protocol: 'Biatec',
        trader: 'DEMO7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAddress: 'POOL7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAppId: 67890,
        tradeState: 'Confirmed',
      } as Trade,
      {
        assetIdIn: 0,
        assetIdOut: Number(props.assetId),
        assetAmountIn: 500000,
        assetAmountOut: 750000,
        txId: 'DEMO2XW7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAH',
        blockId: 32145670,
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        protocol: 'Pact',
        trader: 'DEMO2LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAddress: 'POOL2LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAppId: 67891,
        tradeState: 'Confirmed',
      } as Trade,
      {
        assetIdIn: Number(props.assetId),
        assetIdOut: 31566704, // USDC
        assetAmountIn: 2000000,
        assetAmountOut: 1000000,
        txId: 'DEMO3XW7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAH',
        blockId: 32145665,
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        protocol: 'Tiny',
        trader: 'DEMO3LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAddress: 'POOL3LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAppId: 67892,
        tradeState: 'Confirmed',
      } as Trade,
    ];
    
  } catch (err: any) {
    console.error('Error fetching trades:', err);
    error.value = t('assetDetails.tradesFetchError');
  } finally {
    loading.value = false;
  }
}

function handleTradeUpdate(trade: AMMTrade) {
  // Only add trades for this specific asset
  if (
    trade.assetIdIn.toString() === props.assetId ||
    trade.assetIdOut.toString() === props.assetId
  ) {
    // Convert AMMTrade back to Trade for consistency
    const apiTrade: Trade = {
      assetIdIn: Number(trade.assetIdIn),
      assetIdOut: Number(trade.assetIdOut),
      assetAmountIn: trade.assetAmountIn,
      assetAmountOut: trade.assetAmountOut,
      txId: trade.txId,
      blockId: Number(trade.blockId),
      txGroup: trade.txGroup,
      timestamp: trade.timestamp,
      protocol: (trade.protocol as DEXProtocol) ?? 'Biatec',
      trader: trade.trader,
      poolAddress: trade.poolAddress,
      poolAppId: Number(trade.poolAppId),
      topTxId: trade.topTxId,
      tradeState: (trade.tradeState as TxState) ?? 'Confirmed',
    };
    
    // Add to beginning of list and keep only 20 most recent
    trades.value = [apiTrade, ...trades.value].slice(0, 20);
  }
}

onMounted(() => {
  fetchTrades();
  signalrService.onTradeReceived(handleTradeUpdate);
  
  // Subscribe to trades for this specific asset
  signalrService.subscribe({
    RecentBlocks: false,
    RecentTrades: true,
    RecentLiquidity: false,
    RecentPool: false,
    RecentAggregatedPool: false,
    RecentAssets: false,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: [props.assetId], // Subscribe to trades for this specific asset
  });
});

onUnmounted(() => {
  signalrService.unsubscribeFromTradeUpdates(handleTradeUpdate);
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>