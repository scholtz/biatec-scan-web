import { describe, expect, it } from "vitest";
import { SwapRouterError } from "../errors";
import {
  assertPositiveOutput,
  decodeUnsignedTransactions,
  fractionToPercent,
  throwIfAborted,
  toBigInt,
  toSafeNumber,
} from "./shared";

describe("router shared helpers", () => {
  it("refuses amounts that a JS number cannot represent exactly", () => {
    expect(toSafeNumber(9_007_199_254_740_991n)).toBe(9_007_199_254_740_991);
    expect(() => toSafeNumber(9_007_199_254_740_992n)).toThrow(SwapRouterError);
    expect(() => toSafeNumber(-1n)).toThrow(SwapRouterError);
  });

  it("converts router numbers defensively", () => {
    expect(toBigInt(12.6)).toBe(13n);
    expect(toBigInt(undefined)).toBeUndefined();
    expect(toBigInt(Number.NaN)).toBeUndefined();
    expect(fractionToPercent(0.0125)).toBeCloseTo(1.25);
    expect(fractionToPercent(null)).toBeUndefined();
  });

  it("rejects empty transaction lists and zero outputs with coded errors", () => {
    expect(() => decodeUnsignedTransactions([])).toThrow(
      expect.objectContaining({ code: "noTransactions" })
    );
    expect(() => assertPositiveOutput(0n)).toThrow(
      expect.objectContaining({ code: "emptyQuote" })
    );
    expect(() => assertPositiveOutput(1n)).not.toThrow();
  });

  it("stops a superseded round", () => {
    const controller = new AbortController();
    expect(() => throwIfAborted(controller.signal)).not.toThrow();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(
      expect.objectContaining({ code: "cancelled" })
    );
    expect(() => throwIfAborted(undefined)).not.toThrow();
  });
});
