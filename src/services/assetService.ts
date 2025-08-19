import { algorandService } from "./algorandService";
import { getTokenFromLocalStorage } from "../scripts/algo/getTokenFromLocalStorage";
import { getTokenFromAlgod } from "../scripts/algo/getTokenFromAlgod";
import { AggregatedPool, Pool } from "../api/models";

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
  formatAssetBalance(
    balance: bigint | number,
    assetId: bigint | number,
    divideByDecimals: boolean = true
  ): string {
    if (balance === 0n || balance === 0) return "0";

    const assetInfo = this.getAssetInfo(BigInt(assetId));
    if (!assetInfo) {
      return "Loading...";
    }

    const decimals = assetInfo.decimals || 0;
    const formattedBalance = divideByDecimals
      ? Number(balance) / Math.pow(10, decimals)
      : Number(balance);
    const unitName = assetInfo.unitName || assetInfo.name || `Asset ${assetId}`;

    return `${formattedBalance.toLocaleString()} ${unitName}`;
  }
  /**
   * Format asset pair balance with proper decimals and unit name. Divide a/b and format it with output price assetAName/assetBName.
   */
  formatPairBalance(
    balanceA: bigint | number,
    assetIdA: bigint | number,
    balanceB: bigint | number,
    assetIdB: bigint | number,
    convertToBase: boolean
  ): string {
    let price = Number(balanceB) / Number(balanceA);

    if (this.needToReverseAssets(BigInt(assetIdA), BigInt(assetIdB))) {
      [assetIdA, assetIdB] = [assetIdB, assetIdA];
      [balanceA, balanceB] = [balanceB, balanceA];
    }

    const assetInfoA = this.getAssetInfo(BigInt(assetIdA));
    const assetInfoB = this.getAssetInfo(BigInt(assetIdB));
    if (!assetInfoA || !assetInfoB) {
      return "Loading...";
    }

    const unitNameA =
      assetInfoA.unitName || assetInfoA.name || `Asset ${assetIdA}`;
    const unitNameB =
      assetInfoB.unitName || assetInfoB.name || `Asset ${assetIdB}`;

    if (balanceA === 0n || balanceB === 0n || balanceA === 0 || balanceB === 0)
      return `0  ${unitNameA}/${unitNameB}`;

    if (convertToBase) {
      const decimalsA = assetInfoA.decimals || 0;
      const baseA = Number(balanceA) / Math.pow(10, decimalsA);
      const decimalsB = assetInfoB.decimals || 0;

      const baseB = Number(balanceB) / Math.pow(10, decimalsB);
      price = baseB / baseA;
    }

    return `${price.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    })} ${unitNameA}/${unitNameB}`;
  }
  /**
   * Determine if the assets need to be reversed in a trade
   * @param assetA The ID of the first asset
   * @param assetB The ID of the second asset
   * @returns True if the assets need to be reversed, false otherwise
   */
  needToReverseAssets = (
    assetA: bigint | number,
    assetB: bigint | number
  ): boolean => {
    const a = BigInt(assetA);
    const b = BigInt(assetB);
    if (a === 31566704n) {
      // usdc
      return true;
    }
    if (b === 31566704n) {
      return false;
    }
    if (a === 760037151n) {
      // xUSD
      return true;
    }
    if (b === 760037151n) {
      return false;
    }
    if (a === 227855942n) {
      // eurs
      return true;
    }
    if (b === 227855942n) {
      return false;
    }
    if (a === 1241945177n) {
      // goldDAO
      return true;
    }
    if (b === 1241945177n) {
      return false;
    }

    if (a === 0n) {
      // algo
      return true;
    }
    if (b === 0n) {
      return false;
    }
    if (a === 2320804780n) {
      //Aramid Algo
      return true;
    }
    if (b === 2320804780n) {
      return false;
    }
    if (a === 2537013734n) {
      //xAlgo
      return true;
    }
    if (b === 2537013734n) {
      return false;
    }
    if (a === 2537013734n) {
      //tAlgo
      return true;
    }
    if (b === 2537013734n) {
      return false;
    }
    if (a === 2537013734n) {
      //tAlgo
      return true;
    }
    if (b === 1185173782n) {
      return false;
    }

    return false;
  };
  reverseAggregatedPool = (pool: AggregatedPool): AggregatedPool => {
    return {
      ...pool,
      assetIdA: pool.assetIdB,
      assetIdB: pool.assetIdA,
      virtualSumA: pool.virtualSumB,
      virtualSumB: pool.virtualSumA,
      tvL_A: pool.tvL_B,
      tvL_B: pool.tvL_A,
      virtualSumALevel1: pool.virtualSumBLevel1,
      virtualSumBLevel1: pool.virtualSumALevel1,
      virtualSumALevel2: pool.virtualSumBLevel2,
      virtualSumBLevel2: pool.virtualSumALevel2,
      id: `${pool.assetIdB}-${pool.assetIdA}`,
    };
  };

  reversePool = (pool: Pool): Pool => {
    return {
      ...pool,
      assetIdA: pool.assetIdB,
      assetIdB: pool.assetIdA,
      a: pool.b,
      b: pool.a,
      l: pool.l,
      assetADecimals: pool.assetBDecimals,
      assetBDecimals: pool.assetADecimals,
      realAmountA: pool.realAmountB,
      realAmountB: pool.realAmountA,
      virtualAmountA: pool.virtualAmountB,
      virtualAmountB: pool.virtualAmountA,
    };
  };

  /**
   * Format asset pair balance with proper decimals and unit name. Divide a/b and format it with output price assetAName/assetBName.
   */
  formatPairBalanceWithRealValue(
    price: number,
    assetIdA: bigint | number,
    assetIdB: bigint | number
  ): string {
    if (this.needToReverseAssets(BigInt(assetIdA), BigInt(assetIdB))) {
      [assetIdA, assetIdB] = [assetIdB, assetIdA];
      price = 1 / price;
    }

    const assetInfoA = this.getAssetInfo(BigInt(assetIdA));
    const assetInfoB = this.getAssetInfo(BigInt(assetIdB));
    if (!assetInfoA || !assetInfoB) {
      return "Loading...";
    }

    const unitNameA =
      assetInfoA.unitName || assetInfoA.name || `Asset ${assetIdA}`;
    const unitNameB =
      assetInfoB.unitName || assetInfoB.name || `Asset ${assetIdB}`;

    return `${price.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    })} ${unitNameA}/${unitNameB}`;
  }
}

export const assetService = new AssetService();
