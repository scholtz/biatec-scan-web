import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { Gradient } from "whatamesh";

const CANVAS_SELECTOR = "#gradient-canvas";
// Mobile browsers throttle/discard WebGL for backgrounded tabs without always
// firing context-loss events, so after being away this long we rebuild anyway.
const REBUILD_AFTER_HIDDEN_MS = 30_000;

/**
 * Drives the animated (WebGL) page background and keeps it alive across
 * backgrounding. whatamesh binds one WebGL context to one canvas and has no
 * context-loss handling, so when a mobile browser drops the context the canvas
 * stays blank for good. To recover we throw the canvas away (bumping
 * `canvasKey`, which makes Vue render a fresh `<canvas :key>`) and start a new
 * Gradient on it whenever the user comes back and the animation can't be
 * trusted to be running.
 */
export function useBackgroundGradient() {
  const canvasKey = ref(0);
  let gradient: Gradient | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let hiddenAt: number | null = null;
  let contextLost = false;
  let restarting = false;

  const onContextLost = (event: Event) => {
    // Without preventDefault the browser never tries to restore the context.
    event.preventDefault();
    contextLost = true;
    if (document.visibilityState === "visible") void restart();
  };

  const onContextRestored = () => void restart();

  const start = () => {
    canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR);
    if (!canvas) return;
    contextLost = false;
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    try {
      gradient = new Gradient();
      gradient.initGradient(CANVAS_SELECTOR);
    } catch (error) {
      // Background is decorative; the CSS fallback colour stays visible.
      console.error("Failed to initialize background gradient:", error);
      gradient = null;
    }
  };

  const stop = () => {
    if (gradient) {
      gradient.pause();
      // whatamesh's typings omit disconnect(), which removes its window
      // resize listener; without it every rebuild would leak one.
      (gradient as unknown as { disconnect(): void }).disconnect();
      gradient = null;
    }
    canvas?.removeEventListener("webglcontextlost", onContextLost);
    canvas?.removeEventListener("webglcontextrestored", onContextRestored);
    canvas = null;
  };

  const restart = async () => {
    if (restarting) return;
    restarting = true;
    try {
      stop();
      canvasKey.value++;
      await nextTick();
      start();
    } finally {
      restarting = false;
    }
  };

  const isCanvasDead = (): boolean => {
    if (contextLost || !gradient || !canvas) return true;
    // Returns the already-created context (the attributes are ignored).
    const gl = canvas.getContext("webgl");
    return !gl || gl.isContextLost();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    const awayMs = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    if (isCanvasDead() || awayMs > REBUILD_AFTER_HIDDEN_MS) void restart();
  };

  // Restored from the back/forward cache: the canvas is often blank.
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) void restart();
  };

  onMounted(() => {
    start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pageshow", onPageShow);
    stop();
  });

  return { canvasKey };
}
