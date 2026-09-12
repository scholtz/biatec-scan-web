import { describe, expect, it } from "vitest";
import {
  classifySearchQuery,
  isAddressLike,
  isNumericId,
  isTransactionIdLike,
} from "./searchQuery";

// Zero address: 32 zero bytes + valid checksum.
const ZERO_ADDRESS =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";
const TX_ID = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRST";

describe("isNumericId", () => {
  it("accepts small and large uint64 values", () => {
    expect(isNumericId("0")).toBe(true);
    expect(isNumericId("763274703")).toBe(true);
    expect(isNumericId(" 763274703 ")).toBe(true);
    expect(isNumericId("18446744073709551615")).toBe(true);
  });

  it("rejects values above uint64, signs, decimals and text", () => {
    expect(isNumericId("18446744073709551616")).toBe(false);
    expect(isNumericId("-1")).toBe(false);
    expect(isNumericId("1.5")).toBe(false);
    expect(isNumericId("")).toBe(false);
    expect(isNumericId("abc")).toBe(false);
  });
});

describe("isTransactionIdLike", () => {
  it("accepts exactly 52 base32 characters", () => {
    expect(TX_ID).toHaveLength(52);
    expect(isTransactionIdLike(TX_ID)).toBe(true);
  });

  it("rejects wrong lengths and non-base32 characters", () => {
    expect(isTransactionIdLike(TX_ID.slice(0, 51))).toBe(false);
    expect(isTransactionIdLike(TX_ID + "A")).toBe(false);
    expect(isTransactionIdLike(TX_ID.replace("A", "1"))).toBe(false);
    expect(isTransactionIdLike(TX_ID.toLowerCase())).toBe(false);
    expect(isTransactionIdLike(ZERO_ADDRESS)).toBe(false);
  });
});

describe("isAddressLike", () => {
  it("accepts a checksum-valid 58-char address", () => {
    expect(isAddressLike(ZERO_ADDRESS)).toBe(true);
  });

  it("rejects a 58-char string with a bad checksum", () => {
    expect(isAddressLike("A".repeat(58))).toBe(false);
  });

  it("rejects other lengths", () => {
    expect(isAddressLike(TX_ID)).toBe(false);
    expect(isAddressLike("")).toBe(false);
  });
});

describe("classifySearchQuery", () => {
  it("classifies each supported shape", () => {
    expect(classifySearchQuery("763274703")).toBe("numeric");
    expect(classifySearchQuery(ZERO_ADDRESS)).toBe("address");
    expect(classifySearchQuery(TX_ID)).toBe("transaction");
    expect(classifySearchQuery("usdc")).toBe("text");
    expect(classifySearchQuery("A".repeat(58))).toBe("text");
  });
});
