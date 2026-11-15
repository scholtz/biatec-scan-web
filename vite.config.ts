import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import {
  buildPageTags,
  buildSocialMetaTags,
  ogImageFileName,
  ogImageVariantFor,
  type HeadTag,
  type SocialMetaEnv,
} from './src/config/socialMeta'

/**
 * Tags for the network this build targets, with a content hash of its share
 * image as the cache-buster (see buildSocialMetaTags). Throws with an
 * actionable message if the configuration or the image is unusable.
 */
function socialMetaTags(env: SocialMetaEnv, publicDir: string): HeadTag[] {
  const image = resolve(publicDir, 'og', ogImageFileName(ogImageVariantFor(env)))
  let bytes: Buffer
  try {
    bytes = readFileSync(image)
  } catch {
    throw new Error(
      `Share image ${image} is missing - render it with \`pnpm generate:og-images\`.`,
    )
  }
  const version = createHash('sha256').update(bytes).digest('hex').slice(0, 8)
  return buildSocialMetaTags(env, version)
}

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
      // Picked field by field because config.env is typed Record<string, any>.
      const read = (key: keyof SocialMetaEnv): string | undefined => {
        const value: unknown = config.env[key] // untyped by Vite, narrowed below
        return typeof value === 'string' ? value : undefined
      }
      const env: SocialMetaEnv = {
        VITE_NETWORK_LABEL: read('VITE_NETWORK_LABEL'),
        VITE_GENESIS_ID: read('VITE_GENESIS_ID'),
        VITE_SITE_URL: read('VITE_SITE_URL'),
      }
      try {
        tags = socialMetaTags(env, config.publicDir)
      } catch (e: unknown) {
        // A production build must not ship broken previews; the dev/preview
        // server is of no interest to crawlers, so there it's only a warning
        // and the page keeps its title and description.
        if (config.command === 'build') throw e
        tags = buildPageTags(env)
        config.logger.warn(
          `[social-meta] link-preview tags skipped: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
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
