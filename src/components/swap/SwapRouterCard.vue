<template>
  <div
    class="rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200"
    :class="
      isBest
        ? 'border-green-500/60 bg-green-900/10 shadow-[0_0_0_1px_rgba(34,197,94,0.35)]'
        : 'border-dark-700/50 bg-dark-800/50'
    "
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="text-white font-semibold truncate">
            {{ result.router.displayName }}
          </h3>
          <span v-if="isBest" class="status-badge status-success">
            {{ $t("swap.bestRoute") }}
          </span>
        </div>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ $t(`swap.routers.${result.router.id}.description`) }}
        </p>
      </div>
      <a
        v-if="result.router.homepage"
        :href="result.router.homepage"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-primary-400 hover:text-primary-300 underline whitespace-nowrap"
      >
        {{ $t("swap.website") }}
      </a>
    </div>

    <!-- Status body -->
    <div class="flex-1 space-y-2 text-sm">
      <p v-if="result.status === 'unsupported'" class="text-gray-400">
        {{ $t("swap.status.unsupported", { network: networkLabel }) }}
      </p>
      <p v-else-if="result.status === 'idle'" class="text-gray-400">
        {{ $t("swap.status.idle") }}
      </p>
      <div v-else-if="result.status === 'loading'" class="flex items-center gap-2 text-gray-300">
        <span class="loading-spinner w-4 h-4 border-2" />
        {{ $t("swap.status.loading") }}
      </div>
      <p v-else-if="result.status === 'error'" class="text-red-300 break-words">
        {{ $t("swap.status.error") }}: {{ errorText }}
      </p>

      <template v-else-if="result.quote && toAsset">
        <div>
          <div class="text-xs text-gray-400">{{ $t("swap.youReceive") }}</div>
          <div class="text-2xl font-bold text-white font-mono leading-tight">
            {{ formatAmount(displayAmount, toAsset.decimals) }}
            <span class="text-base text-gray-300 font-sans">{{ assetLabel(toAsset) }}</span>
          </div>
          <div
            v-if="result.simulation"
            class="text-xs mt-0.5"
            :class="result.simulation.success ? 'text-green-400' : 'text-red-300'"
          >
            <template v-if="result.simulation.success">
              {{ $t("swap.simulated") }}
              <span
                v-if="result.simulation.netReceived !== result.quote.outputAmount"
                class="text-gray-400"
              >
                ({{ $t("swap.quoted") }}: {{ formatAmount(result.quote.outputAmount, toAsset.decimals) }})
              </span>
            </template>
            <template v-else>
              {{ $t("swap.simulationFailed") }}: {{ result.simulation.failureMessage }}
            </template>
          </div>
          <div v-else-if="!isPreviewOnly" class="text-xs text-gray-400 mt-0.5">
            {{ $t("swap.simulating") }}
          </div>
          <div
            v-if="belowBestPercent !== undefined && belowBestPercent > 0"
            class="text-xs text-amber-300 mt-0.5"
          >
            {{ $t("swap.belowBest", { percent: belowBestPercent.toFixed(2) }) }}
          </div>
        </div>

        <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt class="text-gray-400">{{ $t("swap.price") }}</dt>
          <dd class="text-gray-200 font-mono text-right truncate" :title="priceText">
            {{ priceText }}
          </dd>
          <dt class="text-gray-400">{{ $t("swap.minimumReceived") }}</dt>
          <dd class="text-gray-200 font-mono text-right">
            {{ formatAmount(result.quote.minimumReceived, toAsset.decimals) }}
          </dd>
          <template v-if="result.quote.priceImpactPercent !== undefined">
            <dt class="text-gray-400">{{ $t("swap.priceImpact") }}</dt>
            <dd
              class="font-mono text-right"
              :class="result.quote.priceImpactPercent > 5 ? 'text-red-300' : 'text-gray-200'"
            >
              {{ result.quote.priceImpactPercent.toFixed(2) }}%
            </dd>
          </template>
          <template v-if="result.quote.networkFeeMicroAlgos !== undefined">
            <dt class="text-gray-400">{{ $t("swap.networkFee") }}</dt>
            <dd class="text-gray-200 font-mono text-right">
              {{ formatAmount(result.quote.networkFeeMicroAlgos, 6, 4) }} {{ nativeTokenUnit }}
            </dd>
          </template>
          <dt class="text-gray-400">{{ $t("swap.transactions") }}</dt>
          <dd class="text-gray-200 font-mono text-right">{{ txCount }}</dd>
        </dl>

        <button
          type="button"
          class="text-xs text-primary-400 hover:text-primary-300 underline"
          @click="showRoute = !showRoute"
        >
          {{ showRoute ? $t("swap.hideRoute") : $t("swap.showRoute") }}
        </button>
        <SwapRouteDetails v-if="showRoute" :route="result.quote.route" />
      </template>
    </div>

    <button
      type="button"
      class="w-full py-2.5 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      :class="
        isBest
          ? 'bg-green-600 hover:bg-green-500 text-white'
          : 'bg-primary-600 hover:bg-primary-700 text-white'
      "
      :disabled="!canExecute"
      :title="disabledReason ?? ''"
      @click="$emit('execute')"
    >
      <span v-if="executing" class="inline-flex items-center gap-2">
        <span class="loading-spinner w-4 h-4 border-2" />
        {{ $t("swap.executing") }}
      </span>
      <span v-else>
        {{ $t("swap.swapVia", { router: result.router.displayName }) }}
      </span>
    </button>
    <p v-if="disabledReason && result.status === 'ok'" class="text-xs text-gray-400 text-center -mt-1">
      {{ disabledReason }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { nativeTokenUnit, networkLabel } from "../../config/env";
import { useAmountFormat } from "../../composables/useAmountFormat";
import { computeUnitPrice } from "../../swap/amounts";
import { assetLabel, type SwapAssetInfo } from "../../swap/assetInfo";
import { effectiveOutputAmount } from "../../swap/bestQuote";
import { errorMessage, SwapRouterError } from "../../swap/errors";
import type { RouterQuoteResult } from "../../swap/types";
import SwapRouteDetails from "./SwapRouteDetails.vue";

const props = defineProps<{
  result: RouterQuoteResult;
  isBest: boolean;
  fromAsset: SwapAssetInfo;
  toAsset: SwapAssetInfo | undefined;
  amountIn: bigint | undefined;
  belowBestPercent?: number;
  executing: boolean;
  /** Reason execution is disabled (already translated), or undefined. */
  disabledReason?: string;
  /** True when quoting without a wallet - no simulation is expected. */
  isPreviewOnly: boolean;
}>();

defineEmits<{ execute: [] }>();

const { t } = useI18n();
const { formatAmount, formatNumber } = useAmountFormat();
const showRoute = ref(false);

const displayAmount = computed<bigint>(
  () => effectiveOutputAmount(props.result) ?? props.result.quote?.outputAmount ?? 0n
);

const txCount = computed(() =>
  (props.result.quote?.groups ?? []).reduce(
    (sum, group) => sum + group.transactions.length,
    0
  )
);

const errorText = computed(() => {
  const error = props.result.error;
  if (error instanceof SwapRouterError) {
    const translated = t(`swap.routerErrors.${error.code}`);
    return error.detail ? `${translated} (${error.detail})` : translated;
  }
  return errorMessage(error);
});

const priceText = computed(() => {
  if (!props.toAsset || props.amountIn === undefined) return "-";
  const price = computeUnitPrice(
    props.amountIn,
    props.fromAsset.decimals,
    displayAmount.value,
    props.toAsset.decimals
  );
  if (price === undefined) return "-";
  return `1 ${assetLabel(props.fromAsset)} ≈ ${formatNumber(price)} ${assetLabel(props.toAsset)}`;
});

const canExecute = computed(
  () =>
    props.result.status === "ok" &&
    !!props.result.quote &&
    !props.executing &&
    props.disabledReason === undefined
);
</script>
