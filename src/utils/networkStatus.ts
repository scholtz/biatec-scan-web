export type NetworkStatusKind = "online" | "syncing" | "offline";

/** A latest block younger than this means the network is live. */
export const ONLINE_MAX_BLOCK_AGE_MS = 60_000;
/** A round advance observed within this window means blocks are being synced. */
export const SYNCING_MAX_ADVANCE_AGE_MS = 60_000;

/**
 * Classify the indexer/network state shown on the dashboard.
 *
 * - online:  latest block is fresh (< 60s old)
 * - syncing: latest block is stale, but the latest round advanced (observed
 *            by this client) within the past minute, i.e. we are catching up
 * - offline: stale block and no recent round advance (or no block at all)
 */
export function computeNetworkStatus(
  latestBlockTimestampMs: number | null,
  lastRoundAdvanceAtMs: number | null,
  nowMs: number
): NetworkStatusKind {
  if (latestBlockTimestampMs === null || Number.isNaN(latestBlockTimestampMs))
    return "offline";
  if (nowMs - latestBlockTimestampMs < ONLINE_MAX_BLOCK_AGE_MS) return "online";
  if (
    lastRoundAdvanceAtMs !== null &&
    nowMs - lastRoundAdvanceAtMs < SYNCING_MAX_ADVANCE_AGE_MS
  )
    return "syncing";
  return "offline";
}

/**
 * Whether a received block moves the latest round forward. The first block
 * received (no round seen yet) counts: the live feed only pushes newly
 * processed blocks. Replayed, duplicate or out-of-order rounds do not.
 */
export function isRoundAdvance(
  highestRound: number | null,
  receivedRound: number
): boolean {
  return highestRound === null || receivedRound > highestRound;
}
