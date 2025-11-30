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
          @click="encoding = 'utf8'"
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

interface Props {
  value: string | Uint8Array | undefined;
  title?: string;
  allowUTF8?: boolean;
  defaultEncoding?: "utf8" | "base64" | "hex" | "numeric";
}

const props = withDefaults(defineProps<Props>(), {
  defaultEncoding: "utf8",
  allowUTF8: true,
});

const encoding = ref<"utf8" | "base64" | "hex" | "numeric">(
  props.defaultEncoding
);

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

const numericValue = computed(() => {
  const buf = bufferValue.value;
  // Limit to 8 bytes (64-bit integer)
  if (buf.length === 0 || buf.length > 8) return null;
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

const decodedValue = computed(() => {
  const val = base64Value.value;
  if (!val) return "";

  try {
    if (encoding.value === "numeric") {
      return numericValue.value?.toString() || "";
    } else if (encoding.value === "base64") {
      return val;
    } else if (encoding.value === "hex") {
      // Convert base64 to hex
      const decoded = atob(val);
      return Array.from(decoded)
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("");
    } else {
      // UTF-8 - try to decode base64 to string
      try {
        const decoded = atob(val);
        // Check if it's valid UTF-8
        const utf8String = decodeURIComponent(escape(decoded));
        // Test if it contains mostly printable characters
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

        if (printableRatio > 0.8) {
          return utf8String;
        } else {
          // Not valid UTF-8, switch to hex
          encoding.value = "hex";
          return Array.from(decoded)
            .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join("");
        }
      } catch (e) {
        // If UTF-8 decoding fails, switch to hex
        encoding.value = "hex";
        const decoded = atob(val);
        return Array.from(decoded)
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("");
      }
    }
  } catch (e) {
    return val;
  }
});

// Auto-detect encoding on mount
watch(
  () => props.value,
  (newValue) => {
    if (!newValue) return;

    // Check if we should default to numeric
    if (
      numericValue.value !== null &&
      numericValue.value <= BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      encoding.value = "numeric";
      return;
    }

    // Reset to default encoding when value changes
    encoding.value = props.defaultEncoding;
  },
  { immediate: true }
);
</script>
