<template>
  <span v-if="value === null || value === undefined">{{ placeholder }}</span>
  <span v-else>
    <template v-if="smallMode">
      {{ prefix }}{{ sign }}0{{ decimalSeparator }}0<sub>{{
        zerosCountText
      }}</sub
      >{{ significantDigitsText }}{{ suffix }}
    </template>
    <template v-else>
      {{ formattedText }}
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

type FormatType = "number" | "currency" | "percent";

const props = withDefaults(
  defineProps<{
    value?: number | null;
    type?: FormatType;
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    placeholder?: string;
    // Small-value formatting (prevents values like 0,00 USD hiding detail)
    smallThreshold?: number;
    significantDigits?: number;
  }>(),
  {
    type: "number",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    placeholder: "-",
    smallThreshold: 0.01,
    significantDigits: 4,
  }
);

const { locale } = useI18n();

const numericValue = computed(() =>
  props.value === null || props.value === undefined ? null : props.value
);

const baseFormatterOptions = computed(() => {
  if (props.type === "currency") {
    return {
      style: "currency" as const,
      currency: props.currency,
      minimumFractionDigits: props.minimumFractionDigits,
      maximumFractionDigits: props.maximumFractionDigits,
    };
  }
  if (props.type === "percent") {
    return {
      style: "percent" as const,
      minimumFractionDigits: props.minimumFractionDigits,
      maximumFractionDigits: props.maximumFractionDigits,
    };
  }

  return {
    style: "decimal" as const,
    minimumFractionDigits: props.minimumFractionDigits,
    maximumFractionDigits: props.maximumFractionDigits,
  };
});

const affixes = computed(() => {
  // Use formatToParts to get locale-specific currency prefix/suffix + decimal separator.
  // For non-currency, prefix/suffix are empty.
  const decimalSeparator =
    new Intl.NumberFormat(locale.value, { style: "decimal" })
      .formatToParts(1.1)
      .find((p) => p.type === "decimal")?.value ?? ".";

  if (props.type !== "currency") {
    return { prefix: "", suffix: "", decimalSeparator };
  }

  const parts = new Intl.NumberFormat(locale.value, {
    style: "currency",
    currency: props.currency,
    minimumFractionDigits: props.minimumFractionDigits,
    maximumFractionDigits: props.maximumFractionDigits,
  }).formatToParts(1.1);

  const firstNumberIndex = parts.findIndex(
    (p) => p.type === "integer" || p.type === "decimal" || p.type === "fraction"
  );
  const lastNumberIndex =
    parts.length -
    1 -
    [...parts]
      .reverse()
      .findIndex(
        (p) =>
          p.type === "integer" || p.type === "decimal" || p.type === "fraction"
      );

  const prefix = parts
    .slice(0, Math.max(0, firstNumberIndex))
    .map((p) => p.value)
    .join("");
  const suffix =
    lastNumberIndex >= 0
      ? parts
          .slice(lastNumberIndex + 1)
          .map((p) => p.value)
          .join("")
      : "";

  return { prefix, suffix, decimalSeparator };
});

const smallMode = computed(() => {
  const val = numericValue.value;
  if (val === null) return false;
  const abs = Math.abs(val);

  // Only apply special small formatting for currency and decimal numbers.
  if (props.type === "percent") return false;

  return abs !== 0 && abs < props.smallThreshold;
});

const sign = computed(() => {
  const val = numericValue.value;
  return val !== null && val < 0 ? "-" : "";
});

const zerosCount = computed(() => {
  const val = numericValue.value;
  if (val === null) return 0;
  const abs = Math.abs(val);
  if (abs === 0) return 0;

  // Compute leading zeros in fractional part using scientific notation.
  // Example: 0.0001234 ~= 1.234e-4 -> zerosCount = 3.
  const exp = abs.toExponential(props.significantDigits - 1);
  const [, expStr] = exp.split("e");
  const exponent = Number.parseInt(expStr ?? "0", 10);
  return Math.max(0, -exponent - 1);
});

const zerosCountText = computed(() => {
  return new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: 0,
  }).format(zerosCount.value);
});

const significantDigitsText = computed(() => {
  const val = numericValue.value;
  if (val === null) return "";
  const abs = Math.abs(val);

  const exp = abs.toExponential(props.significantDigits - 1);
  const [mantissa] = exp.split("e");
  return (mantissa ?? "0")
    .replace(".", "")
    .padEnd(props.significantDigits, "0");
});

const formattedText = computed(() => {
  const val = numericValue.value;
  if (val === null) return props.placeholder;

  return new Intl.NumberFormat(locale.value, baseFormatterOptions.value).format(
    val
  );
});

const prefix = computed(() => affixes.value.prefix);
const suffix = computed(() => affixes.value.suffix);
const decimalSeparator = computed(() => affixes.value.decimalSeparator);
const placeholder = computed(() => props.placeholder);

const value = computed(() => props.value);
</script>
