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
   * Recursively search for a transaction by ID in a transaction and its inner transactions.
   * For inner transactions, recalculates the transaction ID after filling in missing parameters
   * from the parent transaction and block header.
   */
  private findTransactionRecursive(
    tx: algosdk.indexerModels.Transaction,
    targetTxId: string,
    blockHeader?: algosdk.BlockHeader
  ): algosdk.indexerModels.Transaction | null {
    // Check if this is the transaction we're looking for
    if (tx.id === targetTxId) {
      return tx;
    }

    // Search through inner transactions recursively
    if (tx.innerTxns && tx.innerTxns.length > 0) {
      for (const innerTx of tx.innerTxns) {
        // For inner transactions, we need to fill in parameters from parent and block
        // and recalculate the transaction ID
        const reconstructedInnerTx = this.reconstructInnerTransaction(
          innerTx,
          tx, // parent transaction
          blockHeader
        );

        // Calculate the proper transaction ID for the inner transaction
        const calculatedTxId = this.calculateTransactionId(
          reconstructedInnerTx,
          blockHeader
        );

        // Check if this inner transaction matches our target
        if (calculatedTxId === targetTxId) {
          // Update the transaction ID to the calculated one
          innerTx.id = calculatedTxId;
          return innerTx;
        }

        // Continue recursive search with the reconstructed inner transaction
        const found = this.findTransactionRecursive(
          reconstructedInnerTx,
          targetTxId,
          blockHeader
        );
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Reconstructs an inner transaction by filling in parameters from the parent transaction
   * and block header (genesisHash, genesisID, group)
   */
  private reconstructInnerTransaction(
    innerTx: algosdk.indexerModels.Transaction,
    parentTx: algosdk.indexerModels.Transaction,
    blockHeader?: algosdk.BlockHeader
  ): algosdk.indexerModels.Transaction {
    // Create a copy to avoid mutating the original
    const reconstructed = { ...innerTx } as algosdk.indexerModels.Transaction;

    // Fill in genesisHash and genesisID from block header if available
    if (blockHeader) {
      if (blockHeader.genesisHash && !reconstructed.genesisHash) {
        reconstructed.genesisHash = blockHeader.genesisHash;
      }
      if (blockHeader.genesisID && !reconstructed.genesisId) {
        reconstructed.genesisId = blockHeader.genesisID;
      }
    }

    // Fill in group from parent transaction
    if (parentTx.group && !reconstructed.group) {
      reconstructed.group = parentTx.group;
    }

    return reconstructed;
  }

  /**
   * Calculates the transaction ID from transaction data.
   * This follows the same logic as the Algorand SDK's txID() method.
   */
  private calculateTransactionId(
    tx: algosdk.indexerModels.Transaction,
    blockHeader?: algosdk.BlockHeader
  ): string {
    try {
      // Build suggested params from transaction and block data
      const suggestedParams: algosdk.SuggestedParams = {
        fee: Number(tx.fee || 0),
        minFee: 1000, // Minimum fee
        firstValid: Number(tx.firstValid || 0),
        lastValid: Number(tx.lastValid || 0),
        genesisID: tx.genesisId || blockHeader?.genesisID || "",
        genesisHash:
          tx.genesisHash || blockHeader?.genesisHash || new Uint8Array(),
      };

      let sdkTx: algosdk.Transaction | null = null;

      // Create transaction based on type
      switch (tx.txType) {
        case "pay":
          if (tx.paymentTransaction) {
            sdkTx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: tx.sender,
              receiver: tx.paymentTransaction.receiver,
              amount: BigInt(tx.paymentTransaction.amount || 0),
              closeRemainderTo: tx.paymentTransaction.closeRemainderTo,
              note: tx.note,
              lease: tx.lease,
              rekeyTo: tx.rekeyTo,
              suggestedParams,
            });
          }
          break;

        case "axfer":
          if (tx.assetTransferTransaction) {
            sdkTx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: tx.sender,
              receiver: tx.assetTransferTransaction.receiver,
              amount: BigInt(tx.assetTransferTransaction.amount || 0),
              assetIndex: Number(tx.assetTransferTransaction.assetId || 0),
              closeRemainderTo: tx.assetTransferTransaction.closeTo,
              assetSender: tx.assetTransferTransaction.sender,
              note: tx.note,
              lease: tx.lease,
              rekeyTo: tx.rekeyTo,
              suggestedParams,
            });
          }
          break;

        case "appl":
          if (tx.applicationTransaction) {
            sdkTx = algosdk.makeApplicationCallTxnFromObject({
              sender: tx.sender,
              appIndex: BigInt(tx.applicationTransaction.applicationId || 0),
              onComplete: Number(tx.applicationTransaction.onCompletion || 0),
              appArgs: tx.applicationTransaction.applicationArgs,
              accounts: tx.applicationTransaction.accounts,
              foreignApps: tx.applicationTransaction.foreignApps?.map((id) =>
                BigInt(id)
              ),
              foreignAssets: tx.applicationTransaction.foreignAssets?.map(
                (id) => BigInt(id)
              ),
              approvalProgram: tx.applicationTransaction.approvalProgram,
              clearProgram: tx.applicationTransaction.clearStateProgram,
              numGlobalInts:
                tx.applicationTransaction.globalStateSchema?.numUint,
              numGlobalByteSlices:
                tx.applicationTransaction.globalStateSchema?.numByteSlice,
              numLocalInts: tx.applicationTransaction.localStateSchema?.numUint,
              numLocalByteSlices:
                tx.applicationTransaction.localStateSchema?.numByteSlice,
              extraPages: tx.applicationTransaction.extraProgramPages,
              note: tx.note,
              lease: tx.lease,
              rekeyTo: tx.rekeyTo,
              suggestedParams,
            });
          }
          break;

        case "acfg":
          if (tx.assetConfigTransaction) {
            if (tx.assetConfigTransaction.assetId) {
              // Asset modification
              sdkTx = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
                sender: tx.sender,
                assetIndex: Number(tx.assetConfigTransaction.assetId),
                manager: tx.assetConfigTransaction.params?.manager,
                reserve: tx.assetConfigTransaction.params?.reserve,
                freeze: tx.assetConfigTransaction.params?.freeze,
                clawback: tx.assetConfigTransaction.params?.clawback,
                strictEmptyAddressChecking: false,
                note: tx.note,
                lease: tx.lease,
                rekeyTo: tx.rekeyTo,
                suggestedParams,
              });
            } else if (tx.assetConfigTransaction.params) {
              // Asset creation
              const params = tx.assetConfigTransaction.params;
              sdkTx = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
                sender: tx.sender,
                total: BigInt(params.total || 0),
                decimals: params.decimals || 0,
                defaultFrozen: params.defaultFrozen || false,
                manager: params.manager,
                reserve: params.reserve,
                freeze: params.freeze,
                clawback: params.clawback,
                unitName: params.unitName,
                assetName: params.name,
                assetURL: params.url,
                assetMetadataHash: params.metadataHash,
                note: tx.note,
                lease: tx.lease,
                rekeyTo: tx.rekeyTo,
                suggestedParams,
              });
            }
          }
          break;

        case "afrz":
          if (tx.assetFreezeTransaction) {
            sdkTx = algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
              sender: tx.sender,
              assetIndex: Number(tx.assetFreezeTransaction.assetId),
              freezeTarget: tx.assetFreezeTransaction.address,
              frozen: tx.assetFreezeTransaction.newFreezeStatus,
              note: tx.note,
              lease: tx.lease,
              rekeyTo: tx.rekeyTo,
              suggestedParams,
            });
          }
          break;

        case "keyreg":
          if (tx.keyregTransaction) {
            sdkTx = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(
              {
                sender: tx.sender,
                voteKey: tx.keyregTransaction.voteParticipationKey,
                selectionKey: tx.keyregTransaction.selectionParticipationKey,
                stateProofKey: tx.keyregTransaction.stateProofKey,
                voteFirst: tx.keyregTransaction.voteFirstValid
                  ? BigInt(tx.keyregTransaction.voteFirstValid)
                  : undefined,
                voteLast: tx.keyregTransaction.voteLastValid
                  ? BigInt(tx.keyregTransaction.voteLastValid)
                  : undefined,
                voteKeyDilution: tx.keyregTransaction.voteKeyDilution
                  ? BigInt(tx.keyregTransaction.voteKeyDilution)
                  : undefined,
                nonParticipation: tx.keyregTransaction.nonParticipation,
                note: tx.note,
                lease: tx.lease,
                rekeyTo: tx.rekeyTo,
                suggestedParams,
              }
            );
          }
          break;
      }

      if (sdkTx) {
        // Set the group if present
        if (tx.group) {
          sdkTx.group = tx.group;
        }

        // Calculate and return the transaction ID
        return sdkTx.txID();
      }

      // Fall back to original ID if we couldn't create the transaction
      return tx.id || "";
    } catch (error) {
      console.error("Error calculating transaction ID:", error, tx);
      // Fall back to the original ID if calculation fails
      return tx.id || "";
    }
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
   * Search for a transaction in a specific block, including inner transactions.
   * Properly reconstructs inner transactions with parameters from parent and block header.
   */
  private async findTransactionInBlock(
    txId: string,
    round: bigint
  ): Promise<algosdk.indexerModels.Transaction | null> {
    try {
      // Get both block header and transactions
      const [blockHeader, transactions] = await Promise.all([
        this.getBlock(round),
        this.getBlockTransactions(round),
      ]);

      for (const tx of transactions) {
        // Use recursive search with block header to properly calculate inner transaction IDs
        const found = this.findTransactionRecursive(
          tx,
          txId,
          blockHeader || undefined
        );
        if (found) {
          console.log(`Found transaction ${txId} in block ${round}`);
          return found;
        }
      }

      console.log(`Transaction ${txId} not found in block ${round}`);
      return null;
    } catch (error) {
      console.error(
        `Error searching for transaction in block ${round}:`,
        error
      );
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
