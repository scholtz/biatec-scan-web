import { algorandService } from "./algorandService";
import { getTokenFromLocalStorage } from "../scripts/algo/getTokenFromLocalStorage";
import { getTokenFromAlgod } from "../scripts/algo/getTokenFromAlgod";

interface AssetLoadRequest {
  assetId: bigint;
  callbacks: Array<() => void>;
}

class AssetService {
  private loadQueue: Map<string, AssetLoadRequest> = new Map();
  private isLoading = false;
  private lastLoadTime = 0;
  private readonly MIN_LOAD_INTERVAL = 2000; // 2 seconds minimum between loads

  /**
   * Request to load an asset. If already loading or loaded, will call callback when ready.
   */
  async requestAsset(assetId: bigint, callback: () => void): Promise<void> {
    const assetIdStr = assetId.toString();

    // Check if asset is already in localStorage
    const existingAsset = getTokenFromLocalStorage(assetId);
    if (existingAsset) {
      console.log(`Asset service: Asset ${assetIdStr} already available`);
      callback();
      return;
    }

    console.log(`Asset service: Queueing asset ${assetIdStr} for loading`);

    // Add to queue or existing request
    if (this.loadQueue.has(assetIdStr)) {
      console.log(
        `Asset service: Adding callback to existing request for ${assetIdStr}`
      );
      this.loadQueue.get(assetIdStr)!.callbacks.push(callback);
    } else {
      console.log(`Asset service: Creating new request for ${assetIdStr}`);
      this.loadQueue.set(assetIdStr, {
        assetId,
        callbacks: [callback],
      });
    }

    // Start processing queue if not already running
    if (!this.isLoading) {
      console.log("Asset service: Starting queue processing");
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isLoading || this.loadQueue.size === 0) {
      return;
    }

    this.isLoading = true;
    console.log(
      `Asset service: Processing queue with ${this.loadQueue.size} assets`
    );

    while (this.loadQueue.size > 0) {
      // Always enforce timing constraint, regardless of cache status
      const now = Date.now();
      const timeSinceLastLoad = now - this.lastLoadTime;

      if (this.lastLoadTime > 0 && timeSinceLastLoad < this.MIN_LOAD_INTERVAL) {
        const waitTime = this.MIN_LOAD_INTERVAL - timeSinceLastLoad;
        console.log(`Asset service: Waiting ${waitTime}ms before next request`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      // Get the first item from the queue
      const firstEntry = this.loadQueue.entries().next().value;
      if (!firstEntry) break;

      const [assetIdStr, request] = firstEntry;
      this.loadQueue.delete(assetIdStr);

      try {
        // Check again if asset was loaded while waiting
        const existingAsset = getTokenFromLocalStorage(request.assetId);
        if (!existingAsset) {
          console.log(`Asset service: Loading asset ${assetIdStr} from API`);
          const algod = algorandService.getAlgodClient();
          await getTokenFromAlgod(request.assetId, algod);
          console.log(`Asset service: Successfully loaded asset ${assetIdStr}`);
        } else {
          console.log(`Asset service: Asset ${assetIdStr} found in cache`);
        }

        // Always update lastLoadTime to maintain consistent intervals
        this.lastLoadTime = Date.now();

        // Call all callbacks for this asset
        request.callbacks.forEach((callback: () => void) => {
          try {
            callback();
          } catch (error) {
            console.error("Error in asset load callback:", error);
          }
        });
      } catch (error) {
        console.error(
          `Asset service: Error loading asset ${assetIdStr}:`,
          error
        );
        this.lastLoadTime = Date.now(); // Still update time to maintain interval

        // Still call callbacks so UI doesn't hang
        request.callbacks.forEach((callback: () => void) => {
          try {
            callback();
          } catch (callbackError) {
            console.error("Error in asset load callback:", callbackError);
          }
        });
      }
    }

    this.isLoading = false;
    console.log("Asset service: Queue processing complete");
  }

  /**
   * Get asset info if available in localStorage, otherwise return null
   */
  getAssetInfo(assetId: bigint) {
    return getTokenFromLocalStorage(assetId);
  }

  /**
   * Format asset balance with proper decimals and unit name
   */
  formatAssetBalance(balance: bigint | number, assetId: bigint): string {
    if (balance === 0n || balance === 0) return "0";

    const assetInfo = this.getAssetInfo(assetId);
    if (!assetInfo) {
      return "Loading...";
    }

    const decimals = assetInfo.decimals || 0;
    const formattedBalance = Number(balance) / Math.pow(10, decimals);
    const unitName = assetInfo.unitName || assetInfo.name || `Asset ${assetId}`;

    return `${formattedBalance.toLocaleString()} ${unitName}`;
  }
}

export const assetService = new AssetService();
