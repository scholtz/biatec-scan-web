import { createRouter, createWebHistory } from "vue-router";
import Assets from "../views/Assets.vue";
// Lazy import for aggregated pools by asset

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

export default router;
