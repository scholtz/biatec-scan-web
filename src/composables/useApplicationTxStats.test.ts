import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  STATS_COUNT_CAP,
  STATS_ROUND_WINDOW,
  useApplicationTxStats,
  type FetchIndexerJson,
} from "./useApplicationTxStats";

const flush = () => new Promise((r) => setTimeout(r, 0));
const NOW = new Date("2026-10-04T12:00:00.000Z");

// Fake indexer keyed on the query: head (limit=1), min-round, after-time.
const fakeIndexer = (opts: {
  currentRound?: number;
  rounds?: number;
  hours?: number;
  roundsToken?: boolean;
}): FetchIndexerJson =>
  vi.fn(async (url: string) => {
    const q = new URL(url).searchParams;
    if (q.get("limit") === "1") return { "current-round": opts.currentRound ?? 5000, transactions: [{}] };
    if (q.has("min-round"))
      return {
        transactions: new Array(opts.rounds ?? 0).fill({}),
        "next-token": opts.roundsToken ? "t" : undefined,
      };
    if (q.has("after-time")) return { transactions: new Array(opts.hours ?? 0).fill({}) };
    throw new Error("unexpected " + url);
  });

describe("useApplicationTxStats", () => {
  it("counts transactions in the last 1000 rounds and last 24 hours", async () => {
    const fetchJson = fakeIndexer({ currentRound: 5000, rounds: 12, hours: 345 });
    const s = useApplicationTxStats(ref("7"), fetchJson, () => NOW);
    await flush();
    expect(s.lastRounds.value).toEqual({ count: 12, capped: false });
    expect(s.last24h.value).toEqual({ count: 345, capped: false });

    const urls = vi.mocked(fetchJson).mock.calls.map((c) => new URL(c[0]).searchParams);
    // current 5000 -> window covers rounds 4001..5000 inclusive (1000 rounds)
    expect(urls.some((q) => q.get("min-round") === String(5000 - STATS_ROUND_WINDOW + 1))).toBe(true);
    expect(urls.some((q) => q.get("after-time") === "2026-10-03T12:00:00.000Z")).toBe(true);
    expect(urls.every((q) => q.get("application-id") === "7")).toBe(true);
  });

  it("flags a lower bound when a full page has more behind it", async () => {
    const s = useApplicationTxStats(
      ref("7"),
      fakeIndexer({ rounds: STATS_COUNT_CAP, roundsToken: true }),
      () => NOW,
    );
    await flush();
    expect(s.lastRounds.value).toEqual({ count: STATS_COUNT_CAP, capped: true });
  });

  it("a page that is exactly full with no next-token is an exact count", async () => {
    const s = useApplicationTxStats(ref("7"), fakeIndexer({ rounds: STATS_COUNT_CAP }), () => NOW);
    await flush();
    expect(s.lastRounds.value).toEqual({ count: STATS_COUNT_CAP, capped: false });
  });

  it("clamps the window start at round 0 on a young chain", async () => {
    const fetchJson = fakeIndexer({ currentRound: 300 });
    useApplicationTxStats(ref("7"), fetchJson, () => NOW);
    await flush();
    const mins = vi.mocked(fetchJson).mock.calls
      .map((c) => new URL(c[0]).searchParams.get("min-round"))
      .filter(Boolean);
    expect(mins).toEqual(["0"]);
  });

  it("one failing statistic does not hide the other", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const base = fakeIndexer({ hours: 9 });
    const fetchJson: FetchIndexerJson = (url) =>
      new URL(url).searchParams.has("min-round") ? Promise.reject(new Error("boom")) : base(url);
    const s = useApplicationTxStats(ref("7"), fetchJson, () => NOW);
    await flush();
    expect(s.roundsFailed.value).toBe(true);
    expect(s.lastRounds.value).toBeNull();
    expect(s.last24h.value).toEqual({ count: 9, capped: false });
    expect(s.hoursFailed.value).toBe(false);
  });

  it("fails the round statistic when the indexer reports no current round", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const s = useApplicationTxStats(
      ref("7"),
      vi.fn(async () => ({ transactions: [] })),
      () => NOW,
    );
    await flush();
    expect(s.roundsFailed.value).toBe(true);
  });

  it("ignores stale results after the application changes", async () => {
    let releaseSlow: () => void = () => {};
    const fast = fakeIndexer({ rounds: 2, hours: 3 });
    const fetchJson: FetchIndexerJson = (url) =>
      new URL(url).searchParams.get("application-id") === "slow"
        ? new Promise((res) => (releaseSlow = () => res({ "current-round": 1, transactions: new Array(9).fill({}) })))
        : fast(url);
    const id = ref("slow");
    const s = useApplicationTxStats(id, fetchJson, () => NOW);
    id.value = "fast";
    await flush();
    releaseSlow();
    await flush();
    expect(s.lastRounds.value?.count).toBe(2);
    expect(s.last24h.value?.count).toBe(3);
  });
});
