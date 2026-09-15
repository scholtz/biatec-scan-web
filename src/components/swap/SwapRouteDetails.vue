<template>
  <div class="space-y-2 text-xs text-gray-300">
    <p v-if="route.note === 'no-pool-breakdown'" class="text-gray-400">
      {{ $t("swap.route.noPoolBreakdown") }}
    </p>
    <p v-else-if="route.note === 'no-detailed-route'" class="text-gray-400">
      {{ $t("swap.route.noDetailedRoute") }}
    </p>
    <div
      v-for="(path, pathIndex) in route.paths"
      :key="pathIndex"
      class="rounded-lg border border-dark-700/50 bg-dark-900/40 p-2 space-y-1"
    >
      <div v-if="route.paths.length > 1" class="text-gray-400">
        {{ $t("swap.route.path", { index: pathIndex + 1 }) }}
        <span v-if="path.percentage !== undefined">
          · {{ path.percentage.toFixed(1) }}%
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <template v-for="(hop, hopIndex) in path.hops" :key="hopIndex">
          <span v-if="hopIndex === 0" class="font-mono text-white">
            {{ unit(hop.fromAssetId) }}
          </span>
          <span class="text-gray-500">→</span>
          <span
            class="px-1.5 py-0.5 rounded bg-dark-700/60 text-gray-200"
            :title="hop.pools.map((p) => p.label).join(', ')"
          >
            {{ poolSummary(hop) }}
          </span>
          <span class="text-gray-500">→</span>
          <span class="font-mono text-white">{{ unit(hop.toAssetId) }}</span>
        </template>
      </div>
    </div>
    <ul v-if="route.steps && route.steps.length > 0" class="list-disc list-inside text-gray-400">
      <li v-for="(step, index) in route.steps" :key="index">{{ step }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { algorandService } from "../../services/algorandService";
import { assetLabel, loadSwapAssetInfo } from "../../swap/assetInfo";
import type { SwapRouteHop, SwapRouteInfo } from "../../swap/types";

const props = defineProps<{ route: SwapRouteInfo }>();

const names = ref(new Map<string, string>());
const algod = algorandService.getAlgodClient();

function unit(id: bigint): string {
  return names.value.get(id.toString()) ?? `#${id}`;
}

function poolSummary(hop: SwapRouteHop): string {
  const labels = [...new Set(hop.pools.map((p) => p.protocol ?? p.label))];
  if (labels.length === 0) return "?";
  if (hop.pools.length > 1) return `${labels.join(" + ")} (${hop.pools.length})`;
  return labels[0];
}

async function resolveNames(): Promise<void> {
  const ids = new Set<bigint>();
  for (const path of props.route.paths) {
    for (const hop of path.hops) {
      ids.add(hop.fromAssetId);
      ids.add(hop.toAssetId);
    }
  }
  const entries = await Promise.all(
    [...ids].map(async (id): Promise<[string, string]> => [
      id.toString(),
      await loadSwapAssetInfo(id, algod)
        .then(assetLabel)
        .catch(() => `#${id}`),
    ])
  );
  names.value = new Map(entries);
}

watch(() => props.route, () => void resolveNames(), { immediate: true });
</script>
