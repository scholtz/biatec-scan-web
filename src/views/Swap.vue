<template>
  <div class="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-white">{{ $t("swap.title") }}</h1>
        <p class="text-sm text-gray-400 mt-1">
          {{ $t("swap.subtitle", { count: supportedRouterCount }) }}
        </p>
      </div>
      <WalletConnectButton />
    </div>

    <div class="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6 items-start">
      <!-- Order form -->
      <div class="card space-y-4 relative z-10">
        <!-- From -->
        <div class="rounded-xl bg-dark-900/50 border border-dark-700/50 p-4 space-y-2">
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>{{ $t("swap.youPay") }}</span>
            <button
              v-if="fromBalance !== undefined"
              type="button"
              class="hover:text-white underline-offset-2 hover:underline"
              @click="setMaxAmount"
            >
              {{ $t("swap.balance") }}:
              {{ formatAmount(fromBalance, fromAsset.decimals) }}
              {{ assetLabel(fromAsset) }}
              <span class="ml-1 text-primary-400">{{ $t("swap.max") }}</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="amountInput"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              placeholder="0.0"
              class="flex-1 min-w-0 bg-transparent text-2xl font-mono text-white placeholder-gray-600 focus:outline-none"
              :class="{ 'text-red-300': amountInvalid || insufficientBalance }"
              @keyup.enter="getQuotes"
            />
            <SwapAssetPicker
              :model-value="fromAsset"
              :balances="holdings.holdings.value.balances"
              @update:model-value="(asset) => (fromAsset = asset)"
            />
          </div>
          <p v-if="amountInvalid" class="text-xs text-red-300">
            {{ $t("swap.errors.invalidAmount", { decimals: fromAsset.decimals }) }}
          </p>
          <p v-else-if="insufficientBalance" class="text-xs text-red-300">
            {{ $t("swap.errors.insufficientBalance") }}
          </p>
        </div>

        <!-- Switch -->
        <div class="flex justify-center -my-2 relative z-10">
          <button
            type="button"
            class="w-10 h-10 rounded-full bg-dark-800 border border-dark-600/60 text-gray-300 hover:text-white hover:border-primary-500 flex items-center justify-center transition-all duration-200"
            :title="$t('swap.switch')"
            :aria-label="$t('swap.switch')"
            @click="switchAssets"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        <!-- To -->
        <div class="rounded-xl bg-dark-900/50 border border-dark-700/50 p-4 space-y-2">
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>{{ $t("swap.youReceive") }}</span>
            <span v-if="toAsset && toBalance !== undefined">
              {{ $t("swap.balance") }}:
              {{ formatAmount(toBalance, toAsset.decimals) }}
              {{ assetLabel(toAsset) }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex-1 min-w-0 text-2xl font-mono text-white truncate">
              <template v-if="bestOutput !== undefined && toAsset">
                {{ formatAmount(bestOutput, toAsset.decimals) }}
              </template>
              <span v-else class="text-gray-600">0.0</span>
            </div>
            <SwapAssetPicker
              :model-value="toAsset"
              :balances="holdings.holdings.value.balances"
              @update:model-value="(asset) => (toAsset = asset)"
            />
          </div>
          <p v-if="samePair" class="text-xs text-red-300">
            {{ $t("swap.errors.samePair") }}
          </p>
        </div>

        <!-- Slippage -->
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="text-gray-400">{{ $t("swap.slippage") }}</span>
          <button
            v-for="preset in slippagePresets"
            :key="preset"
            type="button"
            class="px-2 py-1 rounded-md border text-xs transition-colors"
            :class="
              slippageBps === preset * 100
                ? 'border-primary-500 bg-primary-600/20 text-primary-200'
                : 'border-dark-700/50 text-gray-300 hover:border-dark-500'
            "
            @click="setSlippagePercent(preset)"
          >
            {{ preset }}%
          </button>
          <label class="flex items-center gap-1 text-xs text-gray-300">
            <input
              :value="slippagePercentInput"
              type="text"
              inputmode="decimal"
              class="w-16 px-2 py-1 bg-dark-800/70 border border-dark-700/50 rounded-md text-white text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
              @change="onSlippageInput"
            />
            %
          </label>
          <span v-if="slippageBps >= 10000" class="text-xs text-amber-300">
            {{ $t("swap.slippageUnprotected") }}
          </span>
          <span v-else-if="slippageBps > 500" class="text-xs text-amber-300">
            {{ $t("swap.slippageHigh") }}
          </span>
        </div>

        <button
          type="button"
          class="btn-primary w-full py-3 text-base font-semibold"
          :disabled="!canQuote"
          @click="getQuotes"
        >
          <span v-if="quoting" class="inline-flex items-center gap-2">
            <span class="loading-spinner w-4 h-4 border-2" />
            {{ $t("swap.gettingQuotes") }}
          </span>
          <span v-else-if="hasQuotes">{{ $t("swap.refreshQuotes") }}</span>
          <span v-else>{{ $t("swap.getQuotes") }}</span>
        </button>

        <p v-if="!activeAddress" class="text-xs text-gray-400 text-center">
          {{ $t("swap.connectToExecute") }}
        </p>
        <p v-else-if="holdings.error.value" class="text-xs text-amber-300 text-center">
          {{ $t("swap.errors.holdingsUnavailable") }}
          <button type="button" class="underline ml-1" @click="holdings.refresh()">
            {{ $t("common.refresh") }}
          </button>
        </p>
        <p v-else-if="quotesStale" class="text-xs text-amber-300 text-center">
          {{ $t("swap.errors.staleQuote") }}
        </p>
        <p v-else-if="quotedAt" class="text-xs text-gray-500 text-center">
          {{ $t("swap.quotedAgo", { seconds: Math.floor(quoteAgeMs / 1000) }) }}
        </p>

        <!-- Opt-in notices -->
        <div
          v-if="toAssetNeedsOptIn && toAsset"
          class="rounded-lg border border-amber-500/40 bg-amber-900/10 p-3 text-sm text-amber-200 space-y-2"
        >
          <p>{{ $t("swap.optIn.assetRequired", { asset: assetLabel(toAsset) }) }}</p>
          <button
            type="button"
            class="btn-secondary text-sm"
            :disabled="optingIn"
            @click="optInToAsset(toAsset.id)"
          >
            {{ optingIn ? $t("swap.optIn.inProgress") : $t("swap.optIn.assetButton", { asset: assetLabel(toAsset) }) }}
          </button>
        </div>
        <div
          v-for="appId in missingAppOptIns"
          :key="appId.toString()"
          class="rounded-lg border border-amber-500/40 bg-amber-900/10 p-3 text-sm text-amber-200 space-y-2"
        >
          <p>{{ $t("swap.optIn.appRequired", { app: appId.toString() }) }}</p>
          <button
            type="button"
            class="btn-secondary text-sm"
            :disabled="optingIn"
            @click="optInToApp(appId)"
          >
            {{ optingIn ? $t("swap.optIn.inProgress") : $t("swap.optIn.appButton", { app: appId.toString() }) }}
          </button>
        </div>
      </div>

      <!-- Router results -->
      <div class="space-y-4">
        <div
          v-if="lastExecution"
          class="card border-green-500/40 bg-green-900/10 space-y-2"
        >
          <h2 class="text-lg font-semibold text-white">
            {{ $t("swap.result.title") }}
          </h2>
          <p class="text-sm text-gray-200">
            {{
              $t("swap.result.summary", {
                amount: formatAmount(lastExecution.amountIn, lastExecution.fromAsset.decimals),
                from: assetLabel(lastExecution.fromAsset),
                to: assetLabel(lastExecution.toAsset),
                router: routerName(lastExecution.routerId),
              })
            }}
          </p>
          <ul class="text-xs font-mono space-y-1">
            <li v-for="txId in lastExecution.txIds" :key="txId">
              <router-link
                :to="`/transaction/${txId}`"
                class="text-primary-400 hover:text-primary-300 underline break-all"
              >
                {{ txId }}
              </router-link>
            </li>
          </ul>
        </div>

        <p v-if="quoteError" class="text-sm text-red-300">{{ quoteError }}</p>

        <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SwapRouterCard
            v-for="result in results"
            :key="result.router.id"
            :result="result"
            :is-best="result.router.id === bestRouterId"
            :from-asset="fromAsset"
            :to-asset="toAsset"
            :amount-in="amountBaseUnits"
            :below-best-percent="percentBelowBest(result, results)"
            :executing="executingRouterId === result.router.id"
            :disabled-reason="disabledReasonFor(result)"
            :is-preview-only="!activeAddress"
            @execute="execute(result.router.id)"
          />
        </div>

        <div class="card text-xs text-gray-400 space-y-1">
          <p>{{ $t("swap.disclaimer.simulation") }}</p>
          <p>{{ $t("swap.disclaimer.risk") }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import SwapAssetPicker from "../components/swap/SwapAssetPicker.vue";
import SwapRouterCard from "../components/swap/SwapRouterCard.vue";
import WalletConnectButton from "../components/wallet/WalletConnectButton.vue";
import { useAmountFormat } from "../composables/useAmountFormat";
import { useSwap } from "../composables/useSwap";
import { genesisId } from "../config/env";
import { assetLabel } from "../swap/assetInfo";
import { effectiveOutputAmount, percentBelowBest } from "../swap/bestQuote";
import { getSwapRouter, swapRouters } from "../swap/routers";
import type { RouterQuoteResult } from "../swap/types";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { formatAmount } = useAmountFormat();

function paramAsId(value: string | string[] | undefined): bigint | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw !== undefined && /^\d+$/.test(raw) ? BigInt(raw) : undefined;
}

const initialFrom = ref(paramAsId(route.params.fromAssetId));
const initialTo = ref(paramAsId(route.params.toAssetId));

const {
  activeAddress,
  holdings,
  fromAsset,
  toAsset,
  amountInput,
  amountBaseUnits,
  slippageBps,
  setSlippagePercent,
  switchAssets,
  setMaxAmount,
  fromBalance,
  insufficientBalance,
  samePair,
  canQuote,
  toAssetNeedsOptIn,
  missingAppOptIns,
  results,
  quoting,
  quoteError,
  quotedAt,
  quoteAgeMs,
  quotesStale,
  hasQuotes,
  bestRouterId,
  getQuotes,
  executingRouterId,
  optingIn,
  lastExecution,
  execute,
  optInToAsset,
  optInToApp,
  dispose,
} = useSwap(initialFrom, initialTo);

onUnmounted(dispose);

const supportedRouterCount = swapRouters.filter((r) =>
  r.supportsNetwork(genesisId)
).length;

const slippagePresets = [0.1, 0.5, 1];
const slippagePercentInput = computed(() => (slippageBps.value / 100).toString());

function onSlippageInput(event: Event) {
  setSlippagePercent((event.target as HTMLInputElement).value);
}

const amountInvalid = computed(
  () => amountInput.value.trim() !== "" && amountBaseUnits.value === undefined
);

const toBalance = computed(() =>
  toAsset.value ? holdings.balanceOf(toAsset.value.id) : undefined
);

const bestOutput = computed<bigint | undefined>(() => {
  const best = results.value.find((r) => r.router.id === bestRouterId.value);
  return best ? effectiveOutputAmount(best) : undefined;
});

function routerName(id: string): string {
  return getSwapRouter(id)?.displayName ?? id;
}

function disabledReasonFor(result: RouterQuoteResult): string | undefined {
  if (result.status !== "ok") return undefined;
  if (!activeAddress.value) return t("swap.connectToExecute");
  if (holdings.error.value) return t("swap.errors.holdingsUnavailable");
  if (quotesStale.value) return t("swap.errors.staleQuote");
  if (insufficientBalance.value) return t("swap.errors.insufficientBalance");
  if (toAssetNeedsOptIn.value) return t("swap.errors.assetOptInRequired");
  if (result.simulation && !result.simulation.success) {
    return t("swap.errors.simulationBlocked");
  }
  if (result.quote?.requiredAppOptIns.some((id) => missingAppOptIns.value.includes(id))) {
    return t("swap.errors.appOptInRequired");
  }
  if (executingRouterId.value && executingRouterId.value !== result.router.id) {
    return t("swap.errors.otherExecuting");
  }
  return undefined;
}

// Keep the URL in sync so a pair can be shared / bookmarked.
watch(
  [() => fromAsset.value.id, () => toAsset.value?.id],
  ([from, to]) => {
    if (to === undefined) return;
    const target = `/swap/${from}/${to}`;
    if (route.path !== target) void router.replace(target);
  }
);
</script>
