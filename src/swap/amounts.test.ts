import { describe, expect, it } from "vitest";
import {
  applySlippage,
  computeUnitPrice,
  formatBaseUnits,
  parseAmountToBaseUnits,
  percentToBps,
} from "./amounts";

describe("parseAmountToBaseUnits", () => {
  it("parses whole and fractional amounts without float rounding", () => {
    expect(parseAmountToBaseUnits("1", 6)).toBe(1_000_000n);
    expect(parseAmountToBaseUnits("0.1", 6)).toBe(100_000n);
    expect(parseAmountToBaseUnits("0.3", 6)).toBe(300_000n);
    expect(parseAmountToBaseUnits("123.456789", 6)).toBe(123_456_789n);
    expect(parseAmountToBaseUnits("1000000000.000001", 6)).toBe(
      1_000_000_000_000_001n
    );
  });

  it("accepts a comma decimal separator and leading dot", () => {
    expect(parseAmountToBaseUnits("0,5", 6)).toBe(500_000n);
    expect(parseAmountToBaseUnits(".5", 2)).toBe(50n);
  });

  it("rejects empty, invalid and over-precise input", () => {
    expect(parseAmountToBaseUnits("", 6)).toBeUndefined();
    expect(parseAmountToBaseUnits("abc", 6)).toBeUndefined();
    expect(parseAmountToBaseUnits("1.2.3", 6)).toBeUndefined();
    expect(parseAmountToBaseUnits("0.1234567", 6)).toBeUndefined();
    expect(parseAmountToBaseUnits("-1", 6)).toBeUndefined();
  });

  it("handles zero-decimal assets", () => {
    expect(parseAmountToBaseUnits("42", 0)).toBe(42n);
    expect(parseAmountToBaseUnits("42.0", 0)).toBeUndefined();
  });
});

describe("formatBaseUnits", () => {
  it("formats with grouping and trims trailing zeros", () => {
    expect(formatBaseUnits(1_234_567_890n, 6)).toBe("1 234.56789");
    expect(formatBaseUnits(1_000_000n, 6)).toBe("1");
    expect(formatBaseUnits(0n, 6)).toBe("0");
    expect(formatBaseUnits(5n, 6)).toBe("0.000005");
  });

  it("limits fraction digits when asked", () => {
    expect(formatBaseUnits(1_234_567n, 6, 2)).toBe("1.23");
  });

  it("formats negative amounts", () => {
    expect(formatBaseUnits(-1_500_000n, 6)).toBe("-1.5");
  });
});

describe("applySlippage", () => {
  it("reduces the output by the tolerance in basis points", () => {
    expect(applySlippage(1_000_000n, 100)).toBe(990_000n);
    expect(applySlippage(1_000_000n, 50)).toBe(995_000n);
    expect(applySlippage(1_000_000n, 0)).toBe(1_000_000n);
  });

  it("treats 100% as no protection", () => {
    expect(applySlippage(1_000_000n, 10000)).toBe(0n);
    expect(applySlippage(1_000_000n, 20000)).toBe(0n);
  });
});

describe("percentToBps", () => {
  it("converts and clamps", () => {
    expect(percentToBps("1")).toBe(100);
    expect(percentToBps(0.5)).toBe(50);
    expect(percentToBps("abc")).toBe(0);
    expect(percentToBps(250)).toBe(10000);
    expect(percentToBps(-3)).toBe(0);
  });
});

describe("computeUnitPrice", () => {
  it("expresses one input unit in output units", () => {
    // 2 ALGO (6 dp) -> 0.5 USDC (6 dp) => 0.25 USDC per ALGO
    expect(computeUnitPrice(2_000_000n, 6, 500_000n, 6)).toBe(0.25);
    // 1 asset with 2 dp -> 300 units of 0 dp asset
    expect(computeUnitPrice(100n, 2, 300n, 0)).toBe(300);
  });

  it("returns undefined for a zero input", () => {
    expect(computeUnitPrice(0n, 6, 1n, 6)).toBeUndefined();
  });
});
