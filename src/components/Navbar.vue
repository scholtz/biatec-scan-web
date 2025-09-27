<template>
  <nav
    class="bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50 sticky top-0 z-50"
  >
    <div class="mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/" class="flex items-center space-x-3">
            <div
              class="w-8 h-8 bg-gradient-to-r from-white to-primary-200 rounded-lg flex items-center justify-center"
            >
              <img src="../assets/logo.svg" alt="Logo" class="w-7 h-7" />
            </div>
            <span
              class="text-xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent"
            >
              Biatec Algorand Scan
            </span>
          </router-link>

          <div class="hidden md:flex space-x-6">
            <router-link
              to="/"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t('nav.explore') }}
            </router-link>
            <router-link
              to="/search"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t('nav.search') }}
            </router-link>
            <router-link
              to="/assets"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t('nav.assets') }}
            </router-link>
            <router-link
              to="/favorite"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t('nav.favorites') }}
            </router-link>
            <router-link
              to="/settings"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t('nav.settings') }}
            </router-link>
            <router-link
              to="/about"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t('nav.about') }}
            </router-link>
          </div>
        </div>

        <div class="hidden md:flex items-center space-x-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              @keyup.enter="performSearch"
              type="text"
              :placeholder="$t('nav.searchPlaceholder')"
              class="w-64 pl-10 pr-4 py-2 bg-dark-800/50 border border-dark-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
            <svg
              class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <!-- Mobile hamburger -->
        <button
          class="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-300 hover:text-white hover:bg-dark-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
          @click="toggleMobile"
          :aria-label="$t('common.toggleNavigation')"
          :aria-expanded="mobileOpen"
        >
          <svg
            v-if="!mobileOpen"
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg
            v-else
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <!-- Mobile menu panel -->
      <transition name="fade-slide">
        <div
          v-if="mobileOpen"
          class="md:hidden mt-2 pb-4 border-t border-dark-700/50 space-y-4"
        >
          <div class="pt-4 flex flex-col space-y-3">
            <router-link
              to="/"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t('nav.explore') }}</span>
              <span
                v-if="isActive('/')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
            <router-link
              to="/search"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t('nav.search') }}</span>
              <span
                v-if="isActive('/search')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
            <router-link
              to="/assets"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t('nav.assets') }}</span>
              <span
                v-if="isActive('/assets')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
            <router-link
              to="/favorite"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t('nav.favorites') }}</span>
              <span
                v-if="isActive('/favorite')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
            <router-link
              to="/settings"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t('nav.settings') }}</span>
              <span
                v-if="isActive('/settings')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
            <router-link
              to="/about"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t('nav.about') }}</span>
              <span
                v-if="isActive('/about')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
          </div>
          <div class="px-1">
            <div class="relative">
              <input
                v-model="searchQuery"
                @keyup.enter="performSearchMobile"
                type="text"
                :placeholder="$t('nav.searchMobilePlaceholder')"
                class="w-full pl-10 pr-4 py-2 bg-dark-800/70 border border-dark-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              />
              <svg
                class="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const searchQuery = ref("");
const mobileOpen = ref(false);

const performSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: "Search", query: { q: searchQuery.value.trim() } });
    searchQuery.value = "";
  }
};
const performSearchMobile = () => {
  performSearch();
  mobileOpen.value = false;
};

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value;
}
function closeMobile() {
  mobileOpen.value = false;
}
function isActive(path: string) {
  return route.path === path;
}

// Close mobile menu on route change
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  }
);

onMounted(() => {
  // try {
  //   signalrService.onAggregatedPoolReceived((pool: AMMAggregatedPool) => {
  //     if(pool.Id == "0-31566704"){
  //       // algo-usdc
  //       state.algoPrice = pool;
  //     }
  //   });
  // } catch (error) {
  //   console.error("Error setting up SignalR pool handler:", error);
  // }
});
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
