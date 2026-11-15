import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";
import { networkLabel } from "./config/env";
import { pageTitle } from "./config/socialMeta";
import { initTheme } from "./composables/useTheme";

// The first paint is themed by public/theme-init.js; this syncs reactive state.
initTheme();

// Same title the build baked into index.html (see vite.config.ts).
document.title = pageTitle(networkLabel);

const app = createApp(App).use(router).use(i18n);
app.mount("#app");

// The wallet stack is only needed by the navbar's connect button and the
// Swap page, so it is installed from a separate chunk after first paint;
// consumers await `walletReady` (src/wallet/walletReady.ts) before use.
void import("./wallet/installWallet").then(({ installWallet }) =>
  installWallet(app)
);
