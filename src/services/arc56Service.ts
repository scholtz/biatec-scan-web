import type {
  Arc56AbiSignatureLookup,
  Arc56Contract,
  Arc56LookupResult,
  Arc56RegistryOwner,
} from "../types/arc56";
import {
  arc56RegistryUrl as baseUrl,
  arc56OwnersRegistryUrl as ownersBaseUrl,
} from "../config/env";

// Static, read-only JSON registry (scholtz2/arc56-registry). No auth, no mutation endpoints.

const HEX_RE = /^[0-9a-f]+$/;

function assertHex(value: string, label: string): void {
  if (!HEX_RE.test(value)) {
    throw new Error(`Invalid ${label}: expected lowercase hex, got "${value}"`);
  }
}

class Arc56Service {
  // Cache holds the resolved value or `null` (confirmed not-found) to avoid re-fetching 404s.
  private approvalCache = new Map<string, Arc56Contract | null>();
  private selectorCache = new Map<string, Arc56AbiSignatureLookup | null>();
  private ownersCache = new Map<string, Arc56RegistryOwner[]>();

  /** Look up a published ARC-56 spec by the SHA-256 hex hash of the raw approval program bytes. */
  async getContractByApprovalHash(
    hashHex: string
  ): Promise<Arc56Contract | null> {
    assertHex(hashHex, "approval program hash");
    if (this.approvalCache.has(hashHex)) {
      return this.approvalCache.get(hashHex)!;
    }
    const url = `${baseUrl}/approval-programs/${hashHex.slice(0, 3)}/${hashHex}.arc56.json`;
    const result = await this.fetchJson<Arc56Contract>(url);
    this.approvalCache.set(hashHex, result);
    return result;
  }

  /**
   * Like getContractByApprovalHash, but distinguishes "registry has no spec for this hash"
   * (404) from "registry unreachable / errored", so the UI never claims a spec is missing
   * just because of an outage. Only definitive answers are cached.
   */
  async lookupContractByApprovalHash(hashHex: string): Promise<Arc56LookupResult> {
    assertHex(hashHex, "approval program hash");
    if (this.approvalCache.has(hashHex)) {
      const cached = this.approvalCache.get(hashHex);
      return cached ? { state: "found", contract: cached } : { state: "not-found" };
    }
    const url = `${baseUrl}/approval-programs/${hashHex.slice(0, 3)}/${hashHex}.arc56.json`;
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        this.approvalCache.set(hashHex, null);
        return { state: "not-found" };
      }
      if (!response.ok) return { state: "error" };
      const contract = (await response.json()) as Arc56Contract;
      this.approvalCache.set(hashHex, contract);
      return { state: "found", contract };
    } catch (error) {
      console.warn(`arc56-registry request errored: ${url}`, error);
      return { state: "error" };
    }
  }

  /** GitHub owners/repos whose indexed spec produced this approval hash (empty when none/unavailable). */
  async getOwnersByApprovalHash(hashHex: string): Promise<Arc56RegistryOwner[]> {
    assertHex(hashHex, "approval program hash");
    const cached = this.ownersCache.get(hashHex);
    if (cached) return cached;
    const url = `${ownersBaseUrl}/approval-programs/${hashHex.slice(0, 3)}/${hashHex}.owners.json`;
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        this.ownersCache.set(hashHex, []);
        return [];
      }
      if (!response.ok) return [];
      const body = (await response.json()) as { owners?: Arc56RegistryOwner[] };
      const owners = body.owners ?? [];
      this.ownersCache.set(hashHex, owners);
      return owners;
    } catch (error) {
      console.warn(`arc56-registry owners request errored: ${url}`, error);
      return [];
    }
  }

  /** Look up known ABI signatures/apps for a 4-byte (8 hex char) ARC-4 method selector. */
  async getSignatureBySelector(
    selectorHex: string
  ): Promise<Arc56AbiSignatureLookup | null> {
    assertHex(selectorHex, "method selector");
    if (this.selectorCache.has(selectorHex)) {
      return this.selectorCache.get(selectorHex)!;
    }
    const url = `${baseUrl}/abi-signatures/${selectorHex.slice(0, 2)}/${selectorHex}.json`;
    const result = await this.fetchJson<Arc56AbiSignatureLookup>(url);
    this.selectorCache.set(selectorHex, result);
    return result;
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        console.warn(`arc56-registry request failed (${response.status}): ${url}`);
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      console.warn(`arc56-registry request errored: ${url}`, error);
      return null;
    }
  }
}

export const arc56Service = new Arc56Service();
