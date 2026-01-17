<template>
  <div
    class="bg-gray-800/40 hover:bg-gray-800/60 transition-all duration-300 rounded-lg p-4 border border-gray-700/50"
  >
    <div class="flex flex-col h-full">
      <!-- Asset header -->
      <div class="flex items-center gap-3 mb-3">
        <img
          :src="assetImageUrl"
          :alt="assetName"
          class="w-12 h-12 rounded-lg border border-gray-600"
          @error="onImageError"
        />
        <div class="flex-1 min-w-0">
          <router-link
            :to="`/asset/${asset.index}`"
            class="text-white font-medium text-sm hover:text-blue-300 transition-colors block truncate"
            :title="assetName"
          >
            {{ assetName }}
          </router-link>
          <div class="text-xs text-gray-400 font-mono">#{{ asset.index }}</div>
        </div>
      </div>

      <!-- Asset metrics -->
      <div class="space-y-2 flex-1">
        <div class="flex justify-between items-center">
          <span class="text-xs text-gray-400">Price (USD)</span>
          <span class="text-sm text-white font-mono">
            <template
              v-if="asset.priceUSD === undefined || asset.priceUSD === null"
              >-</template
            >
            <template v-else>
              <FormattedNumber
                :value="asset.priceUSD"
                type="number"
                :minimum-fraction-digits="2"
                :maximum-fraction-digits="6"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </template>
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-xs text-gray-400">Real TVL</span>
          <span class="text-sm text-white font-mono">
            <template
              v-if="asset.tvL_USD === undefined || asset.tvL_USD === null"
              >-</template
            >
            <template v-else>
              <FormattedNumber
                :value="asset.tvL_USD"
                type="number"
                :maximum-fraction-digits="2"
                :small-threshold="0.01"
                :significant-digits="4"
              />
            </template>
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-xs text-gray-400">Unit</span>
          <span class="text-sm text-white">
            {{ asset.params?.unitName || "-" }}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div
        class="mt-3 pt-3 border-t border-gray-700/50 flex justify-between items-center"
      >
        <router-link
          :to="`/aggregated-pools/${asset.index}`"
          class="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          View Pools
        </router-link>
        <button
          v-if="showFavorite"
          @click="toggleFavorite"
          class="favorite-star-btn transition-all duration-300 hover:scale-110 active:scale-95"
          :class="
            isFavorite
              ? 'text-yellow-400 animate-pulse'
              : 'text-gray-400 hover:text-yellow-300'
          "
          :title="isFavorite ? 'Remove from favorites' : 'Add to favorites'"
        >
          <svg
            class="w-4 h-4 transition-all duration-300"
            :class="{ 'drop-shadow-lg': isFavorite }"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="isFavorite"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
            <path
              v-else
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { BiatecAsset } from "../api/models";
import { favoriteService } from "../services/favoriteService";
import FormattedNumber from "./FormattedNumber.vue";

interface Props {
  asset: BiatecAsset;
  showFavorite?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showFavorite: false,
});

const emit = defineEmits<{
  favoriteChanged: [assetIndex: number, isFavorite: boolean];
}>();

const imageError = ref(false);

const assetImageUrl = computed(() => {
  if (imageError.value) {
    return "/default-asset.png"; // fallback image
  }
  return `https://algorand-trades.de-4.biatec.io/api/asset/image/${props.asset.index}`;
});

const assetName = computed(() => {
  return (
    props.asset.params?.name ||
    props.asset.params?.unitName ||
    `Asset ${props.asset.index}`
  );
});

const isFavorite = computed(() => {
  return favoriteService.isReactiveFavorite(props.asset.index);
});

const onImageError = () => {
  imageError.value = true;
};

const toggleFavorite = () => {
  const newState = favoriteService.toggleFavorite(props.asset.index);
  emit("favoriteChanged", props.asset.index, newState);

  // Force reactivity update
  const favoritesRef = favoriteService.getReactiveFavorites();
  favoritesRef.value = new Set(favoritesRef.value);
};
</script>

<style scoped>
.favorite-star-btn {
  position: relative;
}

.favorite-star-btn:active {
  animation: starPop 0.3s ease-in-out;
}

@keyframes starPop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* Add a subtle glow effect when favorited */
.favorite-star-btn.text-yellow-400:hover {
  filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.5));
}

/* Smooth transition for star state changes */
.favorite-star-btn svg {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
