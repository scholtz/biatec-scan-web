export interface AlgorandBlock {
  round: number;
  timestamp: number;
  txns: number;
  'genesis-hash': string;
  'genesis-id': string;
  'previous-block-hash': string;
  seed: string;
  'txn-counter': number;
  'upgrade-state': any;
  'upgrade-vote': any;
}

export interface AlgorandTransaction {
  id: string;
  'confirmed-round': number;
  fee: number;
  'first-valid': number;
  'genesis-hash': string;
  'genesis-id': string;
  'intra-round-offset': number;
  'last-valid': number;
  'round-time': number;
  sender: string;
  'tx-type': string;
  signature: any;
  'payment-transaction'?: {
    amount: number;
    receiver: string;
  };
  'asset-transfer-transaction'?: {
    amount: number;
    'asset-id': number;
    receiver: string;
  };
  'application-transaction'?: {
    'application-id': number;
    'on-completion': string;
    'application-args': string[];
  };
}

export interface AMMTrade {
  id: string;
  timestamp: number;
  pool: string;
  assetA: string;
  assetB: string;
  amountA: number;
  amountB: number;
  price: number;
  type: 'buy' | 'sell';
  txId: string;
  sender: string;
}

export interface SearchResult {
  type: 'block' | 'transaction';
  data: AlgorandBlock | AlgorandTransaction;
}