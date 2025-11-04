import algosdk from "algosdk";

class AlgorandService {
  private algodUrl = "https://algorand-algod-public.de-4.biatec.io";
  private indexerUrl = "https://mainnet-idx.algonode.cloud";
  private algodClient: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;

  constructor() {
    // Initialize Algorand SDK clients
    this.algodClient = new algosdk.Algodv2("", this.algodUrl, "");
    this.indexerClient = new algosdk.Indexer("", this.indexerUrl, "");
  }
  getAlgodClient(): algosdk.Algodv2 {
    return this.algodClient;
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

  async getBlockTransactions(
    round: bigint
  ): Promise<algosdk.indexerModels.Transaction[]> {
    try {
      const response = await this.indexerClient.lookupBlock(round).do();
      return (response.transactions ||
        []) as algosdk.indexerModels.Transaction[];
    } catch (error) {
      console.error("Error fetching block transactions:", error);
      return [];
    }
  }

  /**
   * Recursively search for a transaction by ID in a transaction and its inner transactions
   */
  private findTransactionRecursive(
    tx: algosdk.indexerModels.Transaction,
    targetTxId: string
  ): algosdk.indexerModels.Transaction | null {
    // Check if this is the transaction we're looking for
    if (tx.id === targetTxId) {
      return tx;
    }

    // Search through inner transactions recursively
    if (tx.innerTxns && tx.innerTxns.length > 0) {
      for (const innerTx of tx.innerTxns) {
        const found = this.findTransactionRecursive(innerTx, targetTxId);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  async getTransaction(
    txId: string,
    round?: number | bigint
  ): Promise<algosdk.indexerModels.Transaction | null> {
    try {
      const response = await this.indexerClient
        .lookupTransactionByID(txId)
        .do();

      const txData = response.transaction;

      if (!txData) {
        // If not found in indexer and we have a round number, search in the block
        if (round !== undefined) {
          console.log(
            `Transaction not found in indexer, searching in block ${round}`
          );
          return await this.findTransactionInBlock(txId, BigInt(round));
        }
        return null;
      }

      // Log the transaction data for debugging
      console.log("Transaction data from indexer:", txData);
      console.log("Transaction type:", txData.txType);

      return txData;
    } catch (error) {
      console.error("Error fetching transaction from indexer:", error);

      // If we have a round number, try searching in the block
      if (round !== undefined) {
        console.log(
          `Indexer failed, searching for transaction in block ${round}`
        );
        try {
          return await this.findTransactionInBlock(txId, BigInt(round));
        } catch (blockError) {
          console.error("Error searching in block:", blockError);
        }
      }

      // Fallback to API
      try {
        const apiUrl = `https://algorand-trades.de-4.biatec.io/api/trade?txId=${txId}&size=1`;
        const apiResponse = await fetch(apiUrl);

        if (!apiResponse.ok) {
          console.error(
            "Error fetching transaction from API:",
            apiResponse.statusText
          );
          return null;
        }

        const apiData = await apiResponse.json();

        if (apiData && apiData.length > 0) {
          const trade = apiData[0];
          // Convert trade data to algosdk.indexerModels.Transaction format
          // This is a simplified conversion - actual trade data from API may not have all tx details
          console.log("Found transaction in API trade data:", trade);

          // We should still fetch from indexer if we have the txId
          // The API trade endpoint doesn't return full transaction details
          // So we can't fully reconstruct the transaction from this
        }
      } catch (apiError) {
        console.error("Error fetching transaction from API:", apiError);
      }

      return null;
    }
  }

  /**
   * Search for a transaction in a specific block, including inner transactions
   */
  private async findTransactionInBlock(
    txId: string,
    round: bigint
  ): Promise<algosdk.indexerModels.Transaction | null> {
    try {
      const transactions = await this.getBlockTransactions(round);

      for (const tx of transactions) {
        // Use recursive search to check the transaction and all its inner transactions
        const found = this.findTransactionRecursive(tx, txId);
        if (found) {
          console.log(`Found transaction ${txId} in block ${round}`);
          return found;
        }
      }

      console.log(`Transaction ${txId} not found in block ${round}`);
      return null;
    } catch (error) {
      console.error(`Error searching for transaction in block ${round}:`, error);
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

  formatAlgoAmount(microAlgos: number | bigint): string {
    return (Number(microAlgos) / 1000000).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }

  formatAddress(address: string): string {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  formatTransactionId(txId: string): string {
    if (!txId) return "";
    return `${txId.slice(0, 12)}...${txId.slice(-12)}`;
  }
}

export const algorandService = new AlgorandService();
