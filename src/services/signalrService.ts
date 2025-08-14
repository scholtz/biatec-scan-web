import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
  HttpTransportType,
} from "@microsoft/signalr";
import type { AMMLiquidity, AMMTrade, AMMPool } from "../types/algorand";
import { generateAlgorandAccount } from "arc76";
import { uuidv7 } from "uuidv7";
import algosdk from "algosdk";
import { Buffer } from "buffer";
import { makeArc14AuthHeader, makeArc14TxWithSuggestedParams } from "arc14";
import { SuggestedParams } from "algosdk";
import { AMMAggregatedPool } from "../types/AMMAggregatedPool";
const callbacksTrades: ((trade: AMMTrade) => void)[] = [];
const callbacksLiquidity: ((liquidity: AMMLiquidity) => void)[] = [];
const callbacksPools: ((pool: AMMPool) => void)[] = [];
const callbacksAggregatedPools: ((pool: AMMAggregatedPool) => void)[] = [];
class SignalRService {
  private connection: HubConnection | null = null;
  private isConnected = false;
  private reconnectInterval: number | null = null;
  async getAuthToken(): Promise<string> {
    let session = "";
    try {
      const sessionLS = localStorage.getItem("session");
      if (sessionLS) session = sessionLS;
    } catch {
      console.log("session not found");
    }
    if (!session) {
      session = uuidv7();
      localStorage.setItem("session", session);
    }
    // Implement your logic to retrieve the authentication token
    const account: algosdk.Account = await generateAlgorandAccount(session);
    const params: SuggestedParams = {
      fee: 1000n,
      genesisHash: new Uint8Array(
        Buffer.from("wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=", "base64")
      ),
      genesisID: "mainnet-v1.0",
      lastValid: 46916880n,
      minFee: 1000n,
      flatFee: false,
      firstValid: 46915880n,
    };
    const tx = await makeArc14TxWithSuggestedParams(
      "BiatecScan#ARC14",
      account.addr.toString(),
      params
    );
    const signed = tx.signTxn(account.sk);
    const header = makeArc14AuthHeader(signed);
    return header;
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
          accessTokenFactory: async () => {
            return await this.getAuthToken();
          },
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
        // Re-subscribe after reconnection
        this.subscribeToTrades("");
      });

      this.connection.onclose(() => {
        console.log("SignalR connection closed");
        this.isConnected = false;
        this.scheduleReconnect();
      });

      // Handle subscription confirmation
      this.connection.on("Subscribed", (filter: string) => {
        console.log(`Subscription confirmed with filter: "${filter}"`);
      });
      this.connection.on("TestConnectionResult", (result: any) => {
        console.log(`Test connection result: `, result);
      });

      // Handle subscription errors
      this.connection.on("Error", (errorMessage: string) => {
        console.error("SignalR subscription error:", errorMessage);
      });

      // Handle subscription errors
      this.connection.on("FilteredTradeUpdated", (trade: any) => {
        //console.log("FilteredTradeUpdated received:", trade);
        callbacksTrades.forEach((callback) => callback(trade as AMMTrade));
      });
      this.connection.on("PoolUpdated", (pool: any) => {
        //console.log("PoolUpdated received:", pool);
        callbacksPools.forEach((callback) => callback(pool as AMMPool));
      });
      // Handle subscription errors
      this.connection.on("FilteredLiquidityUpdated", (liquidity: any) => {
        //console.log("FilteredLiquidityUpdated received:", liquidity);
        callbacksLiquidity.forEach((callback) =>
          callback(liquidity as AMMLiquidity)
        );
      });
      // Handle subscription errors
      this.connection.on("AggregatedPoolUpdated", (pool: any) => {
        var poolObj = pool as AMMAggregatedPool;
        console.log(
          "AggregatedPoolUpdated received:",
          poolObj.id,
          callbacksAggregatedPools.length,
          poolObj,
          pool
        );
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

  public async subscribeToTrades(filter: string = ""): Promise<void> {
    if (!this.connection || !this.isConnected) return;

    try {
      await this.connection.invoke("Subscribe", filter);
      console.log(`Subscribed to trades with filter: "${filter}"`);
    } catch (error) {
      console.error("Error subscribing to trades:", error);
    }
  }
  public async unsubscribeToTrades(filter: string = ""): Promise<void> {
    if (!this.connection || !this.isConnected) return;

    try {
      await this.connection.invoke("Unsubscribe", filter);
      console.log(`Unsubscribed from trades with filter: "${filter}"`);
    } catch (error) {
      console.error("Error unsubscribing from trades:", error);
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
  onLiquidityReceived(callback: (liquidity: AMMLiquidity) => void): void {
    callbacksLiquidity.push(callback);
  }
  onPoolReceived(callback: (liquidity: AMMPool) => void): void {
    callbacksPools.push(callback);
  }
  onAggregatedPoolReceived(
    callback: (liquidity: AMMAggregatedPool) => void
  ): void {
    callbacksAggregatedPools.push(callback);
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
