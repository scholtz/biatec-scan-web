<template>
  <form
    class="flex items-stretch"
    role="search"
    @submit.prevent="performSearch"
  >
    <input
      v-model="query"
      type="text"
      enterkeyhint="search"
      :aria-label="$t('nav.explorerSearch')"
      :placeholder="placeholder"
      :class="[
        'min-w-0 py-2 px-4 rounded-l-lg bg-dark-800/50 border border-dark-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200',
        iconOnly ? 'w-56' : 'flex-1',
      ]"
    />
    <button
      type="submit"
      :title="$t('nav.searchButton')"
      :aria-label="$t('nav.searchButton')"
      :class="[
        'shrink-0 inline-flex items-center justify-center gap-2 py-2 bg-primary-600 hover:bg-primary-500 text-white border border-primary-600 hover:border-primary-500 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200',
        iconOnly ? 'px-3' : 'px-4',
      ]"
    >
      <svg
        class="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span v-if="!iconOnly">{{ $t("nav.searchButton") }}</span>
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  isNavigationFailure,
  NavigationFailureType,
  useRouter,
} from "vue-router";

defineProps<{
  placeholder: string;
  /** Render the submit button as an icon only (compact navbar variant). */
  iconOnly?: boolean;
}>();
const emit = defineEmits<{ (e: "searched"): void }>();

const router = useRouter();
const query = ref("");

async function performSearch() {
  const q = query.value.trim();
  if (!q) return;
  const failure = await router.push({ name: "Search", query: { q } });
  // Keep the text only if a guard blocked/cancelled navigation; re-submitting
  // the query already shown (duplicate) is a harmless no-op, so clear as usual.
  if (
    failure &&
    !isNavigationFailure(failure, NavigationFailureType.duplicated)
  )
    return;
  query.value = "";
  emit("searched");
}
</script>
