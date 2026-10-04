import { ref, watch, type Ref } from "vue";
import { indexerUrl } from "../config/env";

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

interface IndexerTxResponse {
  "current-round"?: number;
  "next-token"?: string;
  transactions?: unknown[]; // only the length is read; the transaction shape is irrelevant here
}

export type FetchIndexerJson = (url: string) => Promise<IndexerTxResponse>;

const defaultFetchJson: FetchIndexerJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Indexer responded ${response.status}`);
  return response.json();
};

const txUrl = (appId: string, extra: Record<string, string>): string =>
  `${indexerUrl}/v2/transactions?${new URLSearchParams({ "application-id": appId, ...extra })}`;

async function countTransactions(
  fetchJson: FetchIndexerJson,
  appId: string,
  filter: Record<string, string>,
): Promise<TxCount> {
  const data = await fetchJson(txUrl(appId, { ...filter, limit: String(STATS_COUNT_CAP) }));
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
  fetchJson: FetchIndexerJson = defaultFetchJson,
  now: () => Date = () => new Date(),
) {
  const lastRounds = ref<TxCount | null>(null);
  const last24h = ref<TxCount | null>(null);
  const roundsFailed = ref(false);
  const hoursFailed = ref(false);
  // Bumped per load so a slow response for a previous app cannot land late.
  let generation = 0;

  async function load(): Promise<void> {
    const gen = ++generation;
    lastRounds.value = null;
    last24h.value = null;
    roundsFailed.value = false;
    hoursFailed.value = false;
    const id = appId.value;
    if (!id) return;

    const since = new Date(now().getTime() - 24 * 60 * 60 * 1000).toISOString();
    const hours = countTransactions(fetchJson, id, { "after-time": since }).then(
      (c) => {
        if (gen === generation) last24h.value = c;
      },
      (e: unknown) => {
        console.error("Error counting 24h application transactions:", e);
        if (gen === generation) hoursFailed.value = true;
      },
    );

    const rounds = (async () => {
      try {
        // The indexer reports its current round on any query; limit=1 keeps it tiny.
        const head = await fetchJson(txUrl(id, { limit: "1" }));
        const current = head["current-round"];
        if (typeof current !== "number") throw new Error("Indexer returned no current round");
        const counted = await countTransactions(fetchJson, id, {
          "min-round": String(Math.max(0, current - STATS_ROUND_WINDOW + 1)),
        });
        if (gen === generation) lastRounds.value = counted;
      } catch (e) {
        console.error("Error counting recent-round application transactions:", e);
        if (gen === generation) roundsFailed.value = true;
      }
    })();

    await Promise.all([hours, rounds]);
  }

  watch(appId, () => void load(), { immediate: true });

  return { lastRounds, last24h, roundsFailed, hoursFailed, reload: load };
}
