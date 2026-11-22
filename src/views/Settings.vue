<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-white">{{ $t('settings.title') }}</h1>
    
    <div class="card space-y-6 relative z-20">
      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-white">{{ $t('settings.language.title') }}</h2>
        <p class="text-gray-300 text-sm">
          {{ $t('settings.language.description') }}
        </p>
        
        <div class="flex items-center space-x-4 relative z-30">
          <label class="text-gray-300 text-sm font-medium">
            {{ $t('settings.language.selectLabel') }}:
          </label>
          <LanguageSwitcher />
        </div>
      </div>
      
      <div class="border-t border-dark-700/50 pt-6 space-y-3">
        <h2 class="text-lg font-semibold text-white">{{ $t('theme.title') }}</h2>
        <p class="text-gray-300 text-sm">{{ $t('theme.description') }}</p>
        <div
          class="inline-flex rounded-lg border border-dark-600/60 overflow-hidden"
          role="group"
          :aria-label="$t('theme.selectLabel')"
        >
          <button
            v-for="option in THEME_MODES"
            :key="option"
            type="button"
            :aria-pressed="mode === option"
            :data-testid="`theme-option-${option}`"
            class="px-4 py-2 text-sm min-h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            :class="
              mode === option
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800/60 text-gray-300 hover:bg-dark-700/60'
            "
            @click="setMode(option)"
          >
            {{ $t(`theme.${option}`) }}
          </button>
        </div>
      </div>

      <div class="border-t border-dark-700/50 pt-6 space-y-3">
        <h2 class="text-lg font-semibold text-white">{{ $t('settings.preferences.title') }}</h2>
        <p class="text-gray-300 text-sm">
          {{ $t('settings.preferences.description') }}
        </p>
      </div>
    </div>
    
    <div class="card space-y-4 relative z-0" data-testid="custom-nodes">
      <h2 class="text-lg font-semibold text-white">{{ $t('settings.nodes.title') }}</h2>
      <p class="text-gray-300 text-sm">{{ $t('settings.nodes.description') }}</p>

      <div v-for="node in nodeFields" :key="node.kind" class="space-y-2">
        <label :for="`node-${node.kind}`" class="block text-sm font-medium text-gray-300">
          {{ $t(node.label) }}
        </label>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            :id="`node-${node.kind}`"
            v-model="node.value"
            type="url"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            :placeholder="node.defaultUrl"
            :data-testid="`node-input-${node.kind}`"
            class="flex-1 min-w-0 px-3 py-2 rounded-lg bg-dark-800/60 border border-dark-600/60 text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            @input="node.result = null"
          />
          <button
            type="button"
            class="btn-secondary text-sm min-h-10"
            :disabled="node.testing"
            :data-testid="`node-test-${node.kind}`"
            @click="testNode(node)"
          >
            {{ node.testing ? $t('settings.nodes.testing') : $t('settings.nodes.test') }}
          </button>
        </div>
        <p class="text-xs text-gray-400 break-all">
          {{ $t('settings.nodes.defaultHint', { url: node.defaultUrl }) }}
          <span v-if="node.active" class="text-primary-400 ml-1">
            · {{ $t('settings.nodes.usingCustom') }}
          </span>
        </p>
        <p
          v-if="node.result"
          class="text-sm"
          :class="node.result.ok ? 'text-green-400' : 'text-red-400'"
          role="status"
          :data-testid="`node-result-${node.kind}`"
        >
          {{ node.result.message }}
        </p>
      </div>

      <p v-if="saveError" class="text-sm text-red-400" role="alert">{{ saveError }}</p>

      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-primary text-sm min-h-10" data-testid="nodes-save" @click="save">
          {{ $t('settings.nodes.save') }}
        </button>
        <button type="button" class="btn-secondary text-sm min-h-10" data-testid="nodes-reset" @click="reset">
          {{ $t('settings.nodes.reset') }}
        </button>
      </div>
    </div>

    <div class="card space-y-3 relative z-0">
      <h2 class="text-lg font-semibold text-white">{{ $t('settings.aboutPage.title') }}</h2>
      <p class="text-gray-300 text-sm">{{ $t('settings.aboutPage.description', { network: networkLabel }) }}</p>
      <router-link to="/about" class="inline-block btn-secondary text-sm">
        {{ $t('settings.aboutPage.link') }}
      </router-link>
    </div>

    <div class="card space-y-3 relative z-0">
      <h2 class="text-lg font-semibold text-white">{{ $t('settings.about.title') }}</h2>
      <div class="space-y-2 text-sm text-gray-300">
        <p><strong class="text-white">{{ $t('settings.about.version') }}:</strong> 1.0.0</p>
        <p><strong class="text-white">{{ $t('settings.about.buildWith') }}:</strong> Vue 3, TypeScript, Tailwind CSS</p>
        <p>
          <strong class="text-white">{{ $t('settings.about.repository') }}:</strong>
          <a 
            href="https://github.com/scholtz/biatec-scan-web" 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-primary-400 hover:text-primary-300 underline ml-1"
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LanguageSwitcher from "../components/LanguageSwitcher.vue";
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  algodUrl,
  defaultAlgodUrl,
  defaultIndexerUrl,
  genesisId,
  indexerUrl,
  networkLabel,
} from "../config/env";
import {
  normalizeNodeUrl,
  saveNodeOverrides,
  type NodeOverrides,
} from "../config/nodeOverrides";
import { THEME_MODES, useTheme } from "../composables/useTheme";
import { checkNode, type NodeKind } from "../services/nodeCheck";

const { mode, setMode } = useTheme();
const { t } = useI18n();

interface NodeField {
  kind: NodeKind;
  label: "settings.nodes.algodLabel" | "settings.nodes.indexerLabel";
  defaultUrl: string;
  /** Whether a custom node is currently in effect (differs from the default). */
  active: boolean;
  value: string;
  testing: boolean;
  result: { ok: boolean; message: string } | null;
}

// Show only the custom value (empty = use default) so the default stays a placeholder.
const nodeFields = reactive<NodeField[]>([
  {
    kind: "algod",
    label: "settings.nodes.algodLabel",
    defaultUrl: defaultAlgodUrl,
    active: algodUrl !== defaultAlgodUrl,
    value: algodUrl !== defaultAlgodUrl ? algodUrl : "",
    testing: false,
    result: null,
  },
  {
    kind: "indexer",
    label: "settings.nodes.indexerLabel",
    defaultUrl: defaultIndexerUrl,
    active: indexerUrl !== defaultIndexerUrl,
    value: indexerUrl !== defaultIndexerUrl ? indexerUrl : "",
    testing: false,
    result: null,
  },
]);
const saveError = ref("");

/** Validate one field; blank means "use the default". Returns null and sets the field error when invalid. */
function resolveField(node: NodeField): string | undefined | null {
  if (!node.value.trim()) return undefined;
  const parsed = normalizeNodeUrl(node.value);
  if (parsed.ok) return parsed.url;
  node.result = { ok: false, message: t(`settings.nodes.${parsed.error}`) };
  return null;
}

async function testNode(node: NodeField) {
  const resolved = resolveField(node);
  if (resolved === null) return;
  const url = resolved ?? node.defaultUrl;
  node.testing = true;
  try {
    const outcome = await checkNode(node.kind, url, genesisId);
    node.result =
      outcome.status === "ok"
        ? { ok: true, message: t("settings.nodes.ok", { genesis: outcome.genesis }) }
        : outcome.status === "wrongNetwork"
          ? {
              ok: false,
              message: t("settings.nodes.wrongNetwork", {
                actual: outcome.actual,
                expected: genesisId,
              }),
            }
          : { ok: false, message: t("settings.nodes.failed") };
  } finally {
    node.testing = false;
  }
}

function persist(overrides: NodeOverrides) {
  saveError.value = "";
  if (!saveNodeOverrides(overrides)) {
    saveError.value = t("settings.nodes.storageFailed");
    return;
  }
  // env.ts reads the overrides once at module init, so reload to apply them everywhere.
  window.location.reload();
}

function save() {
  const [algod, indexer] = nodeFields.map(resolveField);
  if (algod === null || indexer === null) return;
  persist({ algodUrl: algod, indexerUrl: indexer });
}

function reset() {
  persist({});
}
</script>