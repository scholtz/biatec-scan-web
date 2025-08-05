import axios from 'axios';
import type { AlgorandBlock, AlgorandTransaction } from '../types/algorand';

class AlgorandService {
  private algodUrl = 'https://mainnet-api.algonode.cloud';
  private indexerUrl = 'https://mainnet-idx.algonode.cloud';

  async getLatestBlocks(limit: number = 20): Promise<AlgorandBlock[]> {
    try {
      const response = await axios.get(`${this.algodUrl}/v2/status`);
      const currentRound = response.data['last-round'];
      
      const blocks: AlgorandBlock[] = [];
      const startRound = Math.max(1, currentRound - limit + 1);
      
      for (let round = currentRound; round >= startRound; round--) {
        try {
          const blockResponse = await axios.get(`${this.algodUrl}/v2/blocks/${round}`);
          blocks.push({
            round,
            timestamp: blockResponse.data.block.ts || Date.now() / 1000,
            txns: blockResponse.data.block.txns?.length || 0,
            'genesis-hash': blockResponse.data.block.gh,
            'genesis-id': blockResponse.data.block.gen,
            'previous-block-hash': blockResponse.data.block.prev,
            seed: blockResponse.data.block.seed,
            'txn-counter': blockResponse.data.block.tc || 0,
            'upgrade-state': blockResponse.data.block.us,
            'upgrade-vote': blockResponse.data.block.uv
          });
        } catch (error) {
          console.warn(`Failed to fetch block ${round}:`, error);
        }
      }
      
      return blocks;
    } catch (error) {
      console.error('Error fetching latest blocks:', error);
      return [];
    }
  }

  async getBlock(round: number): Promise<AlgorandBlock | null> {
    try {
      const response = await axios.get(`${this.algodUrl}/v2/blocks/${round}`);
      return {
        round,
        timestamp: response.data.block.ts || Date.now() / 1000,
        txns: response.data.block.txns?.length || 0,
        'genesis-hash': response.data.block.gh,
        'genesis-id': response.data.block.gen,
        'previous-block-hash': response.data.block.prev,
        seed: response.data.block.seed,
        'txn-counter': response.data.block.tc || 0,
        'upgrade-state': response.data.block.us,
        'upgrade-vote': response.data.block.uv
      };
    } catch (error) {
      console.error('Error fetching block:', error);
      return null;
    }
  }

  async getBlockTransactions(round: number): Promise<AlgorandTransaction[]> {
    try {
      const response = await axios.get(`${this.indexerUrl}/v2/blocks/${round}/transactions`);
      return response.data.transactions || [];
    } catch (error) {
      console.error('Error fetching block transactions:', error);
      return [];
    }
  }

  async getTransaction(txId: string): Promise<AlgorandTransaction | null> {
    try {
      const response = await axios.get(`${this.indexerUrl}/v2/transactions/${txId}`);
      return response.data.transaction || null;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  async searchById(id: string): Promise<{ type: 'block' | 'transaction', data: any } | null> {
    // Try as block number first
    if (!isNaN(Number(id))) {
      const block = await this.getBlock(Number(id));
      if (block) {
        return { type: 'block', data: block };
      }
    }

    // Try as transaction ID
    const transaction = await this.getTransaction(id);
    if (transaction) {
      return { type: 'transaction', data: transaction };
    }

    return null;
  }

  formatAlgoAmount(microAlgos: number): string {
    return (microAlgos / 1000000).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  }

  formatTransactionId(txId: string): string {
    if (!txId) return '';
    return `${txId.slice(0, 12)}...${txId.slice(-12)}`;
  }
}

export const algorandService = new AlgorandService();