import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  clampPage,
  fitRowCount,
  pageCount,
  pageRange,
  pageSlice,
  parsePage,
  parsePageSize,
} from "./pagination";

const items = Array.from({ length: 53 }, (_, i) => i + 1);

describe("parsePage", () => {
  it("parses valid positive integers", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("7")).toBe(7);
  });

  it.each([undefined, null, "", "0", "-2", "1.5", "abc", "3abc", " 3", "1e2", "99999999999999999999"])(
    "falls back to page 1 for %j",
    (raw) => {
      expect(parsePage(raw)).toBe(1);
    },
  );

  it("uses the first value of a repeated query param", () => {
    expect(parsePage(["4", "9"])).toBe(4);
    expect(parsePage([])).toBe(1);
    expect(parsePage([null])).toBe(1);
  });
});

describe("parsePageSize", () => {
  it.each(PAGE_SIZE_OPTIONS)("accepts the offered size %i", (size) => {
    expect(parsePageSize(String(size))).toBe(size);
  });

  it.each([undefined, null, "", "0", "10", "1000", "abc", "-25"])(
    "falls back to the default for unsupported %j",
    (raw) => {
      expect(parsePageSize(raw)).toBe(DEFAULT_PAGE_SIZE);
    },
  );

  it("honours a custom fallback", () => {
    expect(parsePageSize("nope", 50)).toBe(50);
  });
});

describe("pageCount", () => {
  it("rounds up", () => {
    expect(pageCount(53, 25)).toBe(3);
    expect(pageCount(50, 25)).toBe(2);
    expect(pageCount(1, 25)).toBe(1);
  });

  it("is 1 for an empty list or invalid size", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(10, 0)).toBe(1);
  });
});

describe("clampPage", () => {
  it("keeps in-range pages", () => {
    expect(clampPage(2, 53, 25)).toBe(2);
  });

  it("clamps too-high and too-low pages", () => {
    expect(clampPage(99, 53, 25)).toBe(3);
    expect(clampPage(0, 53, 25)).toBe(1);
    expect(clampPage(-4, 53, 25)).toBe(1);
    expect(clampPage(Number.NaN, 53, 25)).toBe(1);
  });

  it("is page 1 for an empty list", () => {
    expect(clampPage(5, 0, 25)).toBe(1);
  });
});

describe("pageSlice", () => {
  it("returns the first page", () => {
    expect(pageSlice(items, 1, 25)).toEqual(items.slice(0, 25));
  });

  it("returns a short last page", () => {
    expect(pageSlice(items, 3, 25)).toEqual([51, 52, 53]);
  });

  it("clamps an out-of-range page to the last page instead of returning empty", () => {
    expect(pageSlice(items, 99, 25)).toEqual([51, 52, 53]);
  });

  it("pages are disjoint and cover every item exactly once", () => {
    const all = [1, 2, 3].flatMap((p) => pageSlice(items, p, 25));
    expect(all).toEqual(items);
  });

  it("handles an empty list and does not mutate the input", () => {
    expect(pageSlice([], 1, 25)).toEqual([]);
    const copy = [...items];
    pageSlice(items, 2, 15);
    expect(items).toEqual(copy);
  });
});

describe("pageRange", () => {
  it("gives inclusive 1-based bounds", () => {
    expect(pageRange(1, 53, 25)).toEqual({ from: 1, to: 25 });
    expect(pageRange(2, 53, 25)).toEqual({ from: 26, to: 50 });
    expect(pageRange(3, 53, 25)).toEqual({ from: 51, to: 53 });
  });

  it("clamps the page and handles an empty list", () => {
    expect(pageRange(99, 53, 25)).toEqual({ from: 51, to: 53 });
    expect(pageRange(1, 0, 25)).toEqual({ from: 0, to: 0 });
  });
});

describe("fitRowCount", () => {
  const base = { viewportHeight: 800, tableTop: 200, rowHeight: 40, footerHeight: 60 };

  it("fits as many whole rows as the remaining height allows", () => {
    // 800 - 200 - 60 - 4 = 536 -> 13.4 rows
    expect(fitRowCount(base)).toBe(13);
  });

  it("never lets the rows overflow the viewport", () => {
    const n = fitRowCount(base)!;
    expect(200 + n * 40 + 60).toBeLessThanOrEqual(800);
  });

  it("grows with the viewport and shrinks with taller rows", () => {
    expect(fitRowCount({ ...base, viewportHeight: 1200 })!).toBeGreaterThan(fitRowCount(base)!);
    expect(fitRowCount({ ...base, rowHeight: 80 })!).toBeLessThan(fitRowCount(base)!);
  });

  it("clamps to [min, max]", () => {
    expect(fitRowCount({ ...base, viewportHeight: 250 })).toBe(5);
    expect(fitRowCount({ ...base, viewportHeight: 100000 })).toBe(150);
    expect(fitRowCount({ ...base, viewportHeight: 250, min: 1 })).toBe(1);
  });

  it("returns null when nothing is measurable yet", () => {
    expect(fitRowCount({ ...base, rowHeight: 0 })).toBeNull();
    expect(fitRowCount({ ...base, rowHeight: -3 })).toBeNull();
    expect(fitRowCount({ ...base, rowHeight: Number.NaN })).toBeNull();
    expect(fitRowCount({ ...base, viewportHeight: Number.NaN })).toBeNull();
  });
});
