// Gated debug logging (AUDIT-2026-07-20-04 / -05). Off by default; enable with
// VITE_ENABLE_VERBOSE_LOGGING=true for local debugging of realtime feeds.
const verbose = import.meta.env.VITE_ENABLE_VERBOSE_LOGGING === "true";

// `unknown[]` is required here: this forwards arbitrary console.log args
// (strings, objects, errors, ...) with no fixed shape to constrain them to.
export function debugLog(...args: unknown[]): void {
  if (verbose) console.log(...args);
}
