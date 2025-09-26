<template>
  <div class="relative">
    <button
      @click="toggleDropdown"
      class="flex items-center space-x-2 px-2 py-1 rounded-lg bg-dark-800/50 border border-dark-700/50 text-white hover:bg-dark-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
      :title="$t('common.toggleLanguage')"
    >
      <span class="text-sm">{{ currentLocale.toUpperCase() }}</span>
      <svg
        class="w-4 h-4 transition-transform duration-200"
        :class="{ 'rotate-180': isDropdownOpen }"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    
    <div
      v-if="isDropdownOpen"
      class="absolute right-0 mt-1 min-w-[100px] bg-dark-800 border border-dark-700/50 rounded-lg shadow-lg z-50"
    >
      <button
        v-for="locale in availableLocales"
        :key="locale.code"
        @click="changeLanguage(locale.code)"
        class="w-full px-3 py-2 text-left text-sm text-white hover:bg-dark-700/60 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg"
        :class="{ 'bg-primary-600/20 text-primary-300': locale.code === currentLocale }"
      >
        {{ locale.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const isDropdownOpen = ref(false)

const availableLocales = [
  { code: 'en', name: 'English' },
  { code: 'sk', name: 'Slovenčina' }
]

const currentLocale = computed(() => locale.value)

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const changeLanguage = (localeCode: string) => {
  locale.value = localeCode
  localStorage.setItem('locale', localeCode)
  isDropdownOpen.value = false
}

const closeDropdown = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.closest('.relative')) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  // Load saved locale or default to English
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && availableLocales.some(l => l.code === savedLocale)) {
    locale.value = savedLocale
  }
  
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>