import { computed, onMounted, onUnmounted, ref } from "vue";

/**
 * Screen-size tiers a column can require before it's shown, independent of the
 * mobile/desktop (`md:`) card-vs-grid switch which is handled separately.
 *
 *  - "sm"  : shown on any non-mobile width (tablets, laptops, desktops, 4K...)
 *  - "lg"  : shown from a "Full HD desktop" width upward only (hidden on tablets/narrow windows)
 *  - "xl4k": shown only on very large/4K-class monitors
 */
export const VIEWPORT_TIER_MIN_WIDTH = {
  sm: 0,
  lg: 1600,
  xl4k: 2560,
} as const;

export type ViewportTier = keyof typeof VIEWPORT_TIER_MIN_WIDTH;

const TIER_ORDER: ViewportTier[] = ["sm", "lg", "xl4k"];

export function tierAtLeast(current: ViewportTier, required: ViewportTier): boolean {
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(required);
}

/**
 * Tracks the current viewport tier reactively via a window resize listener.
 */
export function useViewportTier() {
  const width = ref(typeof window !== "undefined" ? window.innerWidth : 1920);

  function update() {
    width.value = window.innerWidth;
  }

  onMounted(() => {
    window.addEventListener("resize", update);
    update();
  });
  onUnmounted(() => {
    window.removeEventListener("resize", update);
  });

  const tier = computed<ViewportTier>(() => {
    if (width.value >= VIEWPORT_TIER_MIN_WIDTH.xl4k) return "xl4k";
    if (width.value >= VIEWPORT_TIER_MIN_WIDTH.lg) return "lg";
    return "sm";
  });

  return { width, tier };
}
