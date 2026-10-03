/**
 * Minimal subset of the ARC-56 application spec (https://arc.algorand.foundation/ARCs/arc-0056)
 * needed to decode/describe ABI method calls. Registry JSON may contain additional fields;
 * everything not listed here is ignored.
 */

export interface Arc56StructField {
  name: string;
  type: string;
}

export interface Arc56Method {
  name: string;
  desc?: string;
  args: {
    type: string;
    name?: string;
    desc?: string;
    struct?: string;
  }[];
  returns: {
    type: string;
    desc?: string;
    struct?: string;
  };
  readonly?: boolean;
}

export interface Arc56Contract {
  name: string;
  desc?: string;
  structs?: Record<string, Arc56StructField[]>;
  methods: Arc56Method[];
  source?: {
    approval?: string;
    clear?: string;
  };
  /** ARC numbers the contract claims to implement (e.g. 4, 56). */
  arcs?: number[];
  state?: {
    schema?: {
      global?: { ints: number; bytes: number };
      local?: { ints: number; bytes: number };
    };
  };
  compilerInfo?: {
    compiler?: string;
    compilerVersion?: { major: number; minor: number; patch: number };
  };
}

/** A GitHub owner/repo whose indexed spec produced a program hash (registry `.owners.json`). */
export interface Arc56RegistryOwner {
  owner: string;
  repo: string;
  url: string;
  reputationScore?: number;
  riskLevel?: string;
  banned?: boolean;
}

export type Arc56LookupResult =
  | { state: "found"; contract: Arc56Contract }
  | { state: "not-found" }
  | { state: "error" };

export interface Arc56AbiSignatureLookup {
  abi: string;
  apps: string[];
}
