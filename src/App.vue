<template>
  <canvas :key="canvasKey" id="gradient-canvas" data-transition-in />
  <div id="app" class="min-h-screen">
    <Navbar />
    <main>
      <router-view />
    </main>
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import Navbar from "./components/Navbar.vue";
import ToastContainer from "./components/ToastContainer.vue";
import { signalrService } from "./services/signalrService";
import { useBackgroundGradient } from "./composables/useBackgroundGradient";

const { canvasKey } = useBackgroundGradient();
onMounted(async () => {
  // Initialize SignalR connection
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
  /* Static fallback in the animation's palette: visible before the WebGL
     gradient first paints and whenever it is blank (context lost, WebGL
     unavailable), so the page is never white behind the translucent cards. */
  background: linear-gradient(135deg, #1a18a8 0%, #0c2c3d 55%, #222 100%);
  position: fixed;
  top: 0;
  left: 0;
  z-index: -10000;
}
</style>
