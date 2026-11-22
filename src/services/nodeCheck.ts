import { genesisMatches, type NodeGenesisInfo } from "../config/nodeOverrides";

export type NodeKind = "algod" | "indexer";

export type NodeCheckResult =
  | { status: "ok"; genesis: string }
  | { status: "wrongNetwork"; actual: string }
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
    const info: NodeGenesisInfo = await response.json();
    const actual = info.id ?? info["genesis-id"];
    if (typeof actual !== "string") return { status: "failed" };
    return genesisMatches(info, expectedGenesisId)
      ? { status: "ok", genesis: actual }
      : { status: "wrongNetwork", actual };
  } catch {
    return { status: "failed" };
  }
}
