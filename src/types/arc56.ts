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
}

export interface Arc56AbiSignatureLookup {
  abi: string;
  apps: string[];
}
