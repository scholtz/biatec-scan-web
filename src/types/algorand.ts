import type { DEXProtocol } from "../api/models/dEXProtocol";
import type { TxState } from "../api/models/txState";
import type { LiquidityDirection } from "../api/models/liquidityDirection";

/** A raw base64-encoded Ed25519/multisig/logicsig signature blob. */
export type AlgorandTransactionSignature = {
  sig?: string;
  logicsig?: { logic: string; args?: string[]; signature?: string };
  multisig?: {
    version: number;
    threshold: number;
    subsignature: { "public-key": string; signature?: string }[];
  };
};

/** Decoded state-proof message/proof payload attached to a state-proof transaction. */
export type AlgorandStateProofMessage = {
  "block-headers-commitment"?: string;
  "first-attested-round"?: number;
  "last-attested-round"?: number;
  "ln-proven-weight"?: number;
  "voters-commitment"?: string;
};
export type AlgorandStateProof = {
  // These three are opaque Merkle-proof structures (nested vectors of
  // hashes/reveals) that this app never inspects — it only ever displays
  // that a state-proof transaction occurred, so `unknown` avoids pretending
  // to a shape nothing here reads.
  "part-proofs"?: unknown;
  "positions-to-reveal"?: number[];
  "reveals"?: unknown;
  "salt-version"?: number;
  "sig-commit"?: string;
  "sig-proofs"?: unknown;
  "signed-weight"?: number;
};

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
  signature: AlgorandTransactionSignature;
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
  "state-proof-transaction"?: {
    message?: AlgorandStateProofMessage;
    "state-proof"?: AlgorandStateProof;
    "state-proof-type"?: number;
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
  reserve?: string;
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
  protocol: DEXProtocol;
  timestamp?: string; // ISO string, or Date if you prefer
  isReversed: boolean;
}
export interface AMMTrade {
  assetIdIn: bigint;
  assetIdOut: bigint;
  assetAmountIn: number;
  assetAmountOut: number;
  /** Optional enrichment fields from Trade Reporter API */
  valueUSD?: number | null;
  priceAssetInUSD?: number | null;
  priceAssetOutUSD?: number | null;
  feesUSD?: number | null;
  feesUSDProvider?: number | null;
  feesUSDProtocol?: number | null;
  txId: string;
  blockId: bigint;
  txGroup: string;
  timestamp: string;
  protocol: DEXProtocol;
  trader: string;
  poolAddress: string;
  poolAppId: bigint;
  topTxId: string;
  tradeState: TxState;
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
  protocol: DEXProtocol;
  liquidityProvider: string;
  poolAddress: string;
  poolAppId: number;
  topTxId: string;
  txState: TxState;
  direction: LiquidityDirection;
  a: number;
  b: number;
  l: number;
}

export interface SearchResult {
  type: "block" | "transaction";
  data: AlgorandTransaction;
}
