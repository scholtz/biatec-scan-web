import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import { buildSocialMetaTags } from './src/config/socialMeta'

/**
 * Injects the network-specific <title>, description, Open Graph and Twitter
 * Card tags into index.html at build time (link-preview crawlers don't run
 * JS, so setting them from main.ts would be invisible to them).
 */
function socialMeta(mode: string): Plugin {
  // Same sources Vite uses for import.meta.env: .env* files + process env
  // (the Docker build passes the VITE_* build args as process env).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    name: 'biatec-social-meta',
    transformIndexHtml: () => buildSocialMetaTags(env),
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    tailwindcss(),
    vueI18n({
      include: fileURLToPath(new URL('./src/i18n/locales/**', import.meta.url)),
    }),
    socialMeta(mode),
  ],
}))
