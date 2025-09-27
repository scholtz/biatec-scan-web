<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-white">{{ $t('assetDetails.recentPools') }}</h3>
      <div v-if="loading" class="text-sm text-gray-400">{{ $t('common.loading') }}...</div>
    </div>
    
    <div v-if="error" class="text-red-400 text-sm bg-red-900/20 p-3 rounded">
      {{ error }}
    </div>
    
    <div v-if="!loading && pools.length === 0" class="text-gray-400 text-center py-8">
      {{ $t('assetDetails.noPools') }}
    </div>
    
    <div v-else class="space-y-2">
      <div 
        v-for="pool in pools" 
        :key="`${pool.poolAddress}-${pool.timestamp}`"
        class="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800/70 transition-colors"
      >
        <PoolCard :pool="pool" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getAVMTradeReporterAPI } from '../api';
import { Pool } from '../api/models';
import { signalrService } from '../services/signalrService';
import PoolCard from './PoolCard.vue';

const { t } = useI18n();

const props = defineProps<{
  assetId: string;
}>();

const pools = ref<Pool[]>([]);
const loading = ref(false);
const error = ref<string>('');

async function fetchPools() {
  if (!props.assetId || props.assetId === '0') return;
  
  try {
    loading.value = true;
    error.value = '';
    
    const api = getAVMTradeReporterAPI();
    const response = await api.getApiPool({
      assetIdA: Number(props.assetId),
      size: 20
    });
    
    pools.value = response.data;
  } catch (err: unknown) {
    console.error('Error fetching pools:', err);
    error.value = t('assetDetails.poolsFetchError');
    
    // Set demo data in case of API error
    pools.value = [
      {
        poolAddress: 'POOL7LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAppId: 67890,
        assetIdA: Number(props.assetId),
        assetIdB: 0,
        a: 1000000,
        b: 500000,
        l: 750000,
        protocol: 'Biatec',
        timestamp: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
      } as Pool,
      {
        poolAddress: 'POOL2LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAppId: 67891,
        assetIdA: 0,
        assetIdB: Number(props.assetId),
        a: 300000,
        b: 200000,
        l: 250000,
        protocol: 'Pact',
        timestamp: new Date(Date.now() - 540000).toISOString(), // 9 minutes ago
      } as Pool,
      {
        poolAddress: 'POOL3LJKDSH8ALKJSDHALK7DJASHLDKJSAHLDKJSAHLDKJSAHLDKJ',
        poolAppId: 67892,
        assetIdA: Number(props.assetId),
        assetIdB: 31566704, // USDC
        a: 2000000,
        b: 1000000,
        l: 1500000,
        protocol: 'Tiny',
        timestamp: new Date(Date.now() - 840000).toISOString(), // 14 minutes ago
      } as Pool,
    ];
  } finally {
    loading.value = false;
  }
}

function handlePoolUpdate(pool: Pool) {
  // Only add pools for this specific asset
  if (
    pool.assetIdA?.toString() === props.assetId ||
    pool.assetIdB?.toString() === props.assetId
  ) {
    // Add to beginning of list and keep only 20 most recent
    pools.value = [pool, ...pools.value].slice(0, 20);
  }
}

onMounted(() => {
  fetchPools();
  signalrService.onPoolReceived(handlePoolUpdate);
  
  // Subscribe to pool updates for this specific asset
  signalrService.subscribe({
    RecentBlocks: false,
    RecentTrades: false,
    RecentLiquidity: false,
    RecentPool: true,
    RecentAggregatedPool: false,
    RecentAssets: false,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: [props.assetId], // Subscribe to pools for this specific asset
  });
});

onUnmounted(() => {
  signalrService.unsubscribeFromPoolUpdates(handlePoolUpdate);
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>