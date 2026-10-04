import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { IndexerTxResponse } from "../services/indexerClient";
import {
  STATS_COUNT_CAP,
  STATS_ROUND_WINDOW,
  useApplicationTxStats,
  type TxStatsSource,
} from "./useApplicationTxStats";

const flush = () => new Promise((r) => setTimeout(r, 0));
const NOW = new Date("2026-10-04T12:00:00.000Z");

const fakeSource = (opts: {
  round?: number;
  rounds?: number;
  hours?: number;
  roundsToken?: boolean;
}): TxStatsSource & { getTransactions: ReturnType<typeof vi.fn> } => ({
  getRound: vi.fn(async () => opts.round ?? 5000),
  getTransactions: vi.fn(async (url: string): Promise<IndexerTxResponse> => {
    const q = new URL(url).searchParams;
    if (q.has("min-round"))
      return {
        transactions: new Array(opts.rounds ?? 0).fill({}),
        "next-token": opts.roundsToken ? "t" : undefined,
      };
    if (q.has("after-time")) return { transactions: new Array(opts.hours ?? 0).fill({}) };
    throw new Error("unexpected " + url);
  }),
});

const queries = (s: { getTransactions: ReturnType<typeof vi.fn> }) =>
  s.getTransactions.mock.calls.map((c) => new URL(c[0] as string).searchParams);

describe("useApplicationTxStats", () => {
  it("counts transactions in the last 1000 rounds and last 24 hours", async () => {
    const source = fakeSource({ round: 5000, rounds: 12, hours: 345 });
    const s = useApplicationTxStats(ref("7"), ref(true), source, () => NOW);
    await flush();
    expect(s.lastRounds.value).toEqual({ count: 12, capped: false });
    expect(s.last24h.value).toEqual({ count: 345, capped: false });

    const qs = queries(source);
    // current 5000 -> window covers rounds 4001..5000 inclusive (1000 rounds)
    expect(qs.some((q) => q.get("min-round") === String(5000 - STATS_ROUND_WINDOW + 1))).toBe(true);
    expect(qs.some((q) => q.get("after-time") === "2026-10-03T12:00:00.000Z")).toBe(true);
    expect(qs.every((q) => q.get("application-id") === "7")).toBe(true);
  });

  it("does not fetch anything until enabled, then loads once", async () => {
    const source = fakeSource({ rounds: 1, hours: 2 });
    const enabled = ref(false);
    const s = useApplicationTxStats(ref("7"), enabled, source, () => NOW);
    await flush();
    expect(source.getTransactions).not.toHaveBeenCalled();
    expect(s.lastRounds.value).toBeNull();

    enabled.value = true;
    await flush();
    expect(s.lastRounds.value?.count).toBe(1);
    const calls = source.getTransactions.mock.calls.length;

    enabled.value = false;
    enabled.value = true; // tab revisited: no refetch for the same application
    await flush();
    expect(source.getTransactions.mock.calls.length).toBe(calls);
  });

  it("flags a lower bound when a full page has more behind it", async () => {
    const s = useApplicationTxStats(
      ref("7"),
      ref(true),
      fakeSource({ rounds: STATS_COUNT_CAP, roundsToken: true }),
      () => NOW,
    );
    await flush();
    expect(s.lastRounds.value).toEqual({ count: STATS_COUNT_CAP, capped: true });
  });

  it("a page that is exactly full with no next-token is an exact count", async () => {
    const s = useApplicationTxStats(
      ref("7"),
      ref(true),
      fakeSource({ rounds: STATS_COUNT_CAP }),
      () => NOW,
    );
    await flush();
    expect(s.lastRounds.value).toEqual({ count: STATS_COUNT_CAP, capped: false });
  });

  it("clamps the window start at round 0 on a young chain", async () => {
    const source = fakeSource({ round: 300 });
    useApplicationTxStats(ref("7"), ref(true), source, () => NOW);
    await flush();
    expect(queries(source).map((q) => q.get("min-round")).filter(Boolean)).toEqual(["0"]);
  });

  it("one failing statistic does not hide the other", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const base = fakeSource({ hours: 9 });
    const source: TxStatsSource = {
      getRound: base.getRound,
      getTransactions: (url) =>
        new URL(url).searchParams.has("min-round")
          ? Promise.reject(new Error("boom"))
          : base.getTransactions(url),
    };
    const s = useApplicationTxStats(ref("7"), ref(true), source, () => NOW);
    await flush();
    expect(s.roundsFailed.value).toBe(true);
    expect(s.lastRounds.value).toBeNull();
    expect(s.last24h.value).toEqual({ count: 9, capped: false });
    expect(s.hoursFailed.value).toBe(false);
  });

  it("fails the round statistic when the indexer round is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const source: TxStatsSource = {
      getRound: () => Promise.reject(new Error("no round")),
      getTransactions: async () => ({ transactions: [] }),
    };
    const s = useApplicationTxStats(ref("7"), ref(true), source, () => NOW);
    await flush();
    expect(s.roundsFailed.value).toBe(true);
    expect(s.last24h.value).toEqual({ count: 0, capped: false });
  });

  it("reloads for a new application and ignores stale results", async () => {
    let releaseSlow: () => void = () => {};
    const fast = fakeSource({ rounds: 2, hours: 3 });
    const source: TxStatsSource = {
      getRound: fast.getRound,
      getTransactions: (url) =>
        new URL(url).searchParams.get("application-id") === "slow"
          ? new Promise((res) => (releaseSlow = () => res({ transactions: new Array(9).fill({}) })))
          : fast.getTransactions(url),
    };
    const id = ref("slow");
    const s = useApplicationTxStats(id, ref(true), source, () => NOW);
    id.value = "fast";
    await flush();
    releaseSlow();
    await flush();
    expect(s.lastRounds.value?.count).toBe(2);
    expect(s.last24h.value?.count).toBe(3);
  });
});
