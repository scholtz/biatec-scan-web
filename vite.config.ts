import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import {
  buildSocialMetaTags,
  ogImageFileName,
  ogImageVariantFor,
  type HeadTag,
} from './src/config/socialMeta'

/**
 * Injects the network-specific <title>, description, Open Graph and Twitter
 * Card tags into index.html at build time (link-preview crawlers don't run
 * JS, so setting them from main.ts would be invisible to them).
 */
function socialMeta(): Plugin {
  let tags: HeadTag[] = []
  return {
    name: 'biatec-social-meta',
    configResolved(config) {
      // config.env is the very env the bundle's import.meta.env is built
      // from (.env* files in envDir + process env, e.g. Docker build args),
      // so the HTML and the JS can't end up describing different networks.
      const env = config.env
      // Content hash of the share image as a cache-buster, see
      // buildSocialMetaTags.
      const image = resolve(
        config.publicDir,
        'og',
        ogImageFileName(ogImageVariantFor(env)),
      )
      const version = createHash('sha256')
        .update(readFileSync(image))
        .digest('hex')
        .slice(0, 8)
      tags = buildSocialMetaTags(env, version)
    },
    transformIndexHtml: () => tags,
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    vueI18n({
      include: fileURLToPath(new URL('./src/i18n/locales/**', import.meta.url)),
    }),
    socialMeta(),
  ],
})
