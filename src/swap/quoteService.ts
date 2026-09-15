// src/swap/quoteService.ts - Fans a swap request out to every registered
// router in parallel, optionally simulates each prepared route against algod,
// and reports per-router progress so the UI can render results as they land.
import { simulateQuote } from "./simulate";
import type {
  RouterQuoteResult,
  SwapRequest,
  SwapRouter,
  SwapRouterContext,
} from "./types";

export interface QuoteAllOptions {
  /** Dry-run each prepared route against algod (needs a real, funded sender). */
  simulate: boolean;
  /** Invoked every time a router's result changes. */
  onUpdate?: (result: RouterQuoteResult) => void;
}

/** Initial (idle / unsupported) result rows for the given network. */
export function createInitialResults(
  routers: readonly SwapRouter[],
  genesisId: string
): RouterQuoteResult[] {
  return routers.map((router) => ({
    router,
    status: router.supportsNetwork(genesisId) ? "idle" : "unsupported",
  }));
}

async function quoteOne(
  router: SwapRouter,
  request: SwapRequest,
  ctx: SwapRouterContext,
  options: QuoteAllOptions
): Promise<RouterQuoteResult> {
  const emit = (result: RouterQuoteResult) => {
    if (!ctx.signal?.aborted) options.onUpdate?.(result);
    return result;
  };
  if (!router.supportsNetwork(request.genesisId)) {
    return emit({ router, status: "unsupported" });
  }
  emit({ router, status: "loading" });
  let result: RouterQuoteResult;
  try {
    const quote = await router.quote(request, ctx);
    result = { router, status: "ok", quote };
  } catch (error: unknown) {
    return emit({ router, status: "error", error });
  }
  if (options.simulate && !ctx.signal?.aborted) {
    emit(result);
    try {
      result = {
        ...result,
        simulation: await simulateQuote(
          ctx.algod,
          result.quote!,
          request.sender,
          request.fromAssetId,
          request.toAssetId
        ),
      };
    } catch (error: unknown) {
      result = {
        ...result,
        simulation: {
          success: false,
          failureMessage: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
  return emit(result);
}

/** Quote every router concurrently; never rejects - failures are per-router. */
export async function quoteAllRouters(
  routers: readonly SwapRouter[],
  request: SwapRequest,
  ctx: SwapRouterContext,
  options: QuoteAllOptions
): Promise<RouterQuoteResult[]> {
  return Promise.all(
    routers.map((router) => quoteOne(router, request, ctx, options))
  );
}
