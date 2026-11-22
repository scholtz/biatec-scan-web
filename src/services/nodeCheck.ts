import { genesisMatches, type NodeGenesisInfo } from "../config/nodeOverrides";

export type NodeKind = "algod" | "indexer";

export type NodeCheckResult =
  | { status: "ok"; genesis: string }
  | { status: "wrongNetwork"; actual: string }
  /** Reachable and JSON, but the node does not say which network it is on. */
  | { status: "unknownNetwork" }
  /** The page's own Content-Security-Policy forbids connecting to this host. */
  | { status: "cspBlocked" }
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
  // A CSP-blocked fetch looks like any network error; the violation event is the only tell.
  let cspBlocked = false;
  const onViolation = (event: SecurityPolicyViolationEvent) => {
    if (event.blockedURI.startsWith(baseUrl)) cspBlocked = true;
  };
  document.addEventListener("securitypolicyviolation", onViolation);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    if (!response.ok) return { status: "failed" };
    const info: NodeGenesisInfo | null = await response.json();
    if (typeof info !== "object" || info === null) return { status: "failed" };
    const actual = info.id ?? info["genesis-id"];
    // algod's /genesis always has an id; without one this is not an algod node.
    if (typeof actual !== "string") {
      return kind === "algod" ? { status: "failed" } : { status: "unknownNetwork" };
    }
    return genesisMatches(info, expectedGenesisId)
      ? { status: "ok", genesis: actual }
      : { status: "wrongNetwork", actual };
  } catch {
    // The violation event is dispatched asynchronously; let it land before reading the flag.
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { status: cspBlocked ? "cspBlocked" : "failed" };
  } finally {
    document.removeEventListener("securitypolicyviolation", onViolation);
  }
}
