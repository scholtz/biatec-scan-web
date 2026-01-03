import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
  HttpTransportType,
} from "@microsoft/signalr";
import type { AMMLiquidity, AMMTrade } from "../types/algorand";
import { getAuthToken as getArc14AuthToken } from "./authService";
import { AMMAggregatedPool } from "../types/AMMAggregatedPool";
import { BiatecBlock } from "../types/BiatecBlock";
import { AggregatedPool, BiatecAsset, Pool } from "../api/models";
import { SubscriptionFilter } from "../types/SubscriptionFilter";
let callbacksTrades: ((trade: AMMTrade) => void)[] = [];
let callbacksLiquidity: ((liquidity: AMMLiquidity) => void)[] = [];
let callbacksPools: ((pool: Pool) => void)[] = [];
let callbacksAggregatedPools: ((pool: AMMAggregatedPool) => void)[] = [];
let callbacksBlocks: ((block: BiatecBlock) => void)[] = [];
let callbacksAssets: ((block: BiatecAsset) => void)[] = [];

let pendingSubscriptions: SubscriptionFilter[] = [];

class SignalRService {
  private connection: HubConnection | null = null;
  private isConnected = false;
  private reconnectInterval: number | null = null;
  async getAuthToken(): Promise<string> {
    return await getArc14AuthToken();
  }
  async connect(): Promise<void> {
    try {
      // const headers = {
      //   authorization: await this.getAuthToken(),
      // };
      this.connection = new HubConnectionBuilder()
        .withUrl("https://algorand-trades.de-4.biatec.io/biatecScanHub", {
          //.withUrl("https://localhost:44390/biatecScanHub", {
          //headers: headers,
          withCredentials: true,
          transport: HttpTransportType.WebSockets, // Use WebSockets for real-time updates
          accessTokenFactory: async () => await this.getAuthToken(),
        }) // Biatec scan API SignalR endpoint
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

      this.connection.onreconnecting(() => {
        console.log("SignalR reconnecting...");
        this.isConnected = false;
      });

      this.connection.onreconnected(() => {
        console.log("SignalR reconnected");
        this.isConnected = true;
        // Re-subscribe after reconnection with merged filters
        if (pendingSubscriptions.length > 0) {
          const mergedFilter = this.mergeSubscriptionFilters(pendingSubscriptions);
          this.connection?.invoke("Subscribe", mergedFilter)
            .then(() => {
              console.log("Re-subscribed after reconnection:", mergedFilter);
            })
            .catch(error => console.error("Error re-subscribing after reconnection:", error));
        }
      });

      this.connection.onclose(() => {
        console.log("SignalR connection closed");
        this.isConnected = false;
        this.scheduleReconnect();
      });

      // Handle subscription confirmation
      this.connection.on("Info", (filter: any) => {
        console.log(`Info received: "${JSON.stringify(filter)}"`);
      });
      this.connection.on("TestConnectionResult", (result: any) => {
        console.log(`Test connection result: `, result);
      });

      // Handle subscription errors
      this.connection.on("Error", (errorMessage: string) => {
        console.error("SignalR subscription error:", errorMessage);
      });

      // Handle subscription errors
      this.connection.on("Block", (block: any) => {
        console.log("Block received:", block);
        callbacksBlocks.forEach((callback) => callback(block as BiatecBlock));
      });
      this.connection.on("Asset", (asset: any) => {
        console.log("asset received:", asset);
        callbacksAssets.forEach((callback) => callback(asset as BiatecAsset));
      });
      // Handle subscription errors
      this.connection.on("Trade", (trade: any) => {
        //console.log("FilteredTradeUpdated received:", trade);
        callbacksTrades.forEach((callback) => callback(trade as AMMTrade));
      });
      this.connection.on("Pool", (pool: any) => {
        //console.log("PoolUpdated received:", pool);
        callbacksPools.forEach((callback) => callback(pool as Pool));
      });
      // Handle subscription errors
      this.connection.on("Liquidity", (liquidity: any) => {
        //console.log("FilteredLiquidityUpdated received:", liquidity);
        callbacksLiquidity.forEach((callback) =>
          callback(liquidity as AMMLiquidity)
        );
      });
      // Handle subscription errors
      this.connection.on("AggregatedPool", (pool: any) => {
        const poolObj = pool as AMMAggregatedPool;
        // console.log(
        //   "AggregatedPoolUpdated received:",
        //   poolObj.id,
        //   callbacksAggregatedPools.length,
        //   poolObj,
        //   pool
        // );
        callbacksAggregatedPools.forEach((callback) => callback(poolObj));
      });

      await this.connection.start();
      this.isConnected = true;
      console.log("SignalR connected successfully");

      // Subscribe to receive trade updates with empty filter (all trades)
      await this.connection.invoke("TestConnection");
    } catch (error) {
      console.error("Error connecting to SignalR:", error);
      this.scheduleReconnect();
    }
  }

  private mergeSubscriptionFilters(filters: SubscriptionFilter[]): SubscriptionFilter {
    const merged: SubscriptionFilter = {
      RecentBlocks: false,
      RecentTrades: false,
      RecentLiquidity: false,
      RecentPool: false,
      RecentAggregatedPool: false,
      RecentAssets: false,
      MainAggregatedPools: false,
      PoolsAddresses: [],
      AggregatedPoolsIds: [],
      AssetIds: [],
    };

    // Merge all filters
    filters.forEach((filter) => {
      merged.RecentBlocks = merged.RecentBlocks || filter.RecentBlocks;
      merged.RecentTrades = merged.RecentTrades || filter.RecentTrades;
      merged.RecentLiquidity = merged.RecentLiquidity || filter.RecentLiquidity;
      merged.RecentPool = merged.RecentPool || filter.RecentPool;
      merged.RecentAggregatedPool = merged.RecentAggregatedPool || filter.RecentAggregatedPool;
      merged.RecentAssets = merged.RecentAssets || filter.RecentAssets;
      merged.MainAggregatedPools = merged.MainAggregatedPools || filter.MainAggregatedPools;

      // Merge arrays and remove duplicates
      merged.PoolsAddresses = [...new Set([...merged.PoolsAddresses, ...filter.PoolsAddresses])];
      merged.AggregatedPoolsIds = [...new Set([...merged.AggregatedPoolsIds, ...filter.AggregatedPoolsIds])];
      merged.AssetIds = [...new Set([...merged.AssetIds, ...filter.AssetIds])];
    });

    return merged;
  }

  public async subscribe(filter: SubscriptionFilter): Promise<void> {
    console.log("subscribing with filter:", filter);
    
    // Add this filter to pending subscriptions if not already present
    const existingIndex = pendingSubscriptions.findIndex(f => 
      JSON.stringify(f) === JSON.stringify(filter)
    );
    if (existingIndex === -1) {
      pendingSubscriptions.push(filter);
    }

    const timeoutMs = 5000;
    const start = Date.now();

    if (!this.connection || !this.isConnected) {
      console.log("Waiting up to 5s for SignalR connection...");

      // Kick off a connection if none exists
      if (!this.connection) {
        try {
          // Fire and forget; we'll await readiness below
          this.connect();
        } catch {
          // ignore
        }
      }

      while (
        Date.now() - start < timeoutMs &&
        (!this.connection || !this.isConnected)
      ) {
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!this.connection || !this.isConnected) {
        console.log("Not subscribed: connection timeout (5s)");
        return;
      }
    }

    try {
      // Merge all pending subscriptions into one
      const mergedFilter = this.mergeSubscriptionFilters(pendingSubscriptions);
      
      await this.connection.invoke("Subscribe", mergedFilter);
      console.log(`Subscribed to updates with merged filter:`, mergedFilter);
    } catch (error) {
      console.error("Error subscribing to updates:", error);
    }
  }
  public async unsubscribeFilter(filter: SubscriptionFilter): Promise<void> {
    // Remove this specific filter from pending subscriptions
    const filterStr = JSON.stringify(filter);
    pendingSubscriptions = pendingSubscriptions.filter(f => 
      JSON.stringify(f) !== filterStr
    );

    if (!this.connection || !this.isConnected) return;

    try {
      if (pendingSubscriptions.length > 0) {
        // Re-subscribe with remaining filters
        const mergedFilter = this.mergeSubscriptionFilters(pendingSubscriptions);
        await this.connection.invoke("Subscribe", mergedFilter);
        console.log(`Re-subscribed with remaining filters:`, mergedFilter);
      } else {
        // No more subscriptions, unsubscribe completely
        await this.connection.invoke("Unsubscribe");
        console.log(`Unsubscribed from all updates`);
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
    }
  }

  public async unsubscribe(): Promise<void> {
    if (!this.connection || !this.isConnected) return;

    try {
      await this.connection.invoke("Unsubscribe");
      pendingSubscriptions = [];
      console.log(`Unsubscribed from all updates`);
    } catch (error) {
      console.error("Error unsubscribing:", error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    this.reconnectInterval = setTimeout(() => {
      this.connect();
    }, 5000) as unknown as number; // Retry every 5 seconds
  }

  onTradeReceived(callback: (trade: AMMTrade) => void): void {
    callbacksTrades.push(callback);
  }
  unsubscribeFromTradeUpdates(callback: (trade: AMMTrade) => void): void {
    callbacksTrades = callbacksTrades.filter((cb) => cb !== callback);
  }
  onLiquidityReceived(callback: (liquidity: AMMLiquidity) => void): void {
    callbacksLiquidity.push(callback);
  }
  unsubscribeFromLiquidityUpdates(
    callback: (liquidity: AMMLiquidity) => void
  ): void {
    callbacksLiquidity = callbacksLiquidity.filter((cb) => cb !== callback);
  }
  onPoolReceived(callback: (liquidity: Pool) => void): void {
    callbacksPools.push(callback);
  }
  unsubscribeFromPoolUpdates(callback: (liquidity: Pool) => void): void {
    callbacksPools = callbacksPools.filter((cb) => cb !== callback);
  }
  onBlockReceived(callback: (block: BiatecBlock) => void): void {
    callbacksBlocks.push(callback);
  }
  unsubscribeFromBlockUpdates(callback: (block: BiatecBlock) => void): void {
    callbacksBlocks = callbacksBlocks.filter((cb) => cb !== callback);
  }
  onAssetReceived(callback: (asset: BiatecAsset) => void): void {
    callbacksAssets.push(callback);
  }
  unsubscribeFromAssetUpdates(callback: (asset: BiatecAsset) => void): void {
    callbacksAssets = callbacksAssets.filter((cb) => cb !== callback);
  }
  onAggregatedPoolReceived(
    callback: (liquidity: AggregatedPool) => void
  ): void {
    callbacksAggregatedPools.push(callback);
  }
  unsubscribeFromAggregatedPoolUpdates(
    callback: (liquidity: AggregatedPool) => void
  ): void {
    callbacksAggregatedPools = callbacksAggregatedPools.filter(
      (cb) => cb !== callback
    );
  }

  async disconnect(): Promise<void> {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.isConnected = false;
    }
  }

  getConnectionState(): boolean {
    return this.isConnected;
  }
}

export const signalrService = new SignalRService();
