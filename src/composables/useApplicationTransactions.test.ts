import { describe, expect, it, vi, type Mock } from "vitest";
import { ref } from "vue";
import {
  APPLICATION_TX_PAGE_SIZE as SIZE,
  useApplicationTransactions,
  type ApplicationTxSource,
  type TxBounds,
} from "./useApplicationTransactions";

const flush = () => new Promise((r) => setTimeout(r, 0));

// type alias (not interface) so it is assignable to FilterableTransaction's index signature
type FakeTx = { id: string; "confirmed-round": number };

/** Fake indexer: holds transactions by round, answers range queries oldest-first like the real one. */
const fakeChain = (
  rounds: number[],
  bounds: TxBounds,
): ApplicationTxSource & { fetchRange: Mock<ApplicationTxSource["fetchRange"]> } => {
  const all: FakeTx[] = [...rounds]
    .sort((a, b) => a - b)
    .map((r, i) => ({ id: `tx${i}`, "confirmed-round": r }));
  return {
    getBounds: vi.fn(async () => bounds),
    fetchRange: vi.fn<ApplicationTxSource["fetchRange"]>(async (_app, min, max, limit, exhaustive) => {
      const inRange = all.filter((t) => t["confirmed-round"] >= min && t["confirmed-round"] <= max);
      if (exhaustive) return { transactions: inRange, truncated: false };
      return { transactions: inRange.slice(0, limit), truncated: inRange.length > limit };
    }),
  };
};

const roundsOf = (t: { transactions: { value: Record<string, unknown>[] } }) =>
  t.transactions.value.map((x) => x["confirmed-round"] as number);

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("useApplicationTransactions", () => {
  it("lists newest first and pages through the whole history", async () => {
    const t = useApplicationTransactions(ref("1"), fakeChain(range(1, 60), { currentRound: 100, createdAtRound: 1 }));
    await flush();
    expect(roundsOf(t)).toEqual(range(36, 60).reverse());
    expect(t.canPrev.value).toBe(false);
    expect(t.canNext.value).toBe(true);

    await t.next();
    expect(t.page.value).toBe(2);
    expect(roundsOf(t)).toEqual(range(11, 35).reverse());

    await t.next();
    expect(t.page.value).toBe(3);
    expect(roundsOf(t)).toEqual(range(1, 10).reverse());
    expect(t.canNext.value).toBe(false);
  });

  it("crosses sparse history in several windows without losing or reordering anything", async () => {
    const sparse = range(1, 30).map((i) => i * 1000); // one tx every 1000 rounds
    const t = useApplicationTransactions(ref("1"), fakeChain(sparse, { currentRound: 31000, createdAtRound: 1 }));
    await flush();
    expect(roundsOf(t)).toEqual(sparse.slice(5).reverse()); // 25 newest
    await t.next();
    expect(roundsOf(t)).toEqual(sparse.slice(0, 5).reverse());
    expect(t.canNext.value).toBe(false);
  });

  it("recovers a window denser than the indexer row limit by shrinking it", async () => {
    // 1200 transactions packed into 10 rounds near the tip.
    const dense = range(0, 1199).map((i) => 9001 + Math.floor(i / 120));
    const t = useApplicationTransactions(ref("1"), fakeChain(dense, { currentRound: 10000, createdAtRound: 1 }));
    await flush();
    let total = t.transactions.value.length;
    const seen = new Set(t.transactions.value.map((x) => x.id));
    while (t.canNext.value) {
      await t.next();
      for (const x of t.transactions.value) seen.add(x.id);
      total += t.transactions.value.length;
    }
    expect(total).toBe(1200);
    expect(seen.size).toBe(1200);
  });

  it("takes a single round holding more rows than the indexer limit whole", async () => {
    const packed = range(0, 1499).map(() => 500); // 1500 transactions, all in round 500
    const t = useApplicationTransactions(ref("1"), fakeChain(packed, { currentRound: 501, createdAtRound: 1 }));
    await flush();
    let total = t.transactions.value.length;
    while (t.canNext.value) {
      await t.next();
      total += t.transactions.value.length;
    }
    expect(total).toBe(1500);
  });

  it("retrying a failed first load keeps filling the first page instead of skipping to page 2", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // 10 recent transactions, then plenty older: the first window cannot fill a page by itself.
    const history = [...range(9091, 9100), ...range(1, 40)];
    const chain = fakeChain(history, { currentRound: 9100, createdAtRound: 1 });
    const realFetch = chain.fetchRange.getMockImplementation()!;
    let calls = 0;
    chain.fetchRange.mockImplementation(async (...args) => {
      calls++;
      if (calls === 2) throw new Error("boom"); // fails while still filling page 1
      return realFetch(...args);
    });
    const t = useApplicationTransactions(ref("1"), chain);
    await flush();
    expect(t.error.value).toBe(true);
    expect(t.page.value).toBe(1);
    await t.retry();
    expect(t.error.value).toBe(false);
    expect(t.page.value).toBe(1); // still page 1, now complete
    expect(t.transactions.value).toHaveLength(SIZE);
  });

  it("stops at the application's creation round instead of scanning to round 0", async () => {
    const chain = fakeChain([], { currentRound: 65_000_000, createdAtRound: 64_999_000 });
    const t = useApplicationTransactions(ref("1"), chain);
    await flush();
    expect(t.transactions.value).toEqual([]);
    expect(t.canNext.value).toBe(false);
    expect(t.error.value).toBe(false);
    const mins = chain.fetchRange.mock.calls.map((c) => c[1] as number);
    expect(Math.min(...mins)).toBeGreaterThanOrEqual(64_999_000);
  });

  it("finishes scanning a long quiet history without hitting the request budget", async () => {
    const t = useApplicationTransactions(ref("1"), fakeChain([], { currentRound: 65_000_000, createdAtRound: 0 }));
    await flush();
    expect(t.error.value).toBe(false);
    expect(t.canNext.value).toBe(false);
  });

  it("going back is served from memory without refetching", async () => {
    const chain = fakeChain(range(1, 60), { currentRound: 100, createdAtRound: 1 });
    const t = useApplicationTransactions(ref("1"), chain);
    await flush();
    await t.next();
    const calls = chain.fetchRange.mock.calls.length;
    t.prev();
    expect(t.page.value).toBe(1);
    await t.next();
    expect(t.page.value).toBe(2);
    expect(chain.fetchRange.mock.calls.length).toBe(calls);
  });

  it("shows the whole history on one page when it is shorter than a page", async () => {
    const t = useApplicationTransactions(ref("1"), fakeChain([5, 6, 7], { currentRound: 10, createdAtRound: 1 }));
    await flush();
    expect(t.transactions.value).toHaveLength(3);
    expect(t.canNext.value).toBe(false);
    expect(t.canPrev.value).toBe(false);
  });

  it("an exactly full last page does not offer an empty next page", async () => {
    const t = useApplicationTransactions(ref("1"), fakeChain(range(1, SIZE), { currentRound: 10_000, createdAtRound: 1 }));
    await flush();
    expect(t.transactions.value).toHaveLength(SIZE);
    expect(t.canNext.value).toBe(false);
  });

  it("ignores a stale response after the application changes", async () => {
    let releaseSlow: () => void = () => {};
    const fast = fakeChain(range(1, 2), { currentRound: 10, createdAtRound: 1 });
    const source: ApplicationTxSource = {
      getBounds: (app) =>
        app === "slow"
          ? new Promise<TxBounds>((res) => (releaseSlow = () => res({ currentRound: 5, createdAtRound: 1 })))
          : fast.getBounds(app),
      fetchRange: (app, min, max, limit) => fast.fetchRange(app, min, max, limit),
    };
    const id = ref("slow");
    const t = useApplicationTransactions(id, source);
    id.value = "fast";
    await flush();
    releaseSlow();
    await flush();
    expect(roundsOf(t)).toEqual([2, 1]);
    expect(t.loading.value).toBe(false);
  });

  it("surfaces a failure mid-scan, keeps the current page, and retries from where it stopped", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // 30 recent transactions (first window) and 30 older ones (a later window).
    const history = [...range(7001, 7030), ...range(9071, 9100)];
    const chain = fakeChain(history, { currentRound: 9100, createdAtRound: 1 });
    const realFetch = chain.fetchRange.getMockImplementation()!;
    const t = useApplicationTransactions(ref("1"), chain);
    await flush();
    const firstPage = roundsOf(t);
    expect(firstPage).toEqual(range(9076, 9100).reverse());

    chain.fetchRange.mockImplementationOnce(() => Promise.reject(new Error("boom")));
    await t.next();
    expect(t.error.value).toBe(true);
    expect(t.page.value).toBe(1);
    expect(roundsOf(t)).toEqual(firstPage);

    chain.fetchRange.mockImplementation(realFetch);
    await t.retry();
    expect(t.error.value).toBe(false);
    expect(t.page.value).toBe(2);
    expect(roundsOf(t)).toEqual(
      [...range(9071, 9075).reverse(), ...range(7001, 7030).reverse()].slice(0, 25),
    );
  });

  it("retries a failed first load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const chain = fakeChain(range(1, 3), { currentRound: 10, createdAtRound: 1 });
    let fail = true;
    const source: ApplicationTxSource = {
      getBounds: (a) => (fail ? Promise.reject(new Error("boom")) : chain.getBounds(a)),
      fetchRange: (a, min, max, l) => chain.fetchRange(a, min, max, l),
    };
    const t = useApplicationTransactions(ref("1"), source);
    await flush();
    expect(t.error.value).toBe(true);
    fail = false;
    await t.retry();
    expect(t.error.value).toBe(false);
    expect(t.transactions.value).toHaveLength(3);
  });
});
