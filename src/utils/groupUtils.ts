import algosdk from "algosdk";

/**
 * Helpers for working with transaction groups. Group ids are 32 raw bytes;
 * they are displayed in base64 (the canonical Algorand representation) but
 * routed in hex, since base64 contains `/` and `+` which don't survive URL
 * path segments well.
 */

export function groupBytesToBase64(group: Uint8Array): string {
  return algosdk.bytesToBase64(group);
}

export function groupBytesToHex(group: Uint8Array): string {
  return algosdk.bytesToHex(group);
}

export function groupHexToBase64(hex: string): string {
  return algosdk.bytesToBase64(algosdk.hexToBytes(hex));
}

/** Route location for the group page of a transaction group. */
export function groupRoute(
  round: bigint | number | string,
  group: Uint8Array
): { name: string; params: { round: string; groupId: string } } {
  return {
    name: "GroupDetails",
    params: { round: round.toString(), groupId: groupBytesToHex(group) },
  };
}

/** A transaction that belongs to the requested group. */
export interface GroupMember {
  tx: algosdk.indexerModels.Transaction;
  /** Top-level transaction id used for routing (inner txns have no own id). */
  rootTxId: string;
  /** 0-based inner path ("0/2") for routing, or null for top-level txns. */
  innerPath: string | null;
}

/**
 * Finds all transactions in a block that belong to the given group id
 * (base64). Searches top-level transactions and, to support inner
 * transaction groups, recurses into inner transactions of non-matching
 * parents. A matching transaction's own inner transactions are its children
 * and are not searched further.
 */
export function collectGroupMembers(
  transactions: algosdk.indexerModels.Transaction[],
  groupBase64: string
): GroupMember[] {
  const members: GroupMember[] = [];

  const visit = (
    tx: algosdk.indexerModels.Transaction,
    rootTxId: string,
    path: number[]
  ) => {
    const txGroup = tx.group ? algosdk.bytesToBase64(tx.group) : null;
    if (txGroup === groupBase64) {
      members.push({
        tx,
        rootTxId,
        innerPath: path.length > 0 ? path.join("/") : null,
      });
      return;
    }
    tx.innerTxns?.forEach((inner, i) => visit(inner, rootTxId, [...path, i]));
  };

  for (const tx of transactions) {
    if (tx.id) {
      visit(tx, tx.id, []);
    }
  }
  return members;
}

/**
 * One display row of the group's transaction tree: either a group member
 * (top-level row) or one of its inner transactions at any nesting depth.
 */
export interface GroupTxRow {
  tx: algosdk.indexerModels.Transaction;
  rootTxId: string;
  /** 0-based inner path for routing, or null for a top-level transaction. */
  innerPath: string | null;
  /** Display label: "" for top-level rows (show the tx id), else "inner/1/2" (1-based). */
  label: string;
  key: string;
  parentKey: string | null;
  depth: number;
  hasChildren: boolean;
}

/** Flattens group members and all their inner transactions into display rows. */
export function buildGroupRows(members: GroupMember[]): GroupTxRow[] {
  const rows: GroupTxRow[] = [];

  const walk = (
    tx: algosdk.indexerModels.Transaction,
    rootTxId: string,
    path: number[],
    parentKey: string | null,
    depth: number
  ) => {
    const innerPath = path.length > 0 ? path.join("/") : null;
    const key = `${rootTxId}:${innerPath ?? ""}`;
    const label =
      path.length > 0 ? `inner/${path.map((i) => i + 1).join("/")}` : "";
    const hasChildren = (tx.innerTxns?.length ?? 0) > 0;
    rows.push({
      tx,
      rootTxId,
      innerPath,
      label,
      key,
      parentKey,
      depth,
      hasChildren,
    });
    tx.innerTxns?.forEach((inner, i) =>
      walk(inner, rootTxId, [...path, i], key, depth + 1)
    );
  };

  for (const member of members) {
    const basePath =
      member.innerPath !== null
        ? member.innerPath.split("/").map(Number)
        : [];
    walk(member.tx, member.rootTxId, basePath, null, 0);
  }
  return rows;
}

/** Route location for a row's transaction detail page. */
export function rowTxRoute(row: {
  rootTxId: string;
  innerPath: string | null;
}):
  | { name: "TransactionDetails"; params: { txId: string } }
  | {
      name: "InnerTransactionDetails";
      params: { txId: string; innerPath: string };
    } {
  if (row.innerPath === null) {
    return { name: "TransactionDetails", params: { txId: row.rootTxId } };
  }
  return {
    name: "InnerTransactionDetails",
    params: { txId: row.rootTxId, innerPath: row.innerPath },
  };
}
