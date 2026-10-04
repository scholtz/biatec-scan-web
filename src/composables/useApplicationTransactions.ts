import { computed, shallowRef, watch, type Ref } from "vue";
import { indexerUrl } from "../config/env";
import {
  applicationTxUrl,
  getIndexerJson,
  getIndexerRound,
  type IndexerTxResponse,
} from "../services/indexerClient";
import type { FilterableTransaction } from "../utils/txFilter";

export const APPLICATION_TX_PAGE_SIZE = 25;
/** Indexer hard cap per request. */
const RANGE_LIMIT = 1000;
const INITIAL_WINDOW_ROUNDS = 1000;
const MIN_WINDOW_ROUNDS = 1;
/** Max pages followed when even a single round overflows the row limit. */
const MAX_EXHAUSTIVE_PAGES = 20;
const MAX_WINDOW_ROUNDS = 8_000_000;
/** Max indexer requests spent looking for the next transaction in one "Next" click. */
const MAX_REQUESTS_PER_FILL = 25;

export interface TxBounds {
  /** Latest round the indexer has processed. */
  currentRound: number;
  /** Round the application was created in (0 when unknown). */
  createdAtRound: number;
}

export interface TxRangeResult {
  /** Transactions in the range, oldest first (indexer order). */
  transactions: FilterableTransaction[];
  /** True when the range holds more than `transactions` (the limit was hit). */
  truncated: boolean;
}

export interface ApplicationTxSource {
  getBounds(appId: string): Promise<TxBounds>;
  fetchRange(
    appId: string,
    minRound: number,
    maxRound: number,
    limit: number,
    /** Follow next-tokens to return the whole range (for windows that cannot shrink further). */
    exhaustive?: boolean,
  ): Promise<TxRangeResult>;
}

export const indexerTxSource: ApplicationTxSource = {
  async getBounds(appId) {
    const currentRound = await getIndexerRound();
    let createdAtRound = 0;
    try {
      const app = await getIndexerJson<{ application?: { "created-at-round"?: number } }>(
        `${indexerUrl}/v2/applications/${appId}?include-all=true`,
      );
      createdAtRound = app.application?.["created-at-round"] ?? 0;
    } catch {
      // Optional optimisation (lets the scan stop at creation); fall back to round 0.
    }
    return { currentRound, createdAtRound };
  },

  async fetchRange(appId, minRound, maxRound, limit, exhaustive = false) {
    const base = {
      "min-round": String(minRound),
      "max-round": String(maxRound),
      limit: String(limit),
    };
    const transactions: FilterableTransaction[] = [];
    let next: string | undefined;
    for (let page = 0; page < (exhaustive ? MAX_EXHAUSTIVE_PAGES : 1); page++) {
      const data = await getIndexerJson<IndexerTxResponse>(
        applicationTxUrl(appId, next ? { ...base, next } : base),
      );
      const rows = data.transactions ?? [];
      transactions.push(...rows);
      next = rows.length >= limit ? data["next-token"] : undefined;
      if (!next) return { transactions, truncated: false };
    }
    return { transactions, truncated: true };
  },
};

/**
 * Newest-first, server-driven paginated transaction list for an application.
 *
 * The indexer's /v2/transactions endpoint returns results oldest-first and has
 * no sort option, so a plain next-token walk would start at the application's
 * first transaction. Instead the history is scanned backwards from the chain
 * tip in round windows: each window is fetched completely (shrinking and
 * retrying if it overflows the 1000-row limit), reversed, and appended to an
 * in-memory newest-first list that the UI pages through. Windows grow when
 * they come back sparse, so quiet applications are crossed in a few requests,
 * and the scan stops at the application's creation round.
 */
export function useApplicationTransactions(
  appId: Ref<string>,
  source: ApplicationTxSource = indexerTxSource,
) {
  // shallowRef: only 25 rows are rendered, so skip deep-proxying every indexer transaction.
  const buffer = shallowRef<FilterableTransaction[]>([]);
  const pageIndex = shallowRef(0);
  const loading = shallowRef(false);
  const error = shallowRef(false);
  const exhausted = shallowRef(false);
  // Unscanned history is rounds [floorRound, nextHi]; the next window ends at nextHi.
  let nextHi = 0;
  let floorRound = 0;
  let windowRounds = INITIAL_WINDOW_ROUNDS;
  let initialised = false;
  // Bumped on reset so a slow response for a previous app cannot land late.
  let generation = 0;
  // What Retry should redo: keep filling the current page, or fetch the next one.
  let failedDuring: "load" | "next" = "load";

  const pageStart = computed(() => pageIndex.value * APPLICATION_TX_PAGE_SIZE);
  const transactions = computed(() =>
    buffer.value.slice(pageStart.value, pageStart.value + APPLICATION_TX_PAGE_SIZE),
  );
  const canPrev = computed(() => pageIndex.value > 0);
  const canNext = computed(
    () =>
      pageStart.value + APPLICATION_TX_PAGE_SIZE < buffer.value.length || !exhausted.value,
  );

  /** Scans windows until the buffer holds more than `target` transactions or history ends. */
  async function fill(target: number, gen: number): Promise<void> {
    let requests = 0;
    if (!initialised) {
      const bounds = await source.getBounds(appId.value);
      if (gen !== generation) return;
      nextHi = bounds.currentRound;
      floorRound = bounds.createdAtRound;
      initialised = true;
      requests++;
    }
    while (buffer.value.length <= target && !exhausted.value) {
      if (nextHi < floorRound) {
        exhausted.value = true;
        break;
      }
      if (requests >= MAX_REQUESTS_PER_FILL) {
        throw new Error("Scan budget exhausted; retry to continue");
      }
      const lo = Math.max(floorRound, nextHi - windowRounds + 1);
      // A one-round window cannot shrink further: take it whole instead of truncating.
      const result = await source.fetchRange(
        appId.value,
        lo,
        nextHi,
        RANGE_LIMIT,
        windowRounds <= MIN_WINDOW_ROUNDS,
      );
      requests++;
      if (gen !== generation) return;
      if (result.truncated && windowRounds > MIN_WINDOW_ROUNDS) {
        // Too dense to be complete in one request: retry the same top with a smaller window.
        windowRounds = Math.max(MIN_WINDOW_ROUNDS, Math.floor(windowRounds / 4));
        continue;
      }
      buffer.value = [...buffer.value, ...[...result.transactions].reverse()];
      nextHi = lo - 1;
      if (lo <= floorRound) exhausted.value = true;
      // Adapt the next window to the observed density.
      if (result.transactions.length < 100) {
        windowRounds = Math.min(MAX_WINDOW_ROUNDS, windowRounds * 4);
      } else if (result.transactions.length > 500) {
        windowRounds = Math.max(MIN_WINDOW_ROUNDS, Math.floor(windowRounds / 2));
      }
    }
  }

  async function run(target: number): Promise<boolean> {
    const gen = generation;
    loading.value = true;
    error.value = false;
    try {
      await fill(target, gen);
      return gen === generation;
    } catch (e) {
      if (gen !== generation) return false;
      console.error("Error loading application transactions:", e);
      error.value = true;
      return false;
    } finally {
      if (gen === generation) loading.value = false;
    }
  }

  async function next(): Promise<void> {
    if (loading.value || !canNext.value) return;
    failedDuring = "next";
    const newStart = pageStart.value + APPLICATION_TX_PAGE_SIZE;
    // Need the whole next page plus one more row to know whether another page follows.
    const ok = await run(newStart + APPLICATION_TX_PAGE_SIZE);
    if (ok && newStart < buffer.value.length) pageIndex.value++;
  }

  function prev(): void {
    if (pageIndex.value > 0) pageIndex.value--;
  }

  function resetState(): void {
    generation++;
    error.value = false;
    buffer.value = [];
    pageIndex.value = 0;
    exhausted.value = false;
    loading.value = false;
    initialised = false;
    nextHi = 0;
    floorRound = 0;
    windowRounds = INITIAL_WINDOW_ROUNDS;
  }

  /** Reloads from the newest transactions. */
  async function reload(): Promise<void> {
    resetState();
    failedDuring = "load";
    if (!appId.value) return;
    await run(APPLICATION_TX_PAGE_SIZE);
  }

  /** Retries whatever failed: finishing the first page, or the forward navigation. */
  async function retry(): Promise<void> {
    if (failedDuring === "next" && buffer.value.length > 0) await next();
    else if (!initialised && buffer.value.length === 0) await reload();
    else await run(APPLICATION_TX_PAGE_SIZE);
  }

  watch(appId, () => void reload(), { immediate: true });

  return {
    transactions,
    page: computed(() => pageIndex.value + 1),
    loading,
    error,
    canPrev,
    canNext,
    next,
    prev,
    reload,
    retry,
  };
}
