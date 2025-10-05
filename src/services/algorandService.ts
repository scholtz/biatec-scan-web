import algosdk from "algosdk";
import type { AlgorandTransaction } from "../types/algorand";

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
      
      const txData = response.transaction;
      
      if (!txData) {
        return null;
      }
      
      // Log the transaction data for debugging
      console.log("Transaction data from indexer:", txData);
      console.log("Transaction type:", txData.txType);
      
      // Map algosdk's camelCase properties to our kebab-case interface
      const transaction: AlgorandTransaction = {
        id: txData.id || txId,
        "confirmed-round": Number(txData.confirmedRound) || 0,
        fee: Number(txData.fee) || 0,
        "first-valid": Number(txData.firstValid) || 0,
        "genesis-hash": typeof txData.genesisHash === 'string' ? txData.genesisHash : 
          (txData.genesisHash ? Buffer.from(txData.genesisHash).toString('base64') : ""),
        "genesis-id": txData.genesisId || "",
        "intra-round-offset": Number(txData.intraRoundOffset) || 0,
        "last-valid": Number(txData.lastValid) || 0,
        "round-time": Number(txData.roundTime) || 0,
        sender: txData.sender || "",
        "tx-type": txData.txType || "",
        signature: txData.signature || {},
        note: txData.note ? Buffer.from(txData.note).toString('base64') : undefined,
        "payment-transaction": txData.paymentTransaction ? {
          amount: Number(txData.paymentTransaction.amount) || 0,
          receiver: txData.paymentTransaction.receiver || "",
          "close-remainder-to": txData.paymentTransaction.closeRemainderTo || undefined,
        } : undefined,
        "asset-transfer-transaction": txData.assetTransferTransaction ? {
          amount: Number(txData.assetTransferTransaction.amount) || 0,
          "asset-id": Number(txData.assetTransferTransaction.assetId) || 0,
          receiver: txData.assetTransferTransaction.receiver || "",
          "close-to": txData.assetTransferTransaction.closeTo || undefined,
          sender: txData.assetTransferTransaction.sender || undefined,
        } : undefined,
        "application-transaction": txData.applicationTransaction ? {
          "application-id": Number(txData.applicationTransaction.applicationId) || 0,
          "on-completion": txData.applicationTransaction.onCompletion || "",
          "application-args": txData.applicationTransaction.applicationArgs?.map((arg: Uint8Array) => 
            Buffer.from(arg).toString('base64')
          ) || undefined,
          accounts: txData.applicationTransaction.accounts?.map((addr: any) => String(addr)) || undefined,
          "foreign-apps": txData.applicationTransaction.foreignApps?.map((id: bigint) => Number(id)) || undefined,
          "foreign-assets": txData.applicationTransaction.foreignAssets?.map((id: bigint) => Number(id)) || undefined,
          "approval-program": txData.applicationTransaction.approvalProgram ? 
            Buffer.from(txData.applicationTransaction.approvalProgram).toString('base64') : undefined,
          "clear-state-program": txData.applicationTransaction.clearStateProgram ? 
            Buffer.from(txData.applicationTransaction.clearStateProgram).toString('base64') : undefined,
          "global-state-schema": txData.applicationTransaction.globalStateSchema ? {
            "num-uint": Number(txData.applicationTransaction.globalStateSchema.numUint) || 0,
            "num-byte-slice": Number(txData.applicationTransaction.globalStateSchema.numByteSlice) || 0,
          } : undefined,
          "local-state-schema": txData.applicationTransaction.localStateSchema ? {
            "num-uint": Number(txData.applicationTransaction.localStateSchema.numUint) || 0,
            "num-byte-slice": Number(txData.applicationTransaction.localStateSchema.numByteSlice) || 0,
          } : undefined,
          "extra-program-pages": txData.applicationTransaction.extraProgramPages || undefined,
        } : undefined,
        "asset-config-transaction": txData.assetConfigTransaction ? {
          "asset-id": Number(txData.assetConfigTransaction.assetId) || undefined,
          params: txData.assetConfigTransaction.params ? {
            creator: txData.assetConfigTransaction.params.creator || undefined,
            total: Number(txData.assetConfigTransaction.params.total) || undefined,
            decimals: txData.assetConfigTransaction.params.decimals || undefined,
            "default-frozen": txData.assetConfigTransaction.params.defaultFrozen || undefined,
            "unit-name": txData.assetConfigTransaction.params.unitName || undefined,
            name: txData.assetConfigTransaction.params.name || undefined,
            url: txData.assetConfigTransaction.params.url || undefined,
            "metadata-hash": txData.assetConfigTransaction.params.metadataHash ? 
              Buffer.from(txData.assetConfigTransaction.params.metadataHash).toString('base64') : undefined,
            manager: txData.assetConfigTransaction.params.manager || undefined,
            reserve: txData.assetConfigTransaction.params.reserve || undefined,
            freeze: txData.assetConfigTransaction.params.freeze || undefined,
            clawback: txData.assetConfigTransaction.params.clawback || undefined,
          } : undefined,
        } : undefined,
        "asset-freeze-transaction": txData.assetFreezeTransaction ? {
          address: txData.assetFreezeTransaction.address || "",
          "asset-id": Number(txData.assetFreezeTransaction.assetId) || 0,
          "new-freeze-status": txData.assetFreezeTransaction.newFreezeStatus || false,
        } : undefined,
        "keyreg-transaction": txData.keyregTransaction ? {
          "non-participation": txData.keyregTransaction.nonParticipation || undefined,
          "vote-key-dilution": Number(txData.keyregTransaction.voteKeyDilution) || undefined,
          "vote-first-valid": Number(txData.keyregTransaction.voteFirstValid) || undefined,
          "vote-last-valid": Number(txData.keyregTransaction.voteLastValid) || undefined,
          "vote-participation-key": txData.keyregTransaction.voteParticipationKey ? 
            Buffer.from(txData.keyregTransaction.voteParticipationKey).toString('base64') : undefined,
          "selection-participation-key": txData.keyregTransaction.selectionParticipationKey ? 
            Buffer.from(txData.keyregTransaction.selectionParticipationKey).toString('base64') : undefined,
          "state-proof-key": txData.keyregTransaction.stateProofKey ? 
            Buffer.from(txData.keyregTransaction.stateProofKey).toString('base64') : undefined,
        } : undefined,
        "state-proof-transaction": txData.stateProofTransaction ? {
          message: txData.stateProofTransaction.message || undefined,
          "state-proof": txData.stateProofTransaction.stateProof || undefined,
          "state-proof-type": txData.stateProofTransaction.stateProofType || undefined,
        } : undefined,
        "close-rewards": Number(txData.closeRewards) || undefined,
        "closing-amount": Number(txData.closingAmount) || undefined,
        "receiver-rewards": Number(txData.receiverRewards) || undefined,
        "sender-rewards": Number(txData.senderRewards) || undefined,
      };
      
      return transaction;
    } catch (error) {
      console.error("Error fetching transaction from indexer:", error);
      
      // Fallback to API
      try {
        const apiUrl = `https://algorand-trades.de-4.biatec.io/api/trade?txId=${txId}&size=1`;
        const apiResponse = await fetch(apiUrl);
        
        if (!apiResponse.ok) {
          console.error("Error fetching transaction from API:", apiResponse.statusText);
          return null;
        }
        
        const apiData = await apiResponse.json();
        
        if (apiData && apiData.length > 0) {
          const trade = apiData[0];
          // Convert trade data to AlgorandTransaction format
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
