import algosdk from "algosdk";
import { algorandService } from "./algorandService";
import { classifySearchQuery } from "../utils/searchQuery";

export interface ChainAssetHit {
  id: bigint;
  name: string;
  unitName: string;
  decimals: number;
  creator: string;
}

export interface ChainApplicationHit {
  id: bigint;
  creator: string;
}

export interface ChainBlockHit {
  round: bigint;
  timestamp: bigint;
  txnCount: number;
}

export interface ChainAccountHit {
  address: string;
  amount: bigint;
  totalAssetsOptedIn: number;
  totalAppsOptedIn: number;
  totalCreatedAssets: number;
  totalCreatedApps: number;
}

export interface ChainTransactionHit {
  txId: string;
  round: bigint;
  txType: string;
  sender: string;
}

/**
 * Entities that exist on-chain (per algod/indexer) for a search query. Each
 * slot is `null` when the query cannot be that kind of entity or when the
 * node reports it does not exist. Every probe is best-effort: a network or
 * node failure is treated as "not found" so backend search results still
 * render.
 */
export interface ChainSearchHits {
  asset: ChainAssetHit | null;
  application: ChainApplicationHit | null;
  block: ChainBlockHit | null;
  account: ChainAccountHit | null;
  transaction: ChainTransactionHit | null;
}

export const EMPTY_CHAIN_HITS: ChainSearchHits = Object.freeze({
  asset: null,
  application: null,
  block: null,
  account: null,
  transaction: null,
});

export function countChainHits(hits: ChainSearchHits): number {
  return [
    hits.asset,
    hits.application,
    hits.block,
    hits.account,
    hits.transaction,
  ].filter((hit) => hit !== null).length;
}

async function probeAsset(
  algod: algosdk.Algodv2,
  id: bigint
): Promise<ChainAssetHit | null> {
  try {
    const asset = await algod.getAssetByID(id).do();
    if (!asset.params) return null;
    return {
      id: asset.index,
      name: asset.params.name ?? "",
      unitName: asset.params.unitName ?? "",
      decimals: Number(asset.params.decimals),
      creator: asset.params.creator,
    };
  } catch {
    return null;
  }
}

async function probeApplication(
  algod: algosdk.Algodv2,
  id: bigint
): Promise<ChainApplicationHit | null> {
  try {
    const app = await algod.getApplicationByID(id).do();
    if (!app.params) return null;
    return { id: app.id, creator: app.params.creator.toString() };
  } catch {
    return null;
  }
}

async function probeBlock(
  algod: algosdk.Algodv2,
  round: bigint
): Promise<ChainBlockHit | null> {
  try {
    const response = await algod.block(round).do();
    return {
      round: response.block.header.round,
      timestamp: response.block.header.timestamp,
      txnCount: response.block.payset.length,
    };
  } catch {
    return null;
  }
}

async function probeAccount(
  algod: algosdk.Algodv2,
  address: string
): Promise<ChainAccountHit | null> {
  try {
    const account = await algod.accountInformation(address).do();
    return {
      address: account.address,
      amount: account.amount,
      totalAssetsOptedIn: Number(account.totalAssetsOptedIn),
      totalAppsOptedIn: Number(account.totalAppsOptedIn),
      totalCreatedAssets: Number(account.totalCreatedAssets),
      totalCreatedApps: Number(account.totalCreatedApps),
    };
  } catch {
    return null;
  }
}

async function probeTransaction(
  txId: string
): Promise<ChainTransactionHit | null> {
  const tx = await algorandService.getTransaction(txId);
  if (!tx || !tx.id) return null;
  return {
    txId: tx.id,
    round: tx.confirmedRound ?? BigInt(0),
    txType: tx.txType ?? "",
    sender: tx.sender ?? "",
  };
}

/**
 * Looks the query up directly on the network. A numeric query is probed as
 * asset id, application id and round in parallel because the same number can
 * legitimately be all three; address and transaction shaped queries are
 * probed as that single kind.
 */
export async function probeChain(query: string): Promise<ChainSearchHits> {
  const q = query.trim();
  const algod = algorandService.getAlgodClient();
  const hits: ChainSearchHits = { ...EMPTY_CHAIN_HITS };

  switch (classifySearchQuery(q)) {
    case "numeric": {
      const id = BigInt(q);
      [hits.asset, hits.application, hits.block] = await Promise.all([
        probeAsset(algod, id),
        probeApplication(algod, id),
        probeBlock(algod, id),
      ]);
      break;
    }
    case "address":
      hits.account = await probeAccount(algod, q);
      break;
    case "transaction":
      hits.transaction = await probeTransaction(q);
      break;
    case "text":
      break;
  }

  return hits;
}
