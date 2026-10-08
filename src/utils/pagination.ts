/** Page sizes offered by paginated lists (same set as the Assets page). */
export const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** Shape of a vue-router query value (`?a=1&a=2` yields an array). */
export type QueryValue = string | null | undefined | Array<string | null>;

function firstValue(raw: QueryValue): string | null | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Strict positive integer parse: "3" -> 3, but "3abc", "0", "-1", "1.5" and "" -> null. */
function parsePositiveInt(raw: QueryValue): number | null {
  const value = firstValue(raw);
  if (value === null || value === undefined || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

/** Page number from a URL query value; anything malformed means page 1. */
export function parsePage(raw: QueryValue): number {
  return parsePositiveInt(raw) ?? 1;
}

/** Page size from a URL query value; only the offered sizes are accepted. */
export function parsePageSize(raw: QueryValue, fallback: number = DEFAULT_PAGE_SIZE): number {
  const n = parsePositiveInt(raw);
  return n !== null && (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : fallback;
}

/** Number of pages needed for `count` items; an empty list still has one (empty) page. */
export function pageCount(count: number, pageSize: number): number {
  if (count <= 0 || pageSize <= 0) return 1;
  return Math.ceil(count / pageSize);
}

/** Keeps `page` within [1, pageCount] (e.g. after the list shrank or a stale URL). */
export function clampPage(page: number, count: number, pageSize: number): number {
  return Math.min(Math.max(1, Math.floor(page) || 1), pageCount(count, pageSize));
}

/** Items on the (1-based) page; the page is clamped, so this never returns a stale empty page. */
export function pageSlice<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const p = clampPage(page, items.length, pageSize);
  const start = (p - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** 1-based inclusive range of item positions shown on the page ({0,0} for an empty list). */
export function pageRange(
  page: number,
  count: number,
  pageSize: number,
): { from: number; to: number } {
  if (count <= 0) return { from: 0, to: 0 };
  const p = clampPage(page, count, pageSize);
  return { from: (p - 1) * pageSize + 1, to: Math.min(p * pageSize, count) };
}

export interface FitRowsInput {
  /** window.innerHeight. */
  viewportHeight: number;
  /** Top of the row list in document coordinates (getBoundingClientRect().top + scrollY). */
  tableTop: number;
  /** Distance between two consecutive row tops (row height + gap). */
  rowHeight: number;
  /** Space needed below the rows (pagination bar and its margin). */
  footerHeight: number;
  /** Slack so sub-pixel rounding can never tip the page into scrolling. */
  safetyMargin?: number;
  min?: number;
  max?: number;
}

/**
 * How many rows fit between the top of the row list and the bottom of the
 * viewport (leaving room for the footer) without the page needing to scroll.
 * Returns null when the inputs cannot be measured yet (no/zero row height).
 */
export function fitRowCount({
  viewportHeight,
  tableTop,
  rowHeight,
  footerHeight,
  safetyMargin = 4,
  min = 5,
  max = 150,
}: FitRowsInput): number | null {
  if (!(rowHeight > 0) || !Number.isFinite(viewportHeight) || !Number.isFinite(tableTop)) return null;
  const available = viewportHeight - tableTop - Math.max(0, footerHeight) - safetyMargin;
  return Math.max(min, Math.min(max, Math.floor(available / rowHeight)));
}
