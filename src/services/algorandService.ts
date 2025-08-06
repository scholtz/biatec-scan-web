import algosdk from "algosdk";
import type { AlgorandTransaction } from "../types/algorand";

class AlgorandService {
  private algodUrl = "https://mainnet-api.algonode.cloud";
  private indexerUrl = "https://mainnet-idx.algonode.cloud";
  private algodClient: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;

  constructor() {
    // Initialize Algorand SDK clients
    this.algodClient = new algosdk.Algodv2("", this.algodUrl, "");
    this.indexerClient = new algosdk.Indexer("", this.indexerUrl, "");
  }

  async getLatestBlocks(limit: number = 20): Promise<algosdk.BlockHeader[]> {
    try {
      // Get current status to find the latest round
      const status = await this.algodClient.status().do();
      const currentRound = status.lastRound;

      const blocks: algosdk.BlockHeader[] = [];
      const startRound = BigInt(Math.max(1, Number(currentRound) - limit + 1));

      // Use Promise.all for parallel requests to improve performance
      const blockPromises = [];
      for (let round = currentRound; round >= startRound; round--) {
        blockPromises.push(this.fetchSingleBlock(round));
      }

      const blockResults = await Promise.all(blockPromises);

      // Filter out null results and add to blocks array
      blockResults.forEach((block) => {
        if (block) {
          blocks.push(block);
        }
      });

      return blocks;
    } catch (error) {
      console.error("Error fetching latest blocks:", error);
      return [];
    }
  }

  private async fetchSingleBlock(
    round: bigint
  ): Promise<algosdk.BlockHeader | null> {
    try {
      const blockInfo = await this.algodClient.block(round).do();
      const block = blockInfo.block; // Cast to any to access raw properties

      return block.header;
    } catch (error) {
      console.warn(`Failed to fetch block ${round}:`, error);
      return null;
    }
  }

  async getBlock(round: bigint): Promise<algosdk.BlockHeader | null> {
    try {
      return await this.fetchSingleBlock(round);
    } catch (error) {
      console.error("Error fetching block:", error);
      return null;
    }
  }

  async getBlockTransactions(round: bigint): Promise<AlgorandTransaction[]> {
    try {
      const response = await this.indexerClient.lookupBlock(round).do();
      return (response.transactions || []) as unknown as AlgorandTransaction[];
    } catch (error) {
      console.error("Error fetching block transactions:", error);
      return [];
    }
  }

  async getTransaction(txId: string): Promise<AlgorandTransaction | null> {
    try {
      const response = await this.indexerClient
        .lookupTransactionByID(txId)
        .do();
      return (response.transaction || null) as unknown as AlgorandTransaction;
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return null;
    }
  }

  async searchById(
    id: string
  ): Promise<{ type: "block" | "transaction"; data: any } | null> {
    // Try as block number first
    if (!isNaN(Number(id))) {
      const block = await this.getBlock(BigInt(id));
      if (block) {
        return { type: "block", data: block };
      }
    }

    // Try as transaction ID
    const transaction = await this.getTransaction(id);
    if (transaction) {
      return { type: "transaction", data: transaction };
    }

    return null;
  }

  formatAlgoAmount(microAlgos: number): string {
    return (microAlgos / 1000000).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }

  formatAddress(address: string): string {
    if (!address) return "";
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  }

  formatTransactionId(txId: string): string {
    if (!txId) return "";
    return `${txId.slice(0, 12)}...${txId.slice(-12)}`;
  }
}

export const algorandService = new AlgorandService();
