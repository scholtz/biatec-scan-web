/** Application details tabs; each key is also the route's `:tab` URL segment. */
export const TAB_KEYS = [
  "basic-info",
  "schema-and-state",
  "boxes",
  "approval-program",
  "clear-state-program",
] as const;

export type TabKey = (typeof TAB_KEYS)[number];
