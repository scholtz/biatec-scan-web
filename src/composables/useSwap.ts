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
import {
  executeSwapQuote,
  SwapExecutionError,
  type SwapExecutionResult,
} from "../swap/executeSwap";
import {
  createInitialResults,
  errorMessage,
  quoteAllRouters,
} from "../swap/quoteService";
import { swapRouters } from "../swap/routers";
import type {
  RouterQuoteResult,
  SwapRequest,
  SwapRouterContext,
} from "../swap/types";
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

export function useSwap(initialFrom?: Ref<bigint | undefined>, initialTo?: Ref<bigint | undefined>) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { activeAddress, signTransactions, isReady } = useWallet();
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
  let round = 0;

  const ctx: SwapRouterContext = {
    algod,
    getAuthHeader: () => getAuthToken(),
  };

  const amountBaseUnits = computed<bigint | undefined>(() =>
    parseAmountToBaseUnits(amountInput.value, fromAsset.value.decimals)
  );

  const fromBalance = computed<bigint | undefined>(() =>
    holdings.balanceOf(fromAsset.value.id)
  );

  const insufficientBalance = computed<boolean>(() => {
    if (!activeAddress.value || amountBaseUnits.value === undefined) return false;
    const available =
      fromAsset.value.id === 0n
        ? holdings.spendableNative.value
        : (fromBalance.value ?? 0n);
    return amountBaseUnits.value > available;
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

  const hasQuotes = computed(() =>
    results.value.some((r) => r.status === "ok")
  );

  const quoteAgeMs = ref(0);
  const quotesStale = computed(
    () => quotedAt.value !== null && quoteAgeMs.value > QUOTE_TTL_MS
  );
  const ageTimer = setInterval(() => {
    quoteAgeMs.value = quotedAt.value ? Date.now() - quotedAt.value : 0;
  }, 1000);

  const toAssetNeedsOptIn = computed<boolean>(
    () =>
      !!activeAddress.value &&
      toAsset.value !== undefined &&
      !holdings.loading.value &&
      !holdings.isOptedIn(toAsset.value.id)
  );

  /** App ids any successful quote requires that the account hasn't opted into. */
  const missingAppOptIns = computed<bigint[]>(() => {
    const ids = new Set<bigint>();
    for (const result of results.value) {
      for (const appId of result.quote?.requiredAppOptIns ?? []) {
        if (!holdings.holdings.value.optedInApps.has(appId)) ids.add(appId);
      }
    }
    return [...ids];
  });

  function resetResults(): void {
    round++;
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
    const available =
      fromAsset.value.id === 0n
        ? holdings.spendableNative.value
        : fromBalance.value;
    if (available === undefined) return;
    const decimals = fromAsset.value.decimals;
    const whole = available / 10n ** BigInt(decimals);
    const fraction = (available % 10n ** BigInt(decimals))
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "");
    amountInput.value = fraction ? `${whole}.${fraction}` : whole.toString();
  }

  async function getQuotes(): Promise<void> {
    if (!canQuote.value || !toAsset.value || amountBaseUnits.value === undefined) {
      return;
    }
    const thisRound = ++round;
    quoting.value = true;
    quoteError.value = null;
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
    results.value = createInitialResults(swapRouters, genesisId);
    const apply = (result: RouterQuoteResult) => {
      if (thisRound !== round) return;
      results.value = results.value.map((r) =>
        r.router.id === result.router.id ? result : r
      );
    };
    try {
      await quoteAllRouters(swapRouters, request, ctx, {
        simulate: sender !== null,
        onUpdate: apply,
        isCancelled: () => thisRound !== round,
      });
      if (thisRound === round) {
        quotedAt.value = Date.now();
        quoteAgeMs.value = 0;
        if (!results.value.some((r) => r.status === "ok")) {
          quoteError.value = t("swap.errors.noRoutes");
        }
      }
    } finally {
      if (thisRound === round) quoting.value = false;
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
      showToast(t("swap.toast.success", { router: result.router.displayName }), "success");
      resetResults();
      amountInput.value = "";
      await holdings.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof SwapExecutionError
          ? t(`swap.errors.stage.${error.stage}`, { message: error.message })
          : errorMessage(error);
      showToast(message, "error", 6000);
      if (error instanceof SwapExecutionError && error.txIds.length > 0) {
        lastExecution.value = { ...record, txIds: error.txIds };
      }
      await holdings.refresh();
    } finally {
      executingRouterId.value = null;
    }
  }

  async function sendSingle(
    build: (params: algosdk.SuggestedParams) => algosdk.Transaction
  ): Promise<string> {
    const params = await algod.getTransactionParams().do();
    const txn = build(params);
    const [signed] = await signTransactions([txn], [0]);
    if (!signed) throw new Error(t("swap.errors.notSigned"));
    const { txid } = await algod.sendRawTransaction(signed).do();
    await algosdk.waitForConfirmation(algod, txid, 10);
    return txid;
  }

  async function optInToAsset(assetId: bigint): Promise<void> {
    const sender = activeAddress.value;
    if (!sender || optingIn.value) return;
    optingIn.value = true;
    try {
      await sendSingle((suggestedParams) =>
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender,
          receiver: sender,
          amount: 0,
          assetIndex: assetId,
          suggestedParams,
        })
      );
      showToast(t("swap.toast.optInDone"), "success");
      await holdings.refresh();
    } catch (error: unknown) {
      showToast(errorMessage(error), "error", 6000);
    } finally {
      optingIn.value = false;
    }
  }

  async function optInToApp(appId: bigint): Promise<void> {
    const sender = activeAddress.value;
    if (!sender || optingIn.value) return;
    optingIn.value = true;
    try {
      await sendSingle((suggestedParams) =>
        algosdk.makeApplicationOptInTxnFromObject({
          sender,
          appIndex: appId,
          suggestedParams,
        })
      );
      showToast(t("swap.toast.optInDone"), "success");
      await holdings.refresh();
    } catch (error: unknown) {
      showToast(errorMessage(error), "error", 6000);
    } finally {
      optingIn.value = false;
    }
  }

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
    const from = initialFrom?.value;
    const to = initialTo?.value;
    if (from !== undefined) await selectAssetById("from", from);
    await selectAssetById("to", to ?? (from === BigInt(usdcAssetId) ? 0n : BigInt(usdcAssetId)));
  })();

  function dispose(): void {
    clearInterval(ageTimer);
    round++;
  }

  return {
    // wallet
    activeAddress,
    walletReady: isReady,
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
