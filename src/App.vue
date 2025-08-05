<template>
  <div id="app" class="min-h-screen bg-dark-950">
    <Navbar />
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import Navbar from './components/Navbar.vue';
import { signalrService } from './services/signalrService';

onMounted(async () => {
  // Initialize SignalR connection
  try {
    await signalrService.connect();
  } catch (error) {
    console.error('Failed to initialize SignalR connection:', error);
  }
});
</script>

<style>
#app {
  font-family: 'Inter', sans-serif;
}
</style>