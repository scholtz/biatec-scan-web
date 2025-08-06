export interface AlgorandTransaction {
  id: string;
  "confirmed-round": number;
  fee: number;
  "first-valid": number;
  "genesis-hash": string;
  "genesis-id": string;
  "intra-round-offset": number;
  "last-valid": number;
  "round-time": number;
  sender: string;
  "tx-type": string;
  signature: any;
  "payment-transaction"?: {
    amount: number;
    receiver: string;
  };
  "asset-transfer-transaction"?: {
    amount: number;
    "asset-id": number;
    receiver: string;
  };
  "application-transaction"?: {
    "application-id": number;
    "on-completion": string;
    "application-args": string[];
  };
}

export interface AMMTrade {
  assetIdIn: number;
  assetIdOut: number;
  assetAmountIn: number;
  assetAmountOut: number;
  txId: string;
  blockId: number;
  txGroup: string;
  timestamp: string;
  protocol: string;
  trader: string;
  poolAddress: string;
  poolAppId: number;
  topTxId: string;
  tradeState: string;
}

export interface SearchResult {
  type: "block" | "transaction";
  data: AlgorandTransaction;
}
