// src/composables/useSwap.ts - Reactive orchestration for the Swap page:
// pair/amount/slippage state, "quote all routers" rounds with incremental
// updates, best-route selection and execution through the connected wallet.
// Router-specific code never appears here; see src/swap/README.md.
import algosdk from "algosdk";
import { computed, ref, shallowRef, watch, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { useWallet } from "@txnlab/use-wallet-vue";
import { genesisId, swapReferrerAddress, usdcAssetId } from "../config/env";
import { algorandService } from "../services/algorandService";
import { getAuthToken } from "../services/authService";
import { parseAmountToBaseUnits, percentToBps } from "../swap/amounts";
import {
  loadSwapAssetInfo,
  NATIVE_ASSET,
  type SwapAssetInfo,
} from "../swap/assetInfo";
import { pickBestRouterId } from "../swap/bestQuote";
import { errorMessage } from "../swap/errors";
import {
  executeSwapQuote,
  SwapExecutionError,
  type SwapExecutionResult,
} from "../swap/executeSwap";
import { createInitialResults, quoteAllRouters } from "../swap/quoteService";
import { swapRouters } from "../swap/routers";
import type { RouterQuoteResult, SwapRequest } from "../swap/types";
import { isUserRejection } from "../wallet/errors";
import { useAccountHoldings } from "./useAccountHoldings";
import { useToast } from "./useToast";

const SLIPPAGE_STORAGE_KEY = "swap-slippage-bps";
const DEFAULT_SLIPPAGE_BPS = 100;
/** Quotes older than this are treated as stale and must be refreshed. */
export const QUOTE_TTL_MS = 90_000;

function readStoredSlippage(): number {
  try {
    const raw = localStorage.getItem(SLIPPAGE_STORAGE_KEY);
    const parsed = raw === null ? NaN : Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10000) return parsed;
  } catch {
    // localStorage unavailable (private mode etc.) - fall back to default
  }
  return DEFAULT_SLIPPAGE_BPS;
}

export interface SwapExecutionRecord extends SwapExecutionResult {
  routerId: string;
  fromAsset: SwapAssetInfo;
  toAsset: SwapAssetInfo;
  amountIn: bigint;
}

export function useSwap(
  initialFrom?: Ref<bigint | undefined>,
  initialTo?: Ref<bigint | undefined>
) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { activeAddress, signTransactions } = useWallet();
  const algod = algorandService.getAlgodClient();
  const holdings = useAccountHoldings(activeAddress);

  const fromAsset = ref<SwapAssetInfo>(NATIVE_ASSET);
  const toAsset = ref<SwapAssetInfo | undefined>(undefined);
  const amountInput = ref("");
  const slippageBps = ref(readStoredSlippage());
  const results = shallowRef<RouterQuoteResult[]>(
    createInitialResults(swapRouters, genesisId)
  );
  const quoting = ref(false);
  const executingRouterId = ref<string | null>(null);
  const optingIn = ref(false);
  const lastExecution = shallowRef<SwapExecutionRecord | null>(null);
  const quotedAt = ref<number | null>(null);
  const quoteError = ref<string | null>(null);
  let abort: AbortController | undefined;

  const amountBaseUnits = computed<bigint | undefined>(() =>
    parseAmountToBaseUnits(amountInput.value, fromAsset.value.decimals)
  );

  const fromBalance = computed<bigint | undefined>(() =>
    holdings.balanceOf(fromAsset.value.id)
  );

  /** Only meaningful once holdings are known; never inferred from an error. */
  const insufficientBalance = computed<boolean>(() => {
    if (!activeAddress.value || amountBaseUnits.value === undefined) return false;
    const spendable = holdings.spendableOf(fromAsset.value.id);
    if (spendable === undefined) return false;
    return amountBaseUnits.value > spendable;
  });

  const samePair = computed(
    () => toAsset.value !== undefined && toAsset.value.id === fromAsset.value.id
  );

  const canQuote = computed<boolean>(
    () =>
      toAsset.value !== undefined &&
      !samePair.value &&
      amountBaseUnits.value !== undefined &&
      amountBaseUnits.value > 0n &&
      !quoting.value
  );

  const bestRouterId = computed(() => pickBestRouterId(results.value));
  const hasQuotes = computed(() => results.value.some((r) => r.status === "ok"));

  // Quote age ticks only while quotes exist, so an idle page does no work.
  const quoteAgeMs = ref(0);
  const quotesStale = computed(
    () => quotedAt.value !== null && quoteAgeMs.value > QUOTE_TTL_MS
  );
  let ageTimer: ReturnType<typeof setInterval> | undefined;
  watch(quotedAt, (value) => {
    if (ageTimer) clearInterval(ageTimer);
    ageTimer = undefined;
    quoteAgeMs.value = 0;
    if (value === null) return;
    ageTimer = setInterval(() => {
      quoteAgeMs.value = Date.now() - value;
    }, 1000);
  });

  const toAssetNeedsOptIn = computed<boolean>(
    () =>
      !!activeAddress.value &&
      toAsset.value !== undefined &&
      holdings.isOptedIn(toAsset.value.id) === false
  );

  /** App ids any successful quote requires that the account hasn't opted into. */
  const missingAppOptIns = computed<bigint[]>(() => {
    if (!holdings.loaded.value) return [];
    const ids = new Set<bigint>();
    for (const result of results.value) {
      for (const appId of result.quote?.requiredAppOptIns ?? []) {
        if (!holdings.optedInApps.value.has(appId)) ids.add(appId);
      }
    }
    return [...ids];
  });

  function resetResults(): void {
    abort?.abort();
    abort = undefined;
    results.value = createInitialResults(swapRouters, genesisId);
    quotedAt.value = null;
    quoteError.value = null;
    quoting.value = false;
  }

  // Any change to the inputs invalidates prepared transactions.
  watch(
    [
      () => fromAsset.value.id,
      () => toAsset.value?.id,
      amountBaseUnits,
      slippageBps,
      activeAddress,
    ],
    () => resetResults()
  );

  watch(slippageBps, (value) => {
    try {
      localStorage.setItem(SLIPPAGE_STORAGE_KEY, String(value));
    } catch {
      // ignore storage failures
    }
  });

  function setSlippagePercent(percent: string | number): void {
    slippageBps.value = percentToBps(percent);
  }

  function switchAssets(): void {
    if (!toAsset.value) return;
    const previousFrom = fromAsset.value;
    fromAsset.value = toAsset.value;
    toAsset.value = previousFrom;
  }

  function setMaxAmount(): void {
    const available = holdings.spendableOf(fromAsset.value.id);
    if (available === undefined) return;
    const decimals = fromAsset.value.decimals;
    const scale = 10n ** BigInt(decimals);
    const whole = available / scale;
    const fraction = (available % scale)
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "");
    amountInput.value = fraction ? `${whole}.${fraction}` : whole.toString();
  }

  async function getQuotes(): Promise<void> {
    if (!canQuote.value || !toAsset.value || amountBaseUnits.value === undefined) {
      return;
    }
    resetResults();
    const controller = new AbortController();
    abort = controller;
    quoting.value = true;
    lastExecution.value = null;
    const sender = activeAddress.value;
    // Without a connected wallet the routers still need some sender to build
    // transactions against; the referrer account stands in so prices can be
    // compared before connecting. Simulation is skipped in that case because
    // the placeholder's balances are meaningless.
    const request: SwapRequest = {
      sender: sender ?? swapReferrerAddress,
      fromAssetId: fromAsset.value.id,
      toAssetId: toAsset.value.id,
      amount: amountBaseUnits.value,
      slippageBps: slippageBps.value,
      genesisId,
    };
    try {
      await quoteAllRouters(
        swapRouters,
        request,
        { algod, getAuthHeader: (realm) => getAuthToken(realm), signal: controller.signal },
        {
          simulate: sender !== null,
          onUpdate: (result) => {
            results.value = results.value.map((r) =>
              r.router.id === result.router.id ? result : r
            );
          },
        }
      );
      if (!controller.signal.aborted) {
        quotedAt.value = Date.now();
        if (!hasQuotes.value) quoteError.value = t("swap.errors.noRoutes");
      }
    } finally {
      if (!controller.signal.aborted) quoting.value = false;
    }
  }

  async function execute(routerId: string): Promise<void> {
    const sender = activeAddress.value;
    const result = results.value.find((r) => r.router.id === routerId);
    if (!sender || !result?.quote || !toAsset.value) return;
    if (quotesStale.value) {
      showToast(t("swap.errors.staleQuote"), "error");
      return;
    }
    const quote = result.quote;
    const record = {
      routerId,
      fromAsset: fromAsset.value,
      toAsset: toAsset.value,
      amountIn: amountBaseUnits.value ?? 0n,
    };
    executingRouterId.value = routerId;
    try {
      const outcome = await executeSwapQuote(
        quote,
        sender,
        (txns, indexes) => signTransactions(txns, indexes),
        algod
      );
      lastExecution.value = { ...record, ...outcome };
      showToast(
        t("swap.toast.success", { router: result.router.displayName }),
        "success"
      );
      resetResults();
      amountInput.value = "";
      await holdings.refresh();
    } catch (error: unknown) {
      if (isUserRejection(error)) {
        showToast(t("swap.toast.cancelled"), "info");
      } else {
        const message =
          error instanceof SwapExecutionError
            ? t(`swap.errors.stage.${error.stage}`, { message: error.message })
            : errorMessage(error);
        showToast(message, "error", 6000);
        if (error instanceof SwapExecutionError && error.txIds.length > 0) {
          lastExecution.value = { ...record, txIds: error.txIds };
          await holdings.refresh();
        }
      }
    } finally {
      executingRouterId.value = null;
    }
  }

  async function runOptIn(
    build: (sender: string, params: algosdk.SuggestedParams) => algosdk.Transaction
  ): Promise<void> {
    const sender = activeAddress.value;
    if (!sender || optingIn.value) return;
    optingIn.value = true;
    try {
      const params = await algod.getTransactionParams().do();
      const txn = build(sender, params);
      const [signed] = await signTransactions([txn], [0]);
      if (!signed) throw new Error(t("swap.errors.notSigned"));
      const { txid } = await algod.sendRawTransaction(signed).do();
      await algosdk.waitForConfirmation(algod, txid, 10);
      showToast(t("swap.toast.optInDone"), "success");
      await holdings.refresh();
    } catch (error: unknown) {
      if (isUserRejection(error)) showToast(t("swap.toast.cancelled"), "info");
      else showToast(errorMessage(error), "error", 6000);
    } finally {
      optingIn.value = false;
    }
  }

  const optInToAsset = (assetId: bigint) =>
    runOptIn((sender, suggestedParams) =>
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender,
        receiver: sender,
        amount: 0,
        assetIndex: assetId,
        suggestedParams,
      })
    );

  const optInToApp = (appId: bigint) =>
    runOptIn((sender, suggestedParams) =>
      algosdk.makeApplicationOptInTxnFromObject({
        sender,
        appIndex: appId,
        suggestedParams,
      })
    );

  async function selectAssetById(side: "from" | "to", id: bigint): Promise<void> {
    try {
      const info = await loadSwapAssetInfo(id, algod);
      if (side === "from") fromAsset.value = info;
      else toAsset.value = info;
    } catch (error: unknown) {
      showToast(errorMessage(error), "error");
    }
  }

  // Initial pair: route params if given, otherwise native -> USD reference.
  void (async () => {
    const fromId = initialFrom?.value ?? 0n;
    const usd = BigInt(usdcAssetId);
    const toId = initialTo?.value ?? (fromId === usd ? 0n : usd);
    try {
      const [from, to] = await Promise.all([
        loadSwapAssetInfo(fromId, algod),
        loadSwapAssetInfo(toId, algod),
      ]);
      fromAsset.value = from;
      toAsset.value = to;
    } catch (error: unknown) {
      showToast(errorMessage(error), "error");
    }
  })();

  function dispose(): void {
    abort?.abort();
    if (ageTimer) clearInterval(ageTimer);
  }

  return {
    // wallet
    activeAddress,
    holdings,
    // inputs
    fromAsset,
    toAsset,
    amountInput,
    amountBaseUnits,
    slippageBps,
    setSlippagePercent,
    switchAssets,
    setMaxAmount,
    selectAssetById,
    // derived
    fromBalance,
    insufficientBalance,
    samePair,
    canQuote,
    toAssetNeedsOptIn,
    missingAppOptIns,
    // quotes
    results,
    quoting,
    quoteError,
    quotedAt,
    quoteAgeMs,
    quotesStale,
    hasQuotes,
    bestRouterId,
    getQuotes,
    // execution
    executingRouterId,
    optingIn,
    lastExecution,
    execute,
    optInToAsset,
    optInToApp,
    dispose,
  };
}
