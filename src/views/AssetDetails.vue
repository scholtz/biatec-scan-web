<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Asset {{ headerName }}</h1>
      <div class="text-sm text-gray-400">ID: {{ assetId }}</div>
    </div>

    <div class="card space-y-4">
      <div class="flex">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
          <div>
            <div class="text-xs text-gray-400">Name</div>
            <div class="text-white">{{ name }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-400">Unit</div>
            <div class="text-white">{{ unitName }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-400">Decimals</div>
            <div class="text-white">{{ decimals }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-400">Total Supply</div>
            <div class="text-white">{{ formattedTotal }}</div>
          </div>
        </div>
        <div class="align-right text-right">
          <img
            :src="`https://algorand-trades.de-4.biatec.io/api/asset/image/${assetId}`"
            alt="Asset Image"
            class="inline-block w-50 h-50 ml-1"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <router-link
          :to="{
            name: 'PoolsByAsset',
            params: { asset1: assetId },
          }"
          class="btn-secondary"
        >
          View all {{ name }} pools
        </router-link>
        <router-link
          :to="{
            name: 'PoolsByAssets',
            params: { asset1: assetId, asset2: 0 },
          }"
          class="btn-secondary"
        >
          View Pools with ALGO
        </router-link>
        <router-link
          :to="{
            name: 'PoolsByAssets',
            params: { asset1: assetId, asset2: 31566704 },
          }"
          class="btn-secondary"
        >
          View Pools with USDC
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { assetService } from "../services/assetService";

const route = useRoute();
const assetId = ref<string>(route.params.assetId as string);

const forceUpdate = ref<number>(0);

const name = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return "Loading...";
  return info.name || `Asset ${assetId.value}`;
});

const unitName = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return "Loading...";
  return info.unitName || info.name || `Asset ${assetId.value}`;
});

const decimals = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return "Loading...";
  return info.decimals ?? 0;
});

const formattedTotal = computed(() => {
  void forceUpdate.value;
  const info = assetService.getAssetInfo(BigInt(assetId.value));
  if (!info) return "Loading...";
  const d = info.decimals || 0;
  const total = Number(info.total) / Math.pow(10, d);
  return total.toLocaleString();
});

const headerName = computed(() => `${unitName.value}/${name.value}`);

function ensureLoaded() {
  const id = BigInt(Number(assetId.value) || 0);
  assetService.requestAsset(id, () => {
    forceUpdate.value++;
  });
}

onMounted(ensureLoaded);

watch(
  () => route.params.assetId,
  (v) => {
    assetId.value = String(v ?? "0");
    ensureLoaded();
  }
);
</script>

<style scoped></style>
