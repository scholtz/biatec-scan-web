import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import BlockDetails from "../views/BlockDetails.vue";
import TransactionDetails from "../views/TransactionDetails.vue";
import Search from "../views/Search.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Dashboard",
      component: Dashboard,
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
      path: "/search",
      name: "Search",
      component: Search,
    },
  ],
});

export default router;
