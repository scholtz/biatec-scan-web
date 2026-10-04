import { ref, watch, type Ref } from "vue";
import {
  applicationTxUrl,
  getIndexerJson,
  getIndexerRound,
  type IndexerTxResponse,
} from "../services/indexerClient";

/** Window for the "recent rounds" statistic. */
export const STATS_ROUND_WINDOW = 1000;
/**
 * Counting needs the transactions themselves (the indexer has no count
 * endpoint) and a full page of 1000 is already about a megabyte, so counts
 * stop at one page and are reported as "at least" when the page is full.
 */
export const STATS_COUNT_CAP = 1000;

export interface TxCount {
  count: number;
  /** True when more transactions exist than were counted (count is a lower bound). */
  capped: boolean;
}

/** Injectable for tests; defaults to the real indexer. */
export interface TxStatsSource {
  getRound(): Promise<number>;
  getTransactions(url: string): Promise<IndexerTxResponse>;
}

const indexerStatsSource: TxStatsSource = {
  getRound: getIndexerRound,
  getTransactions: (url) => getIndexerJson<IndexerTxResponse>(url),
};

async function countTransactions(
  source: TxStatsSource,
  appId: string,
  filter: Record<string, string>,
): Promise<TxCount> {
  const data = await source.getTransactions(
    applicationTxUrl(appId, { ...filter, limit: String(STATS_COUNT_CAP) }),
  );
  const count = data.transactions?.length ?? 0;
  return { count, capped: count >= STATS_COUNT_CAP && !!data["next-token"] };
}

/**
 * Activity statistics for an application: transactions in the last
 * STATS_ROUND_WINDOW rounds and in the last 24 hours (indexer, root
 * transactions that call the application, including via inner transactions).
 * The two counts load independently so one failing does not hide the other.
 */
export function useApplicationTxStats(
  appId: Ref<string>,
  /** The counts download up to ~1 MB each, so callers only enable them while the stats are on screen. */
  enabled: Ref<boolean>,
  source: TxStatsSource = indexerStatsSource,
  now: () => Date = () => new Date(),
) {
  const lastRounds = ref<TxCount | null>(null);
  const last24h = ref<TxCount | null>(null);
  const roundsFailed = ref(false);
  const hoursFailed = ref(false);
  // Bumped per load so a slow response for a previous app cannot land late.
  let generation = 0;
  let loadedFor = "";

  async function loadHours(id: string, gen: number): Promise<void> {
    try {
      const since = new Date(now().getTime() - 24 * 60 * 60 * 1000).toISOString();
      const counted = await countTransactions(source, id, { "after-time": since });
      if (gen === generation) last24h.value = counted;
    } catch (e) {
      console.error("Error counting 24h application transactions:", e);
      if (gen === generation) hoursFailed.value = true;
    }
  }

  async function loadRounds(id: string, gen: number): Promise<void> {
    try {
      const current = await source.getRound();
      const counted = await countTransactions(source, id, {
        "min-round": String(Math.max(0, current - STATS_ROUND_WINDOW + 1)),
      });
      if (gen === generation) lastRounds.value = counted;
    } catch (e) {
      console.error("Error counting recent-round application transactions:", e);
      if (gen === generation) roundsFailed.value = true;
    }
  }

  async function load(): Promise<void> {
    const gen = ++generation;
    lastRounds.value = null;
    last24h.value = null;
    roundsFailed.value = false;
    hoursFailed.value = false;
    const id = appId.value;
    loadedFor = id;
    if (!id) return;
    await Promise.all([loadHours(id, gen), loadRounds(id, gen)]);
  }

  // (Re)load when enabled and not yet loaded for this application.
  watch(
    [appId, enabled],
    () => {
      if (!appId.value) {
        generation++;
        loadedFor = "";
        lastRounds.value = null;
        last24h.value = null;
        return;
      }
      if (enabled.value && loadedFor !== appId.value) void load();
    },
    { immediate: true },
  );

  return { lastRounds, last24h, roundsFailed, hoursFailed, reload: load };
}
