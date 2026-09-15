// src/wallet/errors.ts - Classify wallet errors so a user closing their own
// wallet's dialog is not reported as a failure.
import { SignDataError, SignTxnsError } from "@txnlab/use-wallet";

/** ARC-0001 / EIP-1193 style code wallets use for "user rejected". */
const USER_REJECTED_CODE = 4001;

interface CodedError {
  code?: unknown; // shape varies per wallet SDK; narrowed below
}

/**
 * True when the error represents the user cancelling a wallet interaction
 * (closing the modal, rejecting the request). Typed use-wallet errors and
 * standard rejection codes are checked first; the message regex is a last
 * resort for SDKs that only throw plain `Error`s.
 */
export function isUserRejection(error: unknown): boolean {
  if (error instanceof SignTxnsError || error instanceof SignDataError) {
    return error.code === USER_REJECTED_CODE;
  }
  if (typeof error === "object" && error !== null) {
    const code = (error as CodedError).code;
    if (code === USER_REJECTED_CODE || code === "USER_REJECTED") return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /user (rejected|cancel|denied)|rejected by user|cancelled by user|modal closed|connection request reset/i.test(
    message
  );
}
