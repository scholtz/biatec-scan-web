import { describe, expect, it } from "vitest";
import {
  effectiveOutputAmount,
  percentBelowBest,
  pickBestRouterId,
} from "./bestQuote";
import type {
  RouterQuoteResult,
  SwapQuote,
  SwapRouter,
  SwapSimulationResult,
} from "./types";

function router(id: string): SwapRouter {
  return {
    id,
    displayName: id,
    supportsNetwork: () => true,
    quote: () => Promise.reject(new Error("not used")),
  };
}

function quote(outputAmount: bigint): SwapQuote {
  return {
    routerId: "x",
    outputAmount,
    minimumReceived: outputAmount,
    route: { paths: [] },
    requiredAppOptIns: [],
    groups: [],
    createdAt: 0,
  };
}

function ok(
  id: string,
  outputAmount: bigint,
  simulation?: SwapSimulationResult
): RouterQuoteResult {
  return { router: router(id), status: "ok", quote: quote(outputAmount), simulation };
}

describe("effectiveOutputAmount", () => {
  it("uses the advertised quote when there is no simulation", () => {
    expect(effectiveOutputAmount(ok("a", 100n))).toBe(100n);
  });

  it("prefers the simulated net amount", () => {
    expect(
      effectiveOutputAmount(ok("a", 100n, { success: true, netReceived: 97n }))
    ).toBe(97n);
  });

  it("disqualifies routes whose simulation failed", () => {
    expect(
      effectiveOutputAmount(ok("a", 100n, { success: false, failureMessage: "x" }))
    ).toBeUndefined();
  });

  it("returns undefined for non-ok results", () => {
    expect(
      effectiveOutputAmount({ router: router("a"), status: "error", error: "e" })
    ).toBeUndefined();
    expect(
      effectiveOutputAmount({ router: router("a"), status: "loading" })
    ).toBeUndefined();
  });
});

describe("pickBestRouterId", () => {
  it("picks the highest effective amount across all routers", () => {
    const results = [ok("a", 100n), ok("b", 300n), ok("c", 200n)];
    expect(pickBestRouterId(results)).toBe("b");
  });

  it("is not fooled by order (a later larger quote still wins)", () => {
    const results = [ok("a", 100n), ok("b", 50n), ok("c", 101n)];
    expect(pickBestRouterId(results)).toBe("c");
  });

  it("lets a simulated amount beat a higher advertised one", () => {
    const results = [
      ok("a", 120n, { success: true, netReceived: 90n }),
      ok("b", 100n, { success: true, netReceived: 100n }),
    ];
    expect(pickBestRouterId(results)).toBe("b");
  });

  it("ignores failed simulations, errors and zero outputs", () => {
    const results: RouterQuoteResult[] = [
      ok("a", 500n, { success: false }),
      { router: router("b"), status: "error", error: "boom" },
      ok("c", 0n),
      ok("d", 1n),
    ];
    expect(pickBestRouterId(results)).toBe("d");
  });

  it("returns undefined when nothing is usable", () => {
    expect(pickBestRouterId([])).toBeUndefined();
    expect(
      pickBestRouterId([{ router: router("a"), status: "unsupported" }])
    ).toBeUndefined();
  });
});

describe("percentBelowBest", () => {
  it("reports how far a route trails the best one", () => {
    const results = [ok("a", 1_000_000n), ok("b", 990_000n)];
    expect(percentBelowBest(results[1], results)).toBeCloseTo(1, 6);
    expect(percentBelowBest(results[0], results)).toBe(0);
  });

  it("is undefined without a comparable amount", () => {
    const results = [ok("a", 100n), { router: router("b"), status: "error" as const }];
    expect(percentBelowBest(results[1], results)).toBeUndefined();
  });
});
