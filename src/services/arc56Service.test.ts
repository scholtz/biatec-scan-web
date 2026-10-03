import { afterEach, describe, expect, it, vi } from "vitest";
import { arc56Service } from "./arc56Service";

// The service is a singleton with a session cache, so every test uses its own hash.
const hash = (c: string) => c.repeat(64);

const respond = (status: number, body?: object) =>
  Promise.resolve(new Response(body ? JSON.stringify(body) : "", { status }));

afterEach(() => vi.unstubAllGlobals());

describe("lookupContractByApprovalHash", () => {
  it("returns found and caches it", async () => {
    const fetchMock = vi.fn(() => respond(200, { name: "C", methods: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const r1 = await arc56Service.lookupContractByApprovalHash(hash("a"));
    const r2 = await arc56Service.lookupContractByApprovalHash(hash("a"));
    expect(r1.state).toBe("found");
    expect(r2.state).toBe("found");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns not-found for 404 and caches it", async () => {
    const fetchMock = vi.fn(() => respond(404));
    vi.stubGlobal("fetch", fetchMock);
    expect((await arc56Service.lookupContractByApprovalHash(hash("b"))).state).toBe("not-found");
    expect((await arc56Service.lookupContractByApprovalHash(hash("b"))).state).toBe("not-found");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns error for 5xx / network failure and does NOT cache it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => respond(503)));
    expect((await arc56Service.lookupContractByApprovalHash(hash("c"))).state).toBe("error");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    expect((await arc56Service.lookupContractByApprovalHash(hash("c"))).state).toBe("error");
    vi.stubGlobal("fetch", vi.fn(() => respond(200, { name: "C", methods: [] })));
    expect((await arc56Service.lookupContractByApprovalHash(hash("c"))).state).toBe("found");
  });

  it("getContractByApprovalHash does not poison the cache on an outage", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => respond(503)));
    expect(await arc56Service.getContractByApprovalHash(hash("d"))).toBeNull();
    vi.stubGlobal("fetch", vi.fn(() => respond(200, { name: "C", methods: [] })));
    expect((await arc56Service.lookupContractByApprovalHash(hash("d"))).state).toBe("found");
  });

  it("rejects non-hex hashes", async () => {
    await expect(arc56Service.lookupContractByApprovalHash("XYZ")).rejects.toThrow();
  });
});

describe("getOwnersByApprovalHash", () => {
  it("returns owners, [] for 404, null for errors", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => respond(200, { owners: [{ owner: "o", repo: "r", url: "u" }] })));
    expect(await arc56Service.getOwnersByApprovalHash(hash("e"))).toHaveLength(1);
    vi.stubGlobal("fetch", vi.fn(() => respond(404)));
    expect(await arc56Service.getOwnersByApprovalHash(hash("f"))).toEqual([]);
    vi.stubGlobal("fetch", vi.fn(() => respond(500)));
    expect(await arc56Service.getOwnersByApprovalHash(hash("0"))).toBeNull();
  });
});
