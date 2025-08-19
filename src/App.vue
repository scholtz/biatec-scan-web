<template>
  <canvas id="gradient-canvas" data-transition-in />
  <div id="app" class="min-h-screen">
    <Navbar />
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import Navbar from "./components/Navbar.vue";
import { signalrService } from "./services/signalrService";
import { Gradient } from "whatamesh";

const gradient = new Gradient();
onMounted(async () => {
  // Initialize SignalR connection
  gradient.initGradient("#gradient-canvas");
  try {
    await signalrService.connect();
  } catch (error) {
    console.error("Failed to initialize SignalR connection:", error);
  }
});
</script>

<style>
#app {
  font-family: "Inter", sans-serif;
}
#gradient-canvas {
  width: 100%;
  height: 100%;
  --gradient-color-1: #5e19ff;
  --gradient-color-2: #0c2c3d;
  --gradient-color-3: #222;
  --gradient-color-4: #1a18a8;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -10000;
}
</style>
