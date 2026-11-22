import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkNode } from "./nodeCheck";

function mockFetch(impl: () => Promise<Partial<Response>>) {
  const fn = vi.fn<(url: string) => Promise<Partial<Response>>>(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

// Vitest runs in node: stub the bits of `document` that checkNode listens on.
const listeners = new Set<(e: SecurityPolicyViolationEvent) => void>();
beforeEach(() => {
  listeners.clear();
  vi.stubGlobal("document", {
    addEventListener: (_t: string, fn: (e: SecurityPolicyViolationEvent) => void) => listeners.add(fn),
    removeEventListener: (_t: string, fn: (e: SecurityPolicyViolationEvent) => void) => listeners.delete(fn),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("checkNode", () => {
  it("probes algod /genesis and accepts a matching id", async () => {
    const fn = mockFetch(async () => ({ ok: true, json: async () => ({ "genesis-id": "mainnet-v1.0" }) }));
    expect(await checkNode("algod", "https://a.io", "mainnet-v1.0")).toEqual({
      status: "ok",
      genesis: "mainnet-v1.0",
    });
    expect(fn.mock.calls[0][0]).toBe("https://a.io/v2/transactions/params");
  });
  it("probes indexer /health and reads genesis-id", async () => {
    const fn = mockFetch(async () => ({
      ok: true,
      json: async () => ({ "genesis-id": "mainnet-v1.0" }),
    }));
    expect((await checkNode("indexer", "https://i.io", "mainnet-v1.0")).status).toBe("ok");
    expect(fn.mock.calls[0][0]).toBe("https://i.io/health");
  });
  it("flags a node on another network", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ "genesis-id": "testnet-v1.0" }) }));
    expect(await checkNode("algod", "https://a.io", "mainnet-v1.0")).toEqual({
      status: "wrongNetwork",
      actual: "testnet-v1.0",
    });
  });
  it("reports unknownNetwork when an indexer omits its genesis id", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ round: 5 }) }));
    expect(await checkNode("indexer", "https://i.io", "x")).toEqual({ status: "unknownNetwork" });
  });
  it("fails an algod endpoint that returns no genesis id", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({}) }));
    expect(await checkNode("algod", "https://a.io", "x")).toEqual({ status: "failed" });
  });
  it("reports cspBlocked when a securitypolicyviolation names the host", async () => {
    mockFetch(async () => {
      listeners.forEach((fn) => fn({ blockedURI: "https://a.io/v2/transactions/params" } as SecurityPolicyViolationEvent));
      throw new TypeError("Failed to fetch");
    });
    expect(await checkNode("algod", "https://a.io", "x")).toEqual({ status: "cspBlocked" });
    expect(listeners.size).toBe(0);
  });
  it("fails on HTTP errors, null bodies, and network errors", async () => {
    mockFetch(async () => ({ ok: false }));
    expect((await checkNode("algod", "https://a.io", "x")).status).toBe("failed");
    mockFetch(async () => ({ ok: true, json: async () => null }));
    expect((await checkNode("algod", "https://a.io", "x")).status).toBe("failed");
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect((await checkNode("algod", "https://a.io", "x")).status).toBe("failed");
  });
});
