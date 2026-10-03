import type { Arc56Contract, Arc56RegistryOwner } from "../types/arc56";

/** Owners ranked best-first: banned last, then by reputation score (missing score ranks lowest). */
export function rankOwners(owners: Arc56RegistryOwner[]): Arc56RegistryOwner[] {
  return [...owners].sort((a, b) => {
    if (!!a.banned !== !!b.banned) return a.banned ? 1 : -1;
    return (b.reputationScore ?? -1) - (a.reputationScore ?? -1);
  });
}

/** Only https GitHub links are rendered as hrefs - registry data is third-party content. */
export function safeGithubUrl(url: string | undefined): string | undefined {
  return url && url.startsWith("https://github.com/") ? url : undefined;
}

export function formatCompilerInfo(contract: Arc56Contract): string {
  const info = contract.compilerInfo;
  if (!info?.compiler) return "";
  const v = info.compilerVersion;
  return v ? `${info.compiler} ${v.major}.${v.minor}.${v.patch}` : info.compiler;
}

export type RiskTone = "good" | "warn" | "bad" | "neutral";

export function riskTone(owner: Arc56RegistryOwner): RiskTone {
  if (owner.banned) return "bad";
  switch (owner.riskLevel?.toLowerCase()) {
    case "low":
      return "good";
    case "medium":
      return "warn";
    case "high":
    case "critical":
      return "bad";
    default:
      return "neutral";
  }
}
