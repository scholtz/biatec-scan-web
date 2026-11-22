import { genesisMatches, type NodeGenesisInfo } from "../config/nodeOverrides";

export type NodeKind = "algod" | "indexer";

export type NodeCheckResult =
  | { status: "ok"; genesis: string }
  | { status: "wrongNetwork"; actual: string }
  /** Reachable and JSON, but the node does not say which network it is on. */
  | { status: "unknownNetwork" }
  | { status: "failed" };

const CHECK_TIMEOUT_MS = 8000;

/**
 * Probe a node and compare its genesis id with the one this build targets.
 * algod exposes it at `/genesis` (`id`), the indexer at `/health`
 * (`genesis-id`). Network/CORS/HTTP/parse failures all collapse to "failed".
 */
export async function checkNode(
  kind: NodeKind,
  baseUrl: string,
  expectedGenesisId: string,
): Promise<NodeCheckResult> {
  const path = kind === "algod" ? "/genesis" : "/health";
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    if (!response.ok) return { status: "failed" };
    const info: NodeGenesisInfo | null = await response.json();
    if (typeof info !== "object" || info === null) return { status: "failed" };
    const actual = info.id ?? info["genesis-id"];
    if (typeof actual !== "string") return { status: "unknownNetwork" };
    return genesisMatches(info, expectedGenesisId)
      ? { status: "ok", genesis: actual }
      : { status: "wrongNetwork", actual };
  } catch {
    return { status: "failed" };
  }
}
