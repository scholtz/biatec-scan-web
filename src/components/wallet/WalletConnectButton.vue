<template>
  <div class="relative" ref="root">
    <!-- Not connected -->
    <button
      v-if="!activeAddress"
      type="button"
      class="btn-primary text-sm whitespace-nowrap"
      :class="compact ? 'w-full' : ''"
      @click="pickerOpen = true"
    >
      {{ $t("wallet.connect") }}
    </button>

    <!-- Connected -->
    <button
      v-else
      type="button"
      class="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800/60 border border-dark-700/50 text-white text-sm hover:bg-dark-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
      :class="compact ? 'w-full justify-between' : ''"
      :title="activeAddress"
      @click="menuOpen = !menuOpen"
    >
      <img
        v-if="activeWallet?.metadata.icon"
        :src="activeWallet.metadata.icon"
        :alt="activeWallet.metadata.name"
        class="w-5 h-5 rounded"
      />
      <span class="font-mono">{{ formatAddress(activeAddress) }}</span>
      <svg
        class="w-4 h-4 transition-transform duration-200"
        :class="{ 'rotate-180': menuOpen }"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <!-- Account menu -->
    <div
      v-if="menuOpen && activeAddress"
      class="absolute right-0 mt-1 min-w-[240px] bg-dark-800 border border-dark-700/50 rounded-lg shadow-lg z-[9999] py-1"
    >
      <div class="px-3 py-2 text-xs text-gray-400 border-b border-dark-700/50">
        {{ activeWallet?.metadata.name }}
      </div>
      <template v-if="(activeWalletAccounts?.length ?? 0) > 1">
        <button
          v-for="account in activeWalletAccounts"
          :key="account.address"
          type="button"
          class="w-full px-3 py-2 text-left text-sm text-white hover:bg-dark-700/60 font-mono flex items-center justify-between"
          @click="selectAccount(account.address)"
        >
          <span>{{ formatAddress(account.address) }}</span>
          <span
            v-if="account.address === activeAddress"
            class="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"
          />
        </button>
        <div class="border-t border-dark-700/50 my-1" />
      </template>
      <router-link
        :to="`/address/${activeAddress}`"
        class="block px-3 py-2 text-sm text-white hover:bg-dark-700/60"
        @click="menuOpen = false"
      >
        {{ $t("wallet.viewAccount") }}
      </router-link>
      <CopyToClipboard
        :text="activeAddress"
        :toast-message="$t('wallet.copied')"
        :title="$t('wallet.copyAddress')"
        button-class="w-full px-3 py-2 text-left text-sm text-white hover:bg-dark-700/60 rounded-none"
        @click="menuOpen = false"
      >
        {{ $t("wallet.copyAddress") }}
      </CopyToClipboard>
      <button
        type="button"
        class="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-dark-700/60"
        @click="disconnect"
      >
        {{ $t("wallet.disconnect") }}
      </button>
    </div>

    <WalletPickerModal v-if="pickerOpen" @close="pickerOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useWallet } from "@txnlab/use-wallet-vue";
import { useToast } from "../../composables/useToast";
import { algorandService } from "../../services/algorandService";
import { errorMessage } from "../../swap/errors";
import CopyToClipboard from "../CopyToClipboard.vue";
import WalletPickerModal from "./WalletPickerModal.vue";

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const { showToast } = useToast();
const { activeAddress, activeWallet, activeWalletAccounts } = useWallet();

const root = ref<HTMLElement | null>(null);
const menuOpen = ref(false);
const pickerOpen = ref(false);

const formatAddress = (address: string) => algorandService.formatAddress(address);

function selectAccount(address: string) {
  activeWallet.value?.setActiveAccount(address);
  menuOpen.value = false;
}

async function disconnect() {
  menuOpen.value = false;
  try {
    await activeWallet.value?.disconnect();
  } catch (e: unknown) {
    showToast(errorMessage(e), "error");
  }
}

function onDocumentClick(event: MouseEvent) {
  if (!menuOpen.value) return;
  if (root.value && !root.value.contains(event.target as Node)) {
    menuOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onUnmounted(() => document.removeEventListener("click", onDocumentClick));
</script>
