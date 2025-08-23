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
              Explore
            </router-link>
            <router-link
              to="/search"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              Search
            </router-link>
            <router-link
              to="/assets"
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              Assets
            </router-link>
          </div>
        </div>

  <div class="hidden md:flex items-center space-x-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              @keyup.enter="performSearch"
              type="text"
              placeholder="Search by block or tx ID..."
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
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const searchQuery = ref("");

const performSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: "Search", query: { q: searchQuery.value.trim() } });
    searchQuery.value = "";
  }
};

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
