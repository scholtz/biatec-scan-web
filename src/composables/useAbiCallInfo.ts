import { ref, watch, type Ref } from "vue";
import algosdk from "algosdk";
import { algorandService } from "../services/algorandService";
import { arc56Service } from "../services/arc56Service";
import {
  decodeMethodArgs,
  findMatchingMethod,
  sha256Hex,
  toHex,
  type DecodedAbiArg,
} from "../utils/abi56";
import type {
  Arc56AbiSignatureLookup,
  Arc56Contract,
  Arc56Method,
} from "../types/arc56";

export type AbiCallStatus =
  | "not-abi"
  | "loading"
  | "verified"
  | "unverified-candidates"
  | "unverified-none"
  | "error";

export interface AbiCallCandidate {
  /** Raw entry from the registry's abi-signatures lookup: either an approval-program hash or an app id. */
  source: string;
  contract: Arc56Contract | null;
  method: Arc56Method | null;
  loading: boolean;
  notFound: boolean;
}

export interface AbiCallInfo {
  status: AbiCallStatus;
  approvalHash?: string;
  selectorHex?: string;
  contract?: Arc56Contract;
  method?: Arc56Method;
  args?: DecodedAbiArg[];
  signatureLookup?: Arc56AbiSignatureLookup;
  candidates?: AbiCallCandidate[];
  errorMessage?: string;
}

/**
 * Resolves ARC56-described, type-safe argument info for an application-call transaction by
 * hashing the on-chain approval program ourselves and looking it up in the arc56-registry - the
 * "verified" badge only ever reflects a hash WE computed from chain data, never a claimed one.
 */
export function useAbiCallInfo(
  transaction: Ref<algosdk.indexerModels.Transaction | null | undefined>
) {
  const info = ref<AbiCallInfo>({ status: "not-abi" });

  async function run() {
    const tx = transaction.value;
    const appTxn = tx?.applicationTransaction;
    const rawArgs = appTxn?.applicationArgs;

    if (!tx || !appTxn || !rawArgs || rawArgs.length === 0 || rawArgs[0].length !== 4) {
      info.value = { status: "not-abi" };
      return;
    }

    info.value = { status: "loading" };
    const selectorHex = toHex(rawArgs[0]);

    try {
      const approvalProgram = await resolveApprovalProgram(tx);
      let approvalHash: string | undefined;

      if (approvalProgram) {
        approvalHash = await sha256Hex(approvalProgram);
        const contract = await arc56Service.getContractByApprovalHash(approvalHash);
        if (contract) {
          const method = findMatchingMethod(contract, rawArgs[0]);
          if (method) {
            info.value = {
              status: "verified",
              approvalHash,
              selectorHex,
              contract,
              method,
              args: decodeMethodArgs(method, contract, rawArgs, tx),
            };
            return;
          }
          // Bytecode hash matches a published contract, but no method in ITS abi produces this
          // selector - the call cannot be trusted as verified even though the contract is known.
        }
      }

      await resolveUnverified(selectorHex, approvalHash);
    } catch (error) {
      info.value = {
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function resolveApprovalProgram(
    tx: algosdk.indexerModels.Transaction
  ): Promise<Uint8Array | null> {
    const appTxn = tx.applicationTransaction!;
    // App-creation calls carry their own approval program right on the transaction.
    if (appTxn.approvalProgram && appTxn.approvalProgram.length > 0) {
      return appTxn.approvalProgram;
    }
    if (!appTxn.applicationId) return null;
    try {
      const appInfo = await algorandService
        .getAlgodClient()
        .getApplicationByID(appTxn.applicationId)
        .do();
      return appInfo.params.approvalProgram ?? null;
    } catch {
      return null;
    }
  }

  async function resolveUnverified(selectorHex: string, approvalHash?: string) {
    const lookup = await arc56Service.getSignatureBySelector(selectorHex);
    if (!lookup || !lookup.apps || lookup.apps.length === 0) {
      info.value = { status: "unverified-none", selectorHex, approvalHash };
      return;
    }
    info.value = {
      status: "unverified-candidates",
      selectorHex,
      approvalHash,
      signatureLookup: lookup,
      candidates: lookup.apps.map((source) => ({
        source,
        contract: null,
        method: null,
        loading: false,
        notFound: false,
      })),
    };
  }

  /**
   * User explicitly opts in to previewing one candidate's field descriptions. Nothing from a
   * candidate is ever applied automatically - the caller must render it clearly as unverified.
   */
  async function loadCandidate(source: string) {
    const current = info.value;
    if (current.status !== "unverified-candidates" || !current.candidates) return;
    const target = current.candidates.find((c) => c.source === source);
    if (!target || target.contract || target.loading) return;

    target.loading = true;
    const isHash = /^[0-9a-f]{64}$/i.test(source);
    const contract = isHash
      ? await arc56Service.getContractByApprovalHash(source.toLowerCase())
      : await resolveContractForAppId(source);

    target.loading = false;
    if (!contract) {
      target.notFound = true;
      return;
    }

    const rawArgs = transaction.value?.applicationTransaction?.applicationArgs;
    target.contract = contract;
    target.method = rawArgs && rawArgs[0] ? findMatchingMethod(contract, rawArgs[0]) : null;
  }

  async function resolveContractForAppId(appId: string): Promise<Arc56Contract | null> {
    if (!/^\d+$/.test(appId)) return null;
    try {
      const appInfo = await algorandService
        .getAlgodClient()
        .getApplicationByID(BigInt(appId))
        .do();
      const program = appInfo.params.approvalProgram;
      if (!program) return null;
      const hash = await sha256Hex(program);
      return arc56Service.getContractByApprovalHash(hash);
    } catch {
      return null;
    }
  }

  watch(transaction, run, { immediate: true });

  return { info, loadCandidate };
}
