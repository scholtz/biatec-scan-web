import algosdk from "algosdk";
import type { Arc56Contract, Arc56Method, Arc56StructField } from "../types/arc56";

// ARC-4 reference types: encoded as a single uint8 index into accounts/foreignApps/foreignAssets.
const REFERENCE_TYPES = new Set(["account", "application", "asset"]);
// ARC-4 transaction types: consume a preceding transaction in the group, not an app-arg slot.
const TRANSACTION_TYPES = new Set([
  "txn",
  "pay",
  "keyreg",
  "acfg",
  "axfer",
  "afrz",
  "appl",
]);

export function isReferenceType(type: string): boolean {
  return REFERENCE_TYPES.has(type);
}

export function isTransactionType(type: string): boolean {
  return TRANSACTION_TYPES.has(type);
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 hex digest of raw bytes, via the browser's native WebCrypto (no extra hashing dependency). */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Re-wrap in a plain ArrayBuffer-backed view: TS's BufferSource type rejects the
  // ArrayBufferLike (possibly SharedArrayBuffer) backing that Uint8Array carries generically.
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return toHex(new Uint8Array(digest));
}

/**
 * Expands an ARC-56 type reference (which may name a struct, possibly array-suffixed) into a
 * raw ABI-4 type string algosdk's ABIType/ABIMethod can parse. Reference types (account/asset/
 * application) and transaction types pass through unchanged - they are not struct names.
 */
export function resolveArc56Type(
  typeStr: string,
  structs: Record<string, Arc56StructField[]> | undefined,
  seen: string[] = []
): string {
  const arrayMatch = typeStr.match(/^(.+?)((?:\[\d*\])+)$/);
  if (arrayMatch) {
    return resolveArc56Type(arrayMatch[1], structs, seen) + arrayMatch[2];
  }

  const struct = structs?.[typeStr];
  if (!struct) {
    return typeStr;
  }
  if (seen.includes(typeStr)) {
    throw new Error(
      `Cyclic struct reference in ARC56 spec: ${[...seen, typeStr].join(" -> ")}`
    );
  }
  const fieldTypes = struct.map((field) =>
    resolveArc56Type(field.type, structs, [...seen, typeStr])
  );
  return `(${fieldTypes.join(",")})`;
}

function buildMethodSignature(
  method: Arc56Method,
  structs: Record<string, Arc56StructField[]> | undefined
): string {
  const argTypes = method.args.map((a) => resolveArc56Type(a.type, structs));
  const returnType =
    method.returns.type === "void"
      ? "void"
      : resolveArc56Type(method.returns.type, structs);
  return `${method.name}(${argTypes.join(",")})${returnType}`;
}

/** Finds the ARC56 method whose recomputed ARC-4 selector matches the transaction's first app arg. */
export function findMatchingMethod(
  contract: Arc56Contract,
  firstAppArg: Uint8Array
): Arc56Method | null {
  if (firstAppArg.length !== 4) return null;
  const targetSelector = toHex(firstAppArg);
  for (const method of contract.methods) {
    try {
      const signature = buildMethodSignature(method, contract.structs);
      const selector = toHex(algosdk.ABIMethod.fromSignature(signature).getSelector());
      if (selector === targetSelector) {
        return method;
      }
    } catch {
      // A method with a type algosdk can't parse (unknown reference/txn type combo) is skipped
      // rather than aborting the whole match - it simply can't be verified against this call.
      continue;
    }
  }
  return null;
}

export interface ReferenceLink {
  kind: "account" | "application" | "asset";
  /** Resolved value: an address string for account, otherwise a numeric id. */
  address?: string;
  id?: bigint;
}

export interface DecodedAbiArg {
  index: number;
  name: string;
  type: string;
  desc?: string;
  kind: "value" | "transaction" | "account" | "application" | "asset" | "error";
  formatted: string;
  reference?: ReferenceLink;
  error?: string;
}

function formatAbiValue(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return `0x${toHex(value)}`;
  if (Array.isArray(value)) return `[${value.map(formatAbiValue).join(", ")}]`;
  if (value && typeof value === "object") {
    const asString = (value as { toString?: () => string }).toString?.();
    if (asString && asString !== "[object Object]") return asString;
    return JSON.stringify(value);
  }
  return String(value);
}

interface AppCallLike {
  sender: string;
  applicationTransaction?: {
    applicationId?: bigint;
    // algosdk types `accounts` as Address[] (indexer) — call .toString() to get the base32 address.
    accounts?: { toString(): string }[];
    foreignApps?: bigint[];
    foreignAssets?: bigint[];
  };
}

/**
 * Decodes the ABI arguments for a matched method against the transaction's raw app-call args.
 * `rawAppArgs` is the FULL applicationArgs array including the 4-byte selector at index 0.
 */
export function decodeMethodArgs(
  method: Arc56Method,
  contract: Arc56Contract,
  rawAppArgs: Uint8Array[],
  transaction: AppCallLike
): DecodedAbiArg[] {
  const results: DecodedAbiArg[] = [];

  // Args that consume an app-arg slot (everything except transaction-type args).
  const valueArgs = method.args
    .map((arg, index) => ({ arg, index }))
    .filter(({ arg }) => !isTransactionType(arg.type));

  // ARC-4: >15 value args -> first 14 individually (slots 1-14), the rest packed as a tuple in slot 15.
  const packedFromSlot = valueArgs.length >= 16 ? 14 : valueArgs.length;
  let packedTuple: unknown[] | null = null;
  if (valueArgs.length >= 16) {
    try {
      const remaining = valueArgs.slice(14);
      const tupleType = `(${remaining
        .map(({ arg }) => resolveArc56Type(arg.type, contract.structs))
        .join(",")})`;
      const tupleBytes = rawAppArgs[15];
      packedTuple = tupleBytes
        ? (algosdk.ABIType.from(tupleType).decode(tupleBytes) as unknown[])
        : null;
    } catch {
      packedTuple = null;
    }
  }

  method.args.forEach((arg, methodArgIndex) => {
    const name = arg.name || `arg${methodArgIndex + 1}`;

    if (isTransactionType(arg.type)) {
      results.push({
        index: methodArgIndex,
        name,
        type: arg.type,
        desc: arg.desc,
        kind: "transaction",
        formatted: "(transaction reference - see transaction group)",
      });
      return;
    }

    const slotPosition = valueArgs.findIndex(
      (v) => v.index === methodArgIndex
    );

    let rawValue: unknown;
    let rawBytes: Uint8Array | undefined;
    try {
      if (slotPosition < packedFromSlot) {
        rawBytes = rawAppArgs[slotPosition + 1];
        if (!rawBytes) throw new Error("Missing application argument");
        if (isReferenceType(arg.type)) {
          rawValue = rawBytes[0];
        } else {
          const resolvedType = resolveArc56Type(arg.type, contract.structs);
          rawValue = algosdk.ABIType.from(resolvedType).decode(rawBytes);
        }
      } else if (packedTuple) {
        rawValue = packedTuple[slotPosition - packedFromSlot];
      } else {
        throw new Error("Argument was packed into a tuple that failed to decode");
      }
    } catch (error) {
      results.push({
        index: methodArgIndex,
        name,
        type: arg.type,
        desc: arg.desc,
        kind: "error",
        formatted: "(unable to decode)",
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    if (isReferenceType(arg.type)) {
      const idx = Number(rawValue);
      const appTxn = transaction.applicationTransaction;
      if (arg.type === "account") {
        // Index 0 implicitly refers to the sender (ARC-4 sec. "Reference Types").
        const address =
          idx === 0 ? transaction.sender : appTxn?.accounts?.[idx - 1]?.toString();
        results.push({
          index: methodArgIndex,
          name,
          type: arg.type,
          desc: arg.desc,
          kind: "account",
          formatted: address || `(account index ${idx} not found in transaction)`,
          reference: address ? { kind: "account", address } : undefined,
        });
      } else if (arg.type === "application") {
        // Index 0 implicitly refers to the called application itself.
        const id = idx === 0 ? appTxn?.applicationId : appTxn?.foreignApps?.[idx - 1];
        results.push({
          index: methodArgIndex,
          name,
          type: arg.type,
          desc: arg.desc,
          kind: "application",
          formatted:
            id !== undefined
              ? id.toString()
              : `(application index ${idx} not found in transaction)`,
          reference: id !== undefined ? { kind: "application", id } : undefined,
        });
      } else {
        // asset: 0-indexed directly into foreignAssets, no implicit self-reference.
        const id = appTxn?.foreignAssets?.[idx];
        results.push({
          index: methodArgIndex,
          name,
          type: arg.type,
          desc: arg.desc,
          kind: "asset",
          formatted:
            id !== undefined
              ? id.toString()
              : `(asset index ${idx} not found in transaction)`,
          reference: id !== undefined ? { kind: "asset", id } : undefined,
        });
      }
      return;
    }

    results.push({
      index: methodArgIndex,
      name,
      type: arg.type,
      desc: arg.desc,
      kind: "value",
      formatted: formatAbiValue(rawValue),
    });
  });

  return results;
}

/** Heuristic: does the argument's own ARC56 description hint it refers to an asset/app id? */
export function descriptionSuggestsAsset(desc: string | undefined): boolean {
  return !!desc && /\basset/i.test(desc);
}
export function descriptionSuggestsApplication(desc: string | undefined): boolean {
  return !!desc && /\b(app|application)\b/i.test(desc);
}
