import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { Gradient } from "whatamesh";

const CANVAS_SELECTOR = "#gradient-canvas";
// Mobile browsers throttle/discard WebGL for backgrounded tabs without always
// firing context-loss events, so after being away this long we rebuild anyway.
const REBUILD_AFTER_HIDDEN_MS = 120_000;
// whatamesh finishes initialising asynchronously (after CSS vars resolve), so a
// retired instance is paused/disconnected again after these delays to catch a
// late init() that would re-register its resize listener on a dead canvas.
const RETIRE_RECHECK_MS = [1_000, 3_000];
// Don't probe the context before whatamesh has had time to create it itself
// (getContext() would otherwise create one with different attributes).
const CONTEXT_PROBE_AFTER_MS = 1_000;
// Back-off for context-loss storms (e.g. GPU reset): at most this many
// automatic rebuilds per window.
const MAX_REBUILDS_PER_WINDOW = 3;
const REBUILD_WINDOW_MS = 10_000;

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
  let startedAt = 0;
  let restarting = false;
  let restartQueued = false;
  let recentRebuilds: number[] = [];

  const onContextLost = (event: Event) => {
    // Without preventDefault the browser never tries to restore the context.
    event.preventDefault();
    contextLost = true;
    if (document.visibilityState === "visible") void restart(true);
  };

  const onContextRestored = () => void restart(true);

  const start = () => {
    canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR);
    if (!canvas) return;
    contextLost = false;
    startedAt = Date.now();
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

  const retire = (old: Gradient) => {
    old.pause();
    // whatamesh's typings omit disconnect(), which removes its window resize
    // listener; without it every rebuild would leak one. Optional call so a
    // library upgrade that drops it can't abort a rebuild.
    (old as unknown as { disconnect?: () => void }).disconnect?.();
  };

  const stop = () => {
    if (gradient) {
      const old = gradient;
      gradient = null;
      retire(old);
      RETIRE_RECHECK_MS.forEach((ms) => setTimeout(() => retire(old), ms));
    }
    canvas?.removeEventListener("webglcontextlost", onContextLost);
    canvas?.removeEventListener("webglcontextrestored", onContextRestored);
    canvas = null;
  };

  // `automatic` rebuilds (context-loss events) are rate limited; visibility
  // driven ones are user-initiated and always allowed.
  const restart = async (automatic = false): Promise<void> => {
    if (automatic) {
      const now = Date.now();
      recentRebuilds = recentRebuilds.filter((t) => now - t < REBUILD_WINDOW_MS);
      if (recentRebuilds.length >= MAX_REBUILDS_PER_WINDOW) return;
      recentRebuilds.push(now);
    }
    if (restarting) {
      // Don't drop it: run once more after the in-flight rebuild finishes.
      restartQueued = true;
      return;
    }
    restarting = true;
    try {
      stop();
      canvasKey.value++;
      await nextTick();
      start();
    } finally {
      restarting = false;
    }
    if (restartQueued) {
      restartQueued = false;
      await restart();
    }
  };

  const isCanvasDead = (): boolean => {
    if (contextLost || !gradient || !canvas) return true;
    if (Date.now() - startedAt < CONTEXT_PROBE_AFTER_MS) return false;
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
