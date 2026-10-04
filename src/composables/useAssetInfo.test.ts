import { describe, expect, it } from "vitest";
import { computed } from "vue";
import { useAssetInfo, type AssetInfoSource } from "./useAssetInfo";

interface FakeInfo {
  name: string;
}

// In-memory stand-in for assetService: info only appears once the queued
// request "finishes", exactly like the real localStorage-backed cache.
function fakeSource() {
  const cache = new Map<string, FakeInfo>();
  const pending = new Map<string, Array<() => void>>();
  const requests: string[] = [];
  const source: AssetInfoSource<FakeInfo> = {
    getAssetInfo: (id) => cache.get(id.toString()) ?? null,
    requestAsset: async (id, cb) => {
      requests.push(id.toString());
      const list = pending.get(id.toString()) ?? [];
      list.push(cb);
      pending.set(id.toString(), list);
    },
  };
  return {
    source,
    requests,
    finish(id: bigint, info?: FakeInfo) {
      if (info) cache.set(id.toString(), info);
      (pending.get(id.toString()) ?? []).forEach((cb) => cb());
      pending.delete(id.toString());
    },
  };
}

describe("useAssetInfo", () => {
  it("re-evaluates dependent computeds once a requested asset finishes loading", () => {
    const fake = fakeSource();
    const { assetInfo } = useAssetInfo(fake.source);
    const label = computed(() => assetInfo(42n)?.name ?? "Loading...");

    expect(label.value).toBe("Loading...");
    fake.finish(42n, { name: "LP Token" });
    expect(label.value).toBe("LP Token");
  });

  it("requests a missing asset only once, even across recomputes", () => {
    const fake = fakeSource();
    const { assetInfo } = useAssetInfo(fake.source);
    const label = computed(() => assetInfo(7n)?.name ?? "Loading...");

    expect(label.value).toBe("Loading...");
    // Load fails: callbacks fire but the cache stays empty. Must not re-request
    // forever (each request is rate limited to 1 / 2s by the real service).
    fake.finish(7n);
    expect(label.value).toBe("Loading...");
    expect(fake.requests).toEqual(["7"]);
  });

  it("does not request assets that are already cached", () => {
    const fake = fakeSource();
    fake.finish(1n, { name: "ALGO" });
    const { assetInfo } = useAssetInfo(fake.source);
    expect(assetInfo(1n)?.name).toBe("ALGO");
    expect(fake.requests).toEqual([]);
  });
});
