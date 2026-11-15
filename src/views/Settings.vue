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
          role="radiogroup"
          :aria-label="$t('theme.selectLabel')"
        >
          <button
            v-for="option in THEME_MODES"
            :key="option"
            type="button"
            role="radio"
            :aria-checked="mode === option"
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
import { networkLabel } from "../config/env";
import { THEME_MODES, useTheme } from "../composables/useTheme";

const { mode, setMode } = useTheme();
</script>