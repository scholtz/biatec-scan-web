<template>
  <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
    <div class="flex items-center justify-between mb-1 flex-wrap gap-1">
      <p class="text-sm font-medium text-white">
        {{ arg.name }}
        <span class="ml-2 text-xs font-mono text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded"
          >{{ arg.type }}</span
        >
      </p>
    </div>
    <p v-if="arg.desc" class="text-xs text-gray-400 mb-2">{{ arg.desc }}</p>

    <!-- Reference types resolved to a real account/app/asset: always clickable -->
    <router-link
      v-if="arg.kind === 'account' && arg.reference?.address"
      :to="{ name: 'AddressDetails', params: { address: arg.reference.address } }"
      class="text-purple-400 hover:text-purple-300 font-mono text-sm break-all"
    >
      {{ arg.reference.address }}
    </router-link>
    <router-link
      v-else-if="arg.kind === 'application' && arg.reference?.id !== undefined"
      :to="{ name: 'ApplicationDetails', params: { appId: arg.reference.id.toString() } }"
      class="text-purple-400 hover:text-purple-300 font-mono text-sm"
    >
      {{ arg.reference.id }}
    </router-link>
    <router-link
      v-else-if="arg.kind === 'asset' && arg.reference?.id !== undefined"
      :to="{ name: 'AssetDetails', params: { assetId: arg.reference.id.toString() } }"
      class="text-purple-400 hover:text-purple-300 font-mono text-sm"
    >
      {{ arg.reference.id }}
    </router-link>

    <!-- Plain uint value whose description hints it is really an asset/app id -->
    <div v-else-if="inferredLink" class="flex items-center gap-2">
      <router-link
        :to="inferredLink.to"
        class="text-purple-400 hover:text-purple-300 font-mono text-sm break-all"
      >
        {{ arg.formatted }}
      </router-link>
      <span class="text-xs text-gray-500 italic">({{ $t("transaction.abi.inferredLink") }})</span>
    </div>

    <p
      v-else-if="arg.kind === 'transaction'"
      class="text-gray-400 text-sm italic"
    >
      {{ arg.formatted }}
    </p>
    <p
      v-else-if="arg.kind === 'error'"
      class="text-red-400 text-sm break-all"
      :title="arg.error"
    >
      {{ arg.formatted }}
    </p>
    <p v-else class="text-gray-300 text-sm break-all font-mono">{{ arg.formatted }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from "vue";
import type { DecodedAbiArg } from "../../utils/abi56";
import {
  descriptionSuggestsAsset,
  descriptionSuggestsApplication,
} from "../../utils/abi56";

const props = defineProps({
  arg: {
    type: Object as PropType<DecodedAbiArg>,
    required: true,
  },
});

const UINT_TYPE = /^uint\d+$/;

// Only offer a "best guess" link for plain uint values whose ARC56 description names
// asset/app - never for arbitrary bytes/strings, and never silently: always labelled "inferred".
const inferredLink = computed(() => {
  const arg = props.arg;
  if (arg.kind !== "value" || !UINT_TYPE.test(arg.type)) return null;
  if (!/^\d+$/.test(arg.formatted)) return null;

  if (descriptionSuggestsAsset(arg.desc)) {
    return { to: { name: "AssetDetails", params: { assetId: arg.formatted } } };
  }
  if (descriptionSuggestsApplication(arg.desc)) {
    return { to: { name: "ApplicationDetails", params: { appId: arg.formatted } } };
  }
  return null;
});
</script>
