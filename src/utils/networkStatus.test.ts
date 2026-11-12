import { describe, it, expect } from "vitest";
import { computeNetworkStatus, isRoundAdvance } from "./networkStatus";

const NOW = 1_000_000_000;

describe("computeNetworkStatus", () => {
  it("is offline without any block", () => {
    expect(computeNetworkStatus(null, null, NOW)).toBe("offline");
  });
  it("is offline for an invalid timestamp", () => {
    expect(computeNetworkStatus(NaN, NOW, NOW)).toBe("offline");
  });
  it("is online when the latest block is fresh", () => {
    expect(computeNetworkStatus(NOW - 5_000, null, NOW)).toBe("online");
  });
  it("treats a block exactly 60s old as no longer online", () => {
    expect(computeNetworkStatus(NOW - 59_999, null, NOW)).toBe("online");
    expect(computeNetworkStatus(NOW - 60_000, null, NOW)).toBe("offline");
  });
  it("is offline when block is old and round has not advanced recently", () => {
    expect(computeNetworkStatus(NOW - 600_000, null, NOW)).toBe("offline");
    expect(computeNetworkStatus(NOW - 600_000, NOW - 120_000, NOW)).toBe(
      "offline"
    );
  });
  it("is syncing when block is old but round advanced in the past minute", () => {
    expect(computeNetworkStatus(NOW - 600_000, NOW - 10_000, NOW)).toBe(
      "syncing"
    );
  });
  it("falls back to offline once the advance is a minute old", () => {
    expect(computeNetworkStatus(NOW - 600_000, NOW - 60_000, NOW)).toBe(
      "offline"
    );
  });
});

describe("isRoundAdvance", () => {
  it("counts the first received block", () => {
    expect(isRoundAdvance(null, 10)).toBe(true);
  });
  it("counts a higher round", () => {
    expect(isRoundAdvance(10, 11)).toBe(true);
  });
  it("ignores duplicate and older rounds", () => {
    expect(isRoundAdvance(10, 10)).toBe(false);
    expect(isRoundAdvance(10, 9)).toBe(false);
  });
});
