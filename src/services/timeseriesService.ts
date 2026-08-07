import { getAVMTradeReporterAPI } from "../api";
import type { AssetTimeseries7D } from "../api/models";

/**
 * Client for the backend's 7d hourly asset timeseries endpoint
 * (GET api/asset/timeseries/7d?assetIds=...), which serves the price/TVL OHLC
 * sparkline columns on the asset and pool list pages.
 *
 * The backend recomputes the series once per hour and serves them from Redis, so
 * the client mirrors that cadence: results are cached in memory for 15 minutes
 * and individual `get(assetId)` calls made while a page renders are coalesced
 * into batched requests (the endpoint accepts up to 100 ids per call), so a
 * table of 100 rows costs one HTTP request, not 100.
 */

const CACHE_TTL_MS = 15 * 60 * 1000;
const BATCH_WINDOW_MS = 50;
const MAX_IDS_PER_REQUEST = 100;

interface CacheEntry {
  data: AssetTimeseries7D | null;
  fetchedAt: number;
}

class TimeseriesService {
  private cache = new Map<number, CacheEntry>();
  private pending = new Map<number, Promise<AssetTimeseries7D | null>>();
  private queue = new Map<number, (value: AssetTimeseries7D | null) => void>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /** Returns the 7d series for one asset, batching concurrent calls into one request. */
  get(assetId: number): Promise<AssetTimeseries7D | null> {
    const cached = this.cache.get(assetId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return Promise.resolve(cached.data);
    }

    const inFlight = this.pending.get(assetId);
    if (inFlight) return inFlight;

    const promise = new Promise<AssetTimeseries7D | null>((resolve) => {
      this.queue.set(assetId, resolve);
      if (this.flushTimer === null) {
        this.flushTimer = setTimeout(() => this.flush(), BATCH_WINDOW_MS);
      }
    });
    this.pending.set(assetId, promise);
    return promise;
  }

  private async flush(): Promise<void> {
    this.flushTimer = null;
    const batch = Array.from(this.queue.entries());
    this.queue.clear();
    if (batch.length === 0) return;

    // The endpoint caps assetIds at 100 per request — chunk anything larger.
    for (let i = 0; i < batch.length; i += MAX_IDS_PER_REQUEST) {
      const chunk = batch.slice(i, i + MAX_IDS_PER_REQUEST);
      const ids = chunk.map(([id]) => id);
      let byId = new Map<number, AssetTimeseries7D>();
      try {
        const api = getAVMTradeReporterAPI();
        const res = await api.getApiAssetTimeseries7d({ assetIds: ids.join(",") });
        const list = (Array.isArray(res) ? res : (res as { data?: AssetTimeseries7D[] }).data) ?? [];
        byId = new Map(list.map((item) => [Number(item.assetId), item]));
      } catch (error) {
        console.error("Failed to load 7d asset timeseries", error);
      }

      const now = Date.now();
      for (const [id, resolve] of chunk) {
        const data = byId.get(id) ?? null;
        // Cache misses/failures too, so a broken backend doesn't cause a request storm.
        this.cache.set(id, { data, fetchedAt: now });
        this.pending.delete(id);
        resolve(data);
      }
    }
  }
}

export const timeseriesService = new TimeseriesService();
