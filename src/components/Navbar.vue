<template>
  <nav
    class="bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50 sticky top-0 z-50"
  >
    <div class="mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/" class="flex items-center space-x-3">
            <div
              class="w-8 h-8 bg-linear-to-r from-white to-primary-200 rounded-lg flex items-center justify-center"
            >
              <img src="../assets/logo.svg" alt="Logo" class="w-7 h-7" />
            </div>
            <span
              class="text-xl font-bold bg-linear-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent"
            >
              Biatec {{ networkLabel }} Scan
            </span>
          </router-link>

          <div class="hidden lg:flex space-x-4 xl:space-x-6">
            <router-link
              v-if="isSwapAvailable"
              to="/swap"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t("nav.swap") }}
            </router-link>
            <router-link
              to="/"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t("nav.assets") }}
            </router-link>
            <router-link
              to="/explore"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t("nav.explore") }}
            </router-link>
            <router-link
              to="/search"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t("nav.search") }}
            </router-link>
            <router-link
              to="/trades"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t("nav.trades") }}
            </router-link>
            <router-link
              to="/favorite"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t("nav.favorites") }}
            </router-link>
            <router-link
              to="/settings"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {{ $t("nav.settings") }}
            </router-link>
          </div>
        </div>

        <div class="hidden lg:flex items-center space-x-4">
          <div class="hidden xl:block">
            <ExplorerSearchBox
              icon-only
              :placeholder="$t('nav.searchPlaceholder')"
            />
          </div>
          <WalletConnectButton />
        </div>

        <!-- Mobile hamburger -->
        <button
          class="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-300 hover:text-white hover:bg-dark-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          class="lg:hidden mt-2 pb-4 border-t border-dark-700/50 space-y-4"
        >
          <div class="pt-4 flex flex-col space-y-3">
            <router-link
              v-if="isSwapAvailable"
              to="/swap"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t("nav.swap") }}</span>
              <span
                v-if="isActive('/swap')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
            <router-link
              to="/"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t("nav.explore") }}</span>
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
              <span>{{ $t("nav.search") }}</span>
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
              <span>{{ $t("nav.assets") }}</span>
              <span
                v-if="isActive('/assets')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
            <router-link
              to="/trades"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t("nav.trades") }}</span>
              <span
                v-if="isActive('/trades')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
            <router-link
              to="/favorite"
              class="px-2 py-2 rounded-lg text-gray-200 hover:bg-dark-800/70 flex items-center justify-between"
              @click="closeMobile"
            >
              <span>{{ $t("nav.favorites") }}</span>
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
              <span>{{ $t("nav.settings") }}</span>
              <span
                v-if="isActive('/settings')"
                class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
              />
            </router-link>
            <div class="px-1 pt-1">
              <WalletConnectButton compact />
            </div>
          </div>
          <div class="px-1">
            <ExplorerSearchBox
              :placeholder="$t('nav.searchMobilePlaceholder')"
              @searched="closeMobile"
            />
          </div>
        </div>
      </transition>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { networkLabel } from "../config/env";
import { isSwapAvailable } from "../swap/availability";
import ExplorerSearchBox from "./ExplorerSearchBox.vue";
import { walletReady } from "../wallet/walletReady";

// Loaded after the wallet plugin is installed (see main.ts) so the heavy
// wallet SDKs never block the first render of any page.
const WalletConnectButton = defineAsyncComponent(async () => {
  await walletReady;
  return import("./wallet/WalletConnectButton.vue");
});

const route = useRoute();
const mobileOpen = ref(false);

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
  },
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
