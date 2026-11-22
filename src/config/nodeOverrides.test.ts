import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NODE_OVERRIDES_STORAGE_KEY,
  genesisMatches,
  loadNodeOverrides,
  normalizeNodeUrl,
  parseNodeOverrides,
  saveNodeOverrides,
} from "./nodeOverrides";

describe("normalizeNodeUrl", () => {
  it("accepts http/https and strips trailing slashes and whitespace", () => {
    expect(normalizeNodeUrl(" https://node.example.com/ ")).toEqual({
      ok: true,
      url: "https://node.example.com",
    });
    expect(normalizeNodeUrl("http://localhost:4001")).toEqual({
      ok: true,
      url: "http://localhost:4001",
    });
    expect(normalizeNodeUrl("https://host/algod//")).toEqual({
      ok: true,
      url: "https://host/algod",
    });
  });
  it("rejects non-http protocols", () => {
    expect(normalizeNodeUrl("ftp://x.com")).toEqual({ ok: false, error: "protocol" });
    expect(normalizeNodeUrl("javascript:alert(1)")).toEqual({ ok: false, error: "protocol" });
  });
  it("rejects bare trailing ? and #", () => {
    expect(normalizeNodeUrl("https://host/?")).toEqual({ ok: false, error: "invalid" });
    expect(normalizeNodeUrl("https://host#")).toEqual({ ok: false, error: "invalid" });
  });
  it("rejects non-loopback http on an https page only", () => {
    expect(normalizeNodeUrl("http://192.168.1.10:4001", "https:")).toEqual({
      ok: false,
      error: "protocol",
    });
    expect(normalizeNodeUrl("http://localhost:4001", "https:").ok).toBe(true);
    expect(normalizeNodeUrl("http://192.168.1.10:4001", "http:").ok).toBe(true);
  });
  it("rejects garbage, credentials, query and fragment", () => {
    expect(normalizeNodeUrl("")).toEqual({ ok: false, error: "invalid" });
    expect(normalizeNodeUrl("not a url")).toEqual({ ok: false, error: "invalid" });
    expect(normalizeNodeUrl("https://u:p@host")).toEqual({ ok: false, error: "invalid" });
    expect(normalizeNodeUrl("https://host?token=1")).toEqual({ ok: false, error: "invalid" });
    expect(normalizeNodeUrl("https://host#x")).toEqual({ ok: false, error: "invalid" });
  });
});

describe("parseNodeOverrides", () => {
  it("returns empty for missing or corrupt data", () => {
    expect(parseNodeOverrides(null)).toEqual({});
    expect(parseNodeOverrides("{oops")).toEqual({});
    expect(parseNodeOverrides("42")).toEqual({});
    expect(parseNodeOverrides("null")).toEqual({});
  });
  it("keeps only valid entries", () => {
    expect(
      parseNodeOverrides(
        JSON.stringify({ algodUrl: "https://a.io/", indexerUrl: "javascript:x" }),
      ),
    ).toEqual({ algodUrl: "https://a.io" });
  });
});

describe("save/load round trip", () => {
  beforeEach(() => {
    // Vitest runs in node: provide a minimal in-memory localStorage.
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  it("persists and reloads overrides", () => {
    expect(saveNodeOverrides({ algodUrl: "https://a.io", indexerUrl: "https://i.io" })).toBe(true);
    expect(loadNodeOverrides()).toEqual({ algodUrl: "https://a.io", indexerUrl: "https://i.io" });
  });
  it("removes the entry when both are empty", () => {
    saveNodeOverrides({ algodUrl: "https://a.io" });
    saveNodeOverrides({});
    expect(localStorage.getItem(NODE_OVERRIDES_STORAGE_KEY)).toBeNull();
  });
});

describe("genesisMatches", () => {
  it("reads algod /genesis (id) and indexer /health (genesis-id)", () => {
    expect(genesisMatches({ id: "mainnet-v1.0" }, "mainnet-v1.0")).toBe(true);
    expect(genesisMatches({ "genesis-id": "mainnet-v1.0" }, "mainnet-v1.0")).toBe(true);
    expect(genesisMatches({ id: "testnet-v1.0" }, "mainnet-v1.0")).toBe(false);
    expect(genesisMatches({}, "mainnet-v1.0")).toBe(false);
  });
});
