import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";
import { WalletManagerPlugin } from "@txnlab/use-wallet-vue";
import { networkLabel } from "./config/env";
import { buildWalletManagerConfig } from "./wallet/walletConfig";

document.title = `${networkLabel} Explorer - Biatec Scan`;

createApp(App)
  .use(router)
  .use(i18n)
  .use(WalletManagerPlugin, buildWalletManagerConfig())
  .mount("#app");
