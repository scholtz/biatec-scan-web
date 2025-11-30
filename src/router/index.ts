import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import BlockDetails from "../views/BlockDetails.vue";
import TransactionDetails from "../views/TransactionDetails.vue";
import AddressDetails from "../views/AddressDetails.vue";
import PoolDetails from "../views/PoolDetails.vue";
import Search from "../views/Search.vue";
import PoolsByAssets from "../views/PoolsByAssets.vue";
import AssetDetails from "../views/AssetDetails.vue";
import ApplicationDetails from "../views/ApplicationDetails.vue";
import Assets from "../views/Assets.vue";
import FavoriteAssets from "../views/FavoriteAssets.vue";
import Settings from "../views/Settings.vue";
import About from "../views/About.vue";
// Lazy import for aggregated pools by asset

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Dashboard",
      component: Dashboard,
    },
    {
      path: "/aggregated-pools/:assetId",
      name: "AggregatedPoolsByAsset",
      component: () => import("../views/AggregatedPoolsByAsset.vue"),
      props: true,
    },
    { path: "/assets", name: "Assets", component: Assets },
    { path: "/favorite", name: "FavoriteAssets", component: FavoriteAssets },
    { path: "/settings", name: "Settings", component: Settings },
    {
      path: "/pools/:asset1",
      name: "PoolsByAsset",
      component: PoolsByAssets,
      props: true,
    },
    {
      path: "/asset/:assetId",
      name: "AssetDetails",
      component: AssetDetails,
      props: true,
    },
    {
      path: "/application/:appId",
      name: "ApplicationDetails",
      component: ApplicationDetails,
      props: true,
    },
    {
      path: "/pools/:asset1/:asset2",
      name: "PoolsByAssets",
      component: PoolsByAssets,
      props: true,
    },
    {
      path: "/block/:round",
      name: "BlockDetails",
      component: BlockDetails,
      props: true,
    },
    {
      path: "/transaction/:txId",
      name: "TransactionDetails",
      component: TransactionDetails,
      props: true,
    },
    {
      path: "/transaction/:txId/inner/:innerPath",
      name: "InnerTransactionDetails",
      component: TransactionDetails,
      props: true,
    },
    {
      path: "/address/:address",
      name: "AddressDetails",
      component: AddressDetails,
      props: true,
    },
    {
      path: "/pool/:poolAddress",
      name: "PoolDetails",
      component: PoolDetails,
      props: true,
    },
    {
      path: "/search",
      name: "Search",
      component: Search,
    },
    { path: "/about", name: "About", component: About },
  ],
});

export default router;
