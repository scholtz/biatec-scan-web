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
  siteOriginOf,
  socialMetaWarnings,
  type HeadTag,
  type SocialMetaEnv,
} from './src/config/socialMeta'

/**
 * Short content hash of the share image this build references, used as its
 * cache-buster (see buildSocialMetaTags).
 */
function shareImageVersion(env: SocialMetaEnv, publicDir: string): string {
  const image = resolve(publicDir, 'og', ogImageFileName(ogImageVariantFor(env)))
  let bytes: Buffer
  try {
    bytes = readFileSync(image)
  } catch (e: unknown) {
    const reason = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Cannot read share image ${image} (${reason}). The images are rendered by \`pnpm generate:og-images\`.`,
    )
  }
  return createHash('sha256').update(bytes).digest('hex').slice(0, 8)
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
      const isBuild = config.command === 'build'
      try {
        // The image is only referenced (and so only needs to exist) when
        // VITE_SITE_URL provides the origin for its absolute URL, and the
        // cache-buster only matters in the built page that crawlers fetch.
        const version =
          isBuild && siteOriginOf(env)
            ? shareImageVersion(env, config.publicDir)
            : undefined
        tags = buildSocialMetaTags(env, version)
        // Crawlers never see the dev server, so only builds are warned.
        if (isBuild) {
          for (const warning of socialMetaWarnings(env)) {
            config.logger.warn(`[social-meta] ${warning}`)
          }
        }
      } catch (e: unknown) {
        // A malformed VITE_SITE_URL or an unreadable image must not ship in
        // a production build; on the dev server a malformed URL only costs
        // the image tags.
        if (isBuild) throw e
        config.logger.warn(
          `[social-meta] ${e instanceof Error ? e.message : String(e)}`,
        )
        tags = buildSocialMetaTags({ ...env, VITE_SITE_URL: undefined })
      }
    },
    // 'pre': appended to <head> before Vite adds the bundle's script /
    // modulepreload / stylesheet tags, so the metadata stays near the top
    // for crawlers that only read the beginning of the document.
    transformIndexHtml: { order: 'pre', handler: () => tags },
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
