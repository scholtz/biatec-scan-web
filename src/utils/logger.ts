// Gated debug logging (AUDIT-2026-07-20-04 / -05). Off by default; enable with
// VITE_ENABLE_VERBOSE_LOGGING=true for local debugging of realtime feeds.
const verbose =
  (import.meta as unknown as { env?: Record<string, string> })?.env
    ?.VITE_ENABLE_VERBOSE_LOGGING === "true";

export function debugLog(...args: unknown[]): void {
  if (verbose) console.log(...args);
}
