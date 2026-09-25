<template>
  <div class="card">
    <div
      class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
    >
      <div>
        <h2 class="text-xl font-semibold text-white mb-2">
          {{ $t("common.identifiedPool") }}
        </h2>
        <div class="text-sm text-gray-400">
          {{ $t("common.poolPair") }}:
          <router-link
            v-if="pool.poolAddress"
            :to="{ name: 'PoolDetails', params: { poolAddress: pool.poolAddress } }"
            class="text-blue-400 hover:text-blue-300 font-mono transition-colors"
          >
            {{ pairLabel }}
          </router-link>
          <span v-else class="text-white font-mono">{{ pairLabel }}</span>
        </div>
        <slot name="extra" />
      </div>
      <router-link
        v-if="actionTo"
        :to="actionTo"
        class="btn-secondary text-sm self-start"
      >
        {{ actionLabel }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { RouteLocationRaw } from "vue-router";
import type { Pool } from "../api/models";
import { formatPoolPair } from "../utils/poolLabel";

const props = defineProps<{
  pool: Pool;
  /** Route for the optional action button (e.g. "view pool trades/details"); omit to hide the button. */
  actionTo?: RouteLocationRaw;
  actionLabel?: string;
}>();

const { t } = useI18n();

// formatPoolPair queues an asset-metadata load when an asset isn't cached
// yet; bump this to recompute the label once that resolves, since
// assetService's cache itself isn't reactive.
const forceUpdate = ref(0);

const pairLabel = computed(() => {
  void forceUpdate.value;
  return formatPoolPair(props.pool, t, () => forceUpdate.value++);
});
</script>
