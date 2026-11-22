import { afterEach, describe, expect, it, vi } from "vitest";
import { checkNode } from "./nodeCheck";

function mockFetch(impl: (url: string) => Promise<Partial<Response>>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("checkNode", () => {
  it("probes algod /genesis and accepts a matching id", async () => {
    const fn = mockFetch(async (_url) => ({ ok: true, json: async () => ({ id: "mainnet-v1.0" }) }));
    expect(await checkNode("algod", "https://a.io", "mainnet-v1.0")).toEqual({
      status: "ok",
      genesis: "mainnet-v1.0",
    });
    expect(fn.mock.calls[0][0]).toBe("https://a.io/genesis");
  });
  it("probes indexer /health and reads genesis-id", async () => {
    const fn = mockFetch(async (_url) => ({
      ok: true,
      json: async () => ({ "genesis-id": "mainnet-v1.0" }),
    }));
    expect((await checkNode("indexer", "https://i.io", "mainnet-v1.0")).status).toBe("ok");
    expect(fn.mock.calls[0][0]).toBe("https://i.io/health");
  });
  it("flags a node on another network", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ id: "testnet-v1.0" }) }));
    expect(await checkNode("algod", "https://a.io", "mainnet-v1.0")).toEqual({
      status: "wrongNetwork",
      actual: "testnet-v1.0",
    });
  });
  it("reports unknownNetwork when the node omits its genesis id", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ round: 5 }) }));
    expect(await checkNode("indexer", "https://i.io", "x")).toEqual({ status: "unknownNetwork" });
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
