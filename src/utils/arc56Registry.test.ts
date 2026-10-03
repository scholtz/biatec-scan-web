import { describe, expect, it } from "vitest";
import { formatCompilerInfo, rankOwners, riskTone, safeGithubUrl } from "./arc56Registry";

const o = (owner: string, reputationScore?: number, banned = false) => ({
  owner,
  repo: "r",
  url: "https://github.com/x/r",
  reputationScore,
  banned,
});

describe("rankOwners", () => {
  it("sorts by score desc, unscored last, banned after everything", () => {
    const ranked = rankOwners([o("a", 10), o("banned", 99, true), o("none"), o("b", 50)]);
    expect(ranked.map((x) => x.owner)).toEqual(["b", "a", "none", "banned"]);
  });
  it("does not mutate input", () => {
    const input = [o("a", 1), o("b", 2)];
    rankOwners(input);
    expect(input[0].owner).toBe("a");
  });
});

describe("safeGithubUrl", () => {
  it("allows github https only", () => {
    expect(safeGithubUrl("https://github.com/a/b")).toBe("https://github.com/a/b");
    expect(safeGithubUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeGithubUrl("https://evil.com/github.com/")).toBeUndefined();
    expect(safeGithubUrl(undefined)).toBeUndefined();
  });
});

describe("formatCompilerInfo", () => {
  it("formats compiler and version", () => {
    expect(
      formatCompilerInfo({
        name: "x",
        methods: [],
        compilerInfo: { compiler: "algod", compilerVersion: { major: 4, minor: 7, patch: 3 } },
      }),
    ).toBe("algod 4.7.3");
    expect(formatCompilerInfo({ name: "x", methods: [] })).toBe("");
  });
});

describe("riskTone", () => {
  it("maps risk levels", () => {
    expect(riskTone({ ...o("a"), riskLevel: "low" })).toBe("good");
    expect(riskTone({ ...o("a"), riskLevel: "Medium" })).toBe("warn");
    expect(riskTone({ ...o("a"), riskLevel: "high" })).toBe("bad");
    expect(riskTone(o("a", 1, true))).toBe("bad");
    expect(riskTone(o("a"))).toBe("neutral");
  });
});
