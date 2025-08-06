import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
} from "@microsoft/signalr";
import type { AMMTrade } from "../types/algorand";

class SignalRService {
  private connection: HubConnection | null = null;
  private isConnected = false;
  private reconnectInterval: number | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = new HubConnectionBuilder()
        .withUrl("wss://api.scan.biatec.io/tradehub") // Biatec scan API SignalR endpoint
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
      });

      this.connection.onclose(() => {
        console.log("SignalR connection closed");
        this.isConnected = false;
        this.scheduleReconnect();
      });

      await this.connection.start();
      this.isConnected = true;
      console.log("SignalR connected successfully");
    } catch (error) {
      console.error("Error connecting to SignalR:", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    this.reconnectInterval = setTimeout(() => {
      this.connect();
    }, 5000); // Retry every 5 seconds
  }

  onTradeReceived(callback: (trade: AMMTrade) => void): void {
    if (!this.connection) return;

    this.connection.on("TradeReceived", (trade: AMMTrade) => {
      callback(trade);
    });
  }

  onPoolUpdate(callback: (poolData: any) => void): void {
    if (!this.connection) return;

    this.connection.on("PoolUpdate", (poolData: any) => {
      callback(poolData);
    });
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
