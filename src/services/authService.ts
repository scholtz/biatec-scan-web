import algosdk, { SuggestedParams } from "algosdk";
import { generateAlgorandAccount } from "arc76";
import { makeArc14AuthHeader, makeArc14TxWithSuggestedParams } from "arc14";
import { Buffer } from "buffer";
import { uuidv7 } from "uuidv7";
import { genesisHash, genesisId } from "../config/env";

// SECURITY (AUDIT-2026-07-20-03): this value is signing-key seed material, not an inert
// identifier. generateAlgorandAccount() below derives an Algorand keypair from it
// deterministically, so anyone who reads it can reconstruct that keypair and impersonate
// this browser's ARC-14 auth identity against the Biatec API. It never guards funds or
// any privileged/write action today, but must never be logged, sent to analytics/error
// reporters, or otherwise exposed outside this module for that reason.
let sessionCache: string | null = null;

export function getSessionId(): string {
  if (sessionCache) return sessionCache;
  try {
    const existing = localStorage.getItem("session");
    if (existing) {
      sessionCache = existing;
      return existing;
    }
  } catch {
    // ignore
  }
  const s = uuidv7();
  try {
    localStorage.setItem("session", s);
  } catch {
    // ignore
  }
  sessionCache = s;
  return s;
}

export const DEFAULT_ARC14_REALM = "BiatecScan#ARC14";

// The signed ARC-14 transaction is fully deterministic (fixed validity window,
// deterministic ARC-76 key), so the header can be minted once per realm and
// reused - deriving the key is a ~1M-iteration PBKDF2, far too slow to repeat
// on every API request.
const headerCache = new Map<string, Promise<string>>();

export function getAuthToken(realm: string = DEFAULT_ARC14_REALM): Promise<string> {
  const cached = headerCache.get(realm);
  if (cached) return cached;
  const pending = buildAuthToken(realm).catch((error: unknown) => {
    headerCache.delete(realm);
    throw error;
  });
  headerCache.set(realm, pending);
  return pending;
}

async function buildAuthToken(realm: string): Promise<string> {
  const session = getSessionId();
  const account: algosdk.Account = await generateAlgorandAccount(session);
  const params: SuggestedParams = {
    fee: 1000n,
    genesisHash: new Uint8Array(Buffer.from(genesisHash, "base64")),
    genesisID: genesisId,
    lastValid: 46916880n,
    minFee: 1000n,
    flatFee: false,
    firstValid: 46915880n,
  };
  const tx = await makeArc14TxWithSuggestedParams(
    realm,
    account.addr.toString(),
    params
  );
  const signed = tx.signTxn(account.sk);
  const header = makeArc14AuthHeader(signed);
  return header;
}
