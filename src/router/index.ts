import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import BlockDetails from "../views/BlockDetails.vue";
import TransactionDetails from "../views/TransactionDetails.vue";
import AddressDetails from "../views/AddressDetails.vue";
import PoolDetails from "../views/PoolDetails.vue";
import Search from "../views/Search.vue";
import PoolsByAssets from "../views/PoolsByAssets.vue";
import AssetDetails from "../views/AssetDetails.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Dashboard",
      component: Dashboard,
    },
    {
      path: "/assets",
      name: "Assets",
      component: () => import("../views/Assets.vue"),
    },
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
  ],
});

export default router;
