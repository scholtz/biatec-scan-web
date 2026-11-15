<template>
  <button
    type="button"
    class="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-300 hover:text-white hover:bg-dark-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
    :title="label"
    :aria-label="label"
    data-testid="theme-toggle"
    @click="cycleMode"
  >
    <!-- Sun: shown in dark mode (click -> light) -->
    <svg
      v-if="resolved === 'dark'"
      class="w-5 h-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"
      />
    </svg>
    <!-- Moon: shown in light mode (click -> dark) -->
    <svg
      v-else
      class="w-5 h-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "../composables/useTheme";

const { t } = useI18n();
const { resolved, cycleMode } = useTheme();
const label = computed(() =>
  resolved.value === "dark" ? t("theme.switchToLight") : t("theme.switchToDark"),
);
</script>
