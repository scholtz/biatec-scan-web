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
  note?: string;
  "payment-transaction"?: {
    amount: number;
    receiver: string;
    "close-remainder-to"?: string;
  };
  "asset-transfer-transaction"?: {
    amount: number;
    "asset-id": number;
    receiver: string;
    "close-to"?: string;
    sender?: string;
  };
  "application-transaction"?: {
    "application-id": number;
    "on-completion": string;
    "application-args"?: string[];
    accounts?: string[];
    "foreign-apps"?: number[];
    "foreign-assets"?: number[];
    "approval-program"?: string;
    "clear-state-program"?: string;
    "global-state-schema"?: {
      "num-uint": number;
      "num-byte-slice": number;
    };
    "local-state-schema"?: {
      "num-uint": number;
      "num-byte-slice": number;
    };
    "extra-program-pages"?: number;
  };
  "asset-config-transaction"?: {
    "asset-id"?: number;
    params?: {
      creator?: string;
      total?: number;
      decimals?: number;
      "default-frozen"?: boolean;
      "unit-name"?: string;
      name?: string;
      url?: string;
      "metadata-hash"?: string;
      manager?: string;
      reserve?: string;
      freeze?: string;
      clawback?: string;
    };
  };
  "asset-freeze-transaction"?: {
    address: string;
    "asset-id": number;
    "new-freeze-status": boolean;
  };
  "keyreg-transaction"?: {
    "non-participation"?: boolean;
    "vote-key-dilution"?: number;
    "vote-first-valid"?: number;
    "vote-last-valid"?: number;
    "vote-participation-key"?: string;
    "selection-participation-key"?: string;
    "state-proof-key"?: string;
  };
  "close-rewards"?: number;
  "closing-amount"?: number;
  "receiver-rewards"?: number;
  "sender-rewards"?: number;
}
export interface AssetParams {
  name: string;
  unitName: string;
  total: number;
  decimals: number;
}
export interface AMMPool {
  poolAddress: string;
  poolAppId: bigint;
  assetIdA?: bigint;
  assetIdB?: bigint;
  assetIdLP?: bigint;
  a?: bigint;
  b?: bigint;
  l?: bigint;
  protocol: string; // Replace with enum if DEXProtocol is defined
  timestamp?: string; // ISO string, or Date if you prefer
  isReversed: boolean;
}
export interface AMMTrade {
  assetIdIn: bigint;
  assetIdOut: bigint;
  assetAmountIn: number;
  assetAmountOut: number;
  txId: string;
  blockId: bigint;
  txGroup: string;
  timestamp: string;
  protocol: string;
  trader: string;
  poolAddress: string;
  poolAppId: bigint;
  topTxId: string;
  tradeState: string;
}

export interface AMMLiquidity {
  assetIdA: number;
  assetIdB: number;
  assetIdLP: number;
  assetAmountA: number;
  assetAmountB: number;
  assetAmountLP: number;
  txId: string;
  blockId: number;
  txGroup: string;
  timestamp: string;
  protocol: string;
  liquidityProvider: string;
  poolAddress: string;
  poolAppId: number;
  topTxId: string;
  txState: string;
  direction: string;
  a: number;
  b: number;
  l: number;
}

export interface SearchResult {
  type: "block" | "transaction";
  data: AlgorandTransaction;
}
