<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 v-if="title" class="text-lg font-semibold text-white">{{ title }}</h3>
      <div class="flex space-x-2">
        <button
          v-if="isNumericAvailable"
          @click="encoding = 'numeric'"
          :class="
            encoding === 'numeric'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-900 text-gray-400'
          "
          class="px-3 py-1 rounded text-xs font-medium hover:bg-primary-700 transition-colors"
        >
          Numeric
        </button>
        <button
          v-if="props.allowUTF8"
          @click="encoding = resolveTextEncoding()"
          :class="
            encoding === 'utf8'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-900 text-gray-400'
          "
          class="px-3 py-1 rounded text-xs font-medium hover:bg-primary-700 transition-colors"
        >
          UTF-8
        </button>
        <button
          v-if="isAddressAvailable"
          @click="encoding = 'address'"
          :class="
            encoding === 'address'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-900 text-gray-400'
          "
          class="px-3 py-1 rounded text-xs font-medium hover:bg-primary-700 transition-colors"
        >
          Address
        </button>
        <button
          @click="encoding = 'base64'"
          :class="
            encoding === 'base64'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-900 text-gray-400'
          "
          class="px-3 py-1 rounded text-xs font-medium hover:bg-primary-700 transition-colors"
        >
          Base64
        </button>
        <button
          @click="encoding = 'hex'"
          :class="
            encoding === 'hex'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-900 text-gray-400'
          "
          class="px-3 py-1 rounded text-xs font-medium hover:bg-primary-700 transition-colors"
        >
          Hex
        </button>
      </div>
    </div>
    <div class="bg-dark-900 p-3 rounded-lg border border-gray-700">
      <p class="text-gray-300 text-sm break-all font-mono">
        {{ decodedValue }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Buffer } from "buffer";
import algosdk from "algosdk";

type Encoding = "utf8" | "base64" | "hex" | "numeric" | "address";

interface Props {
  value: string | Uint8Array | undefined;
  title?: string;
  allowUTF8?: boolean;
  defaultEncoding?: Encoding;
  autoDetectNumeric?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultEncoding: "utf8",
  allowUTF8: true,
  autoDetectNumeric: true,
});

const encoding = ref<Encoding>(props.defaultEncoding);

// Convert value to Buffer
const bufferValue = computed(() => {
  if (!props.value) return Buffer.alloc(0);
  if (typeof props.value === "string") {
    return Buffer.from(props.value, "base64");
  }
  return Buffer.from(props.value);
});

// Convert value to base64 string if it's Uint8Array
const base64Value = computed(() => {
  if (!props.value) return "";

  if (typeof props.value === "string") {
    return props.value;
  }

  // Convert Uint8Array to base64
  return Buffer.from(props.value).toString("base64");
});

const hexValue = computed(() => bufferValue.value.toString("hex"));

const numericValue = computed(() => {
  const buf = bufferValue.value;
  // Limit to 128 bytes (1024-bit integer) to support large numbers but avoid huge blobs
  if (buf.length === 0 || buf.length > 128) return null;
  try {
    // Big Endian conversion
    let val = BigInt(0);
    for (const byte of buf) {
      val = (val << BigInt(8)) + BigInt(byte);
    }
    return val;
  } catch {
    return null;
  }
});

const isNumericAvailable = computed(() => {
  return numericValue.value !== null;
});

// An AVM address is a 32-byte public key plus a derived checksum, so any
// 32-byte buffer can be *re-encoded* as one - encodeAddress never validates
// against an existing checksum, it just computes a fresh one. This doesn't
// prove the bytes originated as an address, only that showing them as one is
// meaningful, which is why it's offered as a selectable view rather than
// asserted as fact.
const addressValue = computed(() => {
  const buf = bufferValue.value;
  if (buf.length !== 32) return null;
  try {
    return algosdk.encodeAddress(new Uint8Array(buf));
  } catch {
    return null;
  }
});

const isAddressAvailable = computed(() => addressValue.value !== null);

// Best-effort UTF-8 decode of the current value - null when the bytes aren't
// mostly printable text, so callers can fall through to another encoding.
const utf8Value = computed(() => {
  const val = base64Value.value;
  if (!val) return null;
  try {
    const decoded = atob(val);
    const utf8String = decodeURIComponent(escape(decoded));
    const printableRatio =
      utf8String.split("").filter((c) => {
        const code = c.charCodeAt(0);
        return (
          (code >= 32 && code <= 126) ||
          code === 10 ||
          code === 13 ||
          code === 9
        );
      }).length / utf8String.length;
    return printableRatio > 0.8 ? utf8String : null;
  } catch {
    return null;
  }
});

// What "view as text" should actually resolve to: valid UTF-8 first (even for
// 32-byte values), then - only for exactly 32 bytes - the AVM address
// encoding, and hex for everything else. Used both for the initial default
// and whenever the UTF-8 button is (re)selected, so the highlighted button
// always matches what's actually on screen instead of staying "UTF-8" while
// silently displaying hex.
function resolveTextEncoding(): Encoding {
  if (utf8Value.value !== null) return "utf8";
  if (isAddressAvailable.value) return "address";
  return "hex";
}

const decodedValue = computed(() => {
  if (!base64Value.value) return "";

  switch (encoding.value) {
    case "numeric":
      return numericValue.value?.toString() || "";
    case "base64":
      return base64Value.value;
    case "hex":
      return hexValue.value;
    case "address":
      return addressValue.value ?? hexValue.value;
    case "utf8":
    default:
      return utf8Value.value ?? hexValue.value;
  }
});

// Auto-detect encoding on mount and whenever the value changes.
watch(
  () => props.value,
  (newValue) => {
    if (!newValue) return;

    // Check if we should default to numeric
    if (
      props.autoDetectNumeric &&
      numericValue.value !== null &&
      numericValue.value <= BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      encoding.value = "numeric";
      return;
    }

    // Otherwise resolve the same way the UTF-8 button does, so an explicit
    // defaultEncoding (e.g. "hex" for a block hash) still wins outright, and
    // only the default "utf8" family gets auto-resolved to utf8/address/hex.
    encoding.value =
      props.defaultEncoding === "utf8" ? resolveTextEncoding() : props.defaultEncoding;
  },
  { immediate: true },
);
</script>
