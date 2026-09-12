import algosdk from "algosdk";
import { algorandService } from "./algorandService";
import {
  accountHasChainState,
  classifySearchQuery,
} from "../utils/searchQuery";

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
  /** Null while the transaction is still pending (not yet confirmed). */
  round: bigint | null;
  txType: string;
  sender: string;
}

/**
 * Entities that exist on-chain (per algod/indexer) for a search query. Each
 * slot is `null` when the query cannot be that kind of entity or when the
 * node reports it does not exist. Every probe is best-effort: a network or
 * node failure is logged and treated as "not found" so backend search
 * results still render.
 */
export interface ChainSearchHits {
  asset: ChainAssetHit | null;
  application: ChainApplicationHit | null;
  block: ChainBlockHit | null;
  account: ChainAccountHit | null;
  transaction: ChainTransactionHit | null;
}

export function emptyChainHits(): ChainSearchHits {
  return {
    asset: null,
    application: null,
    block: null,
    account: null,
    transaction: null,
  };
}

/** True when the failed request was a plain "does not exist" answer. */
function isNotFound(error: unknown): boolean {
  // algosdk throws URLTokenBaseHTTPError, whose shape isn't exported as a
  // type guard; we only need the numeric status off it.
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

async function probe<T>(
  label: string,
  request: () => Promise<T | null>
): Promise<T | null> {
  try {
    return await request();
  } catch (e: unknown) {
    if (!isNotFound(e)) {
      console.warn(`Chain probe (${label}) failed:`, e);
    }
    return null;
  }
}

function probeAsset(
  algod: algosdk.Algodv2,
  id: bigint
): Promise<ChainAssetHit | null> {
  return probe("asset", async () => {
    const asset = await algod.getAssetByID(id).do();
    if (!asset.params) return null;
    return {
      id: asset.index,
      name: asset.params.name ?? "",
      unitName: asset.params.unitName ?? "",
      decimals: Number(asset.params.decimals),
      creator: asset.params.creator,
    };
  });
}

function probeApplication(
  algod: algosdk.Algodv2,
  id: bigint
): Promise<ChainApplicationHit | null> {
  return probe("application", async () => {
    const app = await algod.getApplicationByID(id).do();
    if (!app.params) return null;
    return { id: app.id, creator: app.params.creator.toString() };
  });
}

function probeBlock(
  algod: algosdk.Algodv2,
  round: bigint
): Promise<ChainBlockHit | null> {
  return probe("block", async () => {
    // Header only: the full block would pull every transaction in the
    // round just to read two fields.
    const response = await algod.block(round).headerOnly(true).do();
    return {
      round: response.block.header.round,
      timestamp: response.block.header.timestamp,
    };
  });
}

function probeAccount(
  algod: algosdk.Algodv2,
  address: string
): Promise<ChainAccountHit | null> {
  return probe("account", async () => {
    const account = await algod.accountInformation(address).do();
    const hit: ChainAccountHit = {
      address: account.address,
      amount: account.amount,
      totalAssetsOptedIn: Number(account.totalAssetsOptedIn),
      totalAppsOptedIn: Number(account.totalAppsOptedIn),
      totalCreatedAssets: Number(account.totalCreatedAssets),
      totalCreatedApps: Number(account.totalCreatedApps),
    };
    return accountHasChainState(hit) ? hit : null;
  });
}

/**
 * Transactions are the one probe that needs the indexer: algod only keeps
 * pending and very recently confirmed transactions in memory, so a
 * historical tx id can't be resolved from a node alone.
 */
function probeTransaction(
  indexer: algosdk.Indexer,
  txId: string
): Promise<ChainTransactionHit | null> {
  return probe("transaction", async () => {
    const response = await indexer.lookupTransactionByID(txId).do();
    const tx = response.transaction;
    if (!tx.id) return null;
    return {
      txId: tx.id,
      round: tx.confirmedRound ?? null,
      txType: tx.txType ?? "",
      sender: tx.sender ?? "",
    };
  });
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
  const empty = emptyChainHits();

  switch (classifySearchQuery(q)) {
    case "numeric": {
      const id = BigInt(q);
      const [asset, application, block] = await Promise.all([
        probeAsset(algod, id),
        probeApplication(algod, id),
        probeBlock(algod, id),
      ]);
      return { ...empty, asset, application, block };
    }
    case "address":
      return { ...empty, account: await probeAccount(algod, q) };
    case "transaction":
      return {
        ...empty,
        transaction: await probeTransaction(
          algorandService.getIndexerClient(),
          q
        ),
      };
    default:
      return empty;
  }
}
