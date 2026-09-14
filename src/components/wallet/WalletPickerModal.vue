<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      @click.self="close"
    >
      <div
        class="w-full max-w-md bg-dark-900 border border-dark-700/60 rounded-xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('wallet.pickerTitle')"
      >
        <div
          class="flex items-center justify-between px-5 py-4 border-b border-dark-700/50"
        >
          <h2 class="text-lg font-semibold text-white">
            {{ $t("wallet.pickerTitle") }}
          </h2>
          <button
            type="button"
            class="text-gray-400 hover:text-white p-1 rounded"
            :aria-label="$t('wallet.close')"
            @click="close"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="px-5 pt-3 text-sm text-gray-400">
          {{ $t("wallet.pickerDescription") }}
        </p>
        <div class="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
          <button
            v-for="wallet in wallets"
            :key="wallet.id"
            type="button"
            class="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-dark-700/50 bg-dark-800/50 hover:bg-dark-700/60 text-left text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
            :disabled="connectingId !== null"
            @click="connect(wallet)"
          >
            <img
              :src="wallet.metadata.icon"
              :alt="wallet.metadata.name"
              class="w-8 h-8 rounded-md"
            />
            <span class="flex-1 min-w-0">
              <span class="block font-medium truncate">
                {{ wallet.metadata.name }}
              </span>
              <span
                v-if="wallet.id === BIATEC_WALLET_ID"
                class="block text-xs text-primary-300"
              >
                {{ $t("wallet.recommended") }}
              </span>
            </span>
            <span
              v-if="connectingId === wallet.id"
              class="loading-spinner w-5 h-5 border-2"
            />
          </button>
          <p v-if="wallets.length === 0" class="text-sm text-gray-400 px-2">
            {{ $t("wallet.noWallets") }}
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useWallet, type Wallet } from "@txnlab/use-wallet-vue";
import { useToast } from "../../composables/useToast";
import { BIATEC_WALLET_ID } from "../../wallet/walletConfig";

const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const { showToast } = useToast();
const { wallets } = useWallet();
const connectingId = ref<string | null>(null);

function close() {
  if (connectingId.value !== null) return;
  emit("close");
}

async function connect(wallet: Wallet) {
  connectingId.value = wallet.id;
  try {
    await wallet.connect();
    wallet.setActive();
    showToast(t("wallet.connected", { wallet: wallet.metadata.name }), "success");
    emit("close");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    // A user closing the wallet's own dialog is not an error worth a toast.
    if (!/cancel|reject|closed|dismiss/i.test(message)) {
      showToast(message, "error", 6000);
    }
  } finally {
    connectingId.value = null;
  }
}
</script>
