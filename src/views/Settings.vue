<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-white">{{ $t('settings.title') }}</h1>
    
    <div class="card space-y-6">
      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-white">{{ $t('settings.language.title') }}</h2>
        <p class="text-gray-300 text-sm">
          {{ $t('settings.language.description') }}
        </p>
        
        <div class="flex items-center space-x-4 relative z-10">
          <label class="text-gray-300 text-sm font-medium">
            {{ $t('settings.language.selectLabel') }}:
          </label>
          <LanguageSwitcher />
        </div>
      </div>
      
      <div class="border-t border-dark-700/50 pt-6 space-y-3">
        <h2 class="text-lg font-semibold text-white">{{ $t('settings.preferences.title') }}</h2>
        <p class="text-gray-300 text-sm">
          {{ $t('settings.preferences.description') }}
        </p>
      </div>
    </div>
    
    <div class="card space-y-3">
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
</script>