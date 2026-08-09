import { createRouter, createWebHistory } from "vue-router";
import Assets from "../views/Assets.vue";
// Lazy import for aggregated pools by asset

// After a new deploy the old hashed chunk files are gone, so a client still
// running the previous build fails to lazy-load route components with
// "Failed to fetch dynamically imported module". Recover by reloading once so
// the browser picks up the new index.html and chunk names.
const RELOAD_FLAG = "chunk-reload-at";

const reloadOnStaleChunk = (targetPath?: string) => {
  const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
  // Only auto-reload if we haven't just done so — avoids an infinite reload
  // loop if the chunk is genuinely unreachable (e.g. offline).
  if (Date.now() - last < 10_000) return false;
  sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  window.location.assign(targetPath ?? window.location.href);
  return true;
};

const isChunkLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  );
};

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Dashboard",
      component: Assets,
    },
    {
      path: "/explore",
      name: "Explore",
      component: () => import("../views/Dashboard.vue"),
    },
    {
      path: "/aggregated-pools/:assetId",
      name: "AggregatedPoolsByAsset",
      component: () => import("../views/AggregatedPoolsByAsset.vue"),
      props: true,
    },
    {
      path: "/assets",
      name: "Assets",

      component: Assets,
    },
    {
      path: "/trades",
      name: "Trades",
      component: () => import("../views/Trades.vue"),
    },
    {
      path: "/trades/:assetId1",
      name: "TradesByAsset",
      component: () => import("../views/Trades.vue"),
      props: true,
    },
    {
      path: "/trades/:assetId1/:assetId2",
      name: "TradesByPair",
      component: () => import("../views/Trades.vue"),
      props: true,
    },
    {
      path: "/favorite",
      name: "FavoriteAssets",
      component: () => import("../views/FavoriteAssets.vue"),
    },
    {
      path: "/settings",
      name: "Settings",
      component: () => import("../views/Settings.vue"),
    },
    {
      path: "/pools/:asset1",
      name: "PoolsByAsset",
      component: () => import("../views/PoolsByAssets.vue"),
      props: true,
    },
    {
      path: "/asset/:assetId",
      name: "AssetDetails",
      component: () => import("../views/AssetDetails.vue"),
      props: true,
    },
    {
      path: "/application/:appId",
      name: "ApplicationDetails",
      component: () => import("../views/ApplicationDetails.vue"),
      props: true,
    },
    {
      path: "/pools/:asset1/:asset2",
      name: "PoolsByAssets",
      component: () => import("../views/PoolsByAssets.vue"),
      props: true,
    },
    {
      path: "/block/:round",
      name: "BlockDetails",
      component: () => import("../views/BlockDetails.vue"),
      props: true,
    },
    {
      path: "/group/:round/:groupId",
      name: "GroupDetails",
      component: () => import("../views/GroupDetails.vue"),
      props: true,
    },
    {
      path: "/transaction/:txId",
      name: "TransactionDetails",
      component: () => import("../views/TransactionDetails.vue"),
      props: true,
    },
    {
      path: "/transaction/:txId/inner/:innerPath",
      name: "InnerTransactionDetails",
      component: () => import("../views/TransactionDetails.vue"),
      props: true,
    },
    {
      path: "/address/:address",
      name: "AddressDetails",
      component: () => import("../views/AddressDetails.vue"),
      props: true,
    },
    {
      path: "/pool/:poolAddress",
      name: "PoolDetails",
      component: () => import("../views/PoolDetails.vue"),
      props: true,
    },
    {
      path: "/search",
      name: "Search",
      component: () => import("../views/Search.vue"),
    },
    {
      path: "/about",
      name: "About",
      component: () => import("../views/About.vue"),
    },
  ],
});

router.onError((error, to) => {
  if (isChunkLoadError(error)) {
    // Navigate to the target route via a full page load so the new build's
    // index.html (with fresh chunk URLs) is fetched.
    reloadOnStaleChunk(to?.fullPath);
  }
});

// Vite fires this when a modulepreload/CSS preload of a chunk fails (covers
// failures outside router navigation, e.g. preloaded shared chunks).
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnStaleChunk()) {
    event.preventDefault();
  }
});

export default router;
