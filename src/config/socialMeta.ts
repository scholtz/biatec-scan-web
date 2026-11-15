// Open Graph / Twitter Card metadata for link previews.
//
// Crawlers (X, Discord, Telegram, Slack, LinkedIn, ...) do not execute
// JavaScript, so these tags must be in the static index.html. They are
// injected at build time by the `socialMeta` plugin in vite.config.ts from the
// same VITE_* variables as src/config/env.ts - which is why this module must
// stay free of `import.meta.env` and browser APIs (it runs in Node too).

/** A `<head>` tag to inject; structurally compatible with Vite's HtmlTagDescriptor. */
export interface HeadTag {
  tag: "title" | "meta";
  attrs?: Record<string, string>;
  children?: string;
  injectTo: "head";
}

/** The subset of build-time variables the social metadata depends on. */
export interface SocialMetaEnv {
  VITE_NETWORK_LABEL?: string;
  VITE_GENESIS_ID?: string;
  VITE_SITE_URL?: string;
}

/** One pre-rendered share image (see scripts/generate-og-images.ts). */
export interface OgImageVariant {
  /** File is served at `/og/<slug>.png`. */
  slug: string;
  /** Network name shown in the headline. */
  label: string;
  /** Host shown in the image footer. */
  host: string;
  /** Native token ticker used in the decorative market card. */
  unit: string;
}

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** Network-neutral image used by builds for a network without its own variant. */
export const defaultOgImageVariant: OgImageVariant = {
  slug: "default",
  label: "AVM",
  host: "scan.biatec.io",
  unit: "TOKEN",
};

/** Share image variants keyed by the genesis id of the network they depict. */
export const ogImageVariants: Record<string, OgImageVariant> = {
  "mainnet-v1.0": {
    slug: "algorand",
    label: "Algorand",
    host: "algorand.scan.biatec.io",
    unit: "ALGO",
  },
  "testnet-v1.0": {
    slug: "algorand-testnet",
    label: "Algorand Testnet",
    host: "testnet.scan.biatec.io",
    unit: "ALGO",
  },
  "voimain-v1.0": {
    slug: "voi",
    label: "Voi",
    host: "voi.scan.biatec.io",
    unit: "VOI",
  },
};

const SITE_NAME = "Biatec Scan";

/** Page title; also set at runtime by src/main.ts. */
export function pageTitle(networkLabel: string): string {
  return `${networkLabel} Explorer - ${SITE_NAME}`;
}

export function pageDescription(networkLabel: string): string {
  return (
    `${SITE_NAME} is a real-time ${networkLabel} DEX explorer: blocks, ` +
    `transactions, AMM trades, liquidity pools, asset prices and swap ` +
    `routing in one place.`
  );
}

/**
 * Builds the title, description, Open Graph and Twitter Card tags for the
 * network a build targets. Defaults mirror src/config/env.ts (Algorand
 * mainnet) so an unconfigured local build still yields valid tags.
 *
 * `og:url` / `rel=canonical` are deliberately omitted: the SPA serves this
 * one index.html for every route, so a fixed URL would make crawlers treat
 * every shared deep link (an asset, a pool, a transaction) as the home page.
 * Without it they fall back to the URL that was actually shared.
 */
export function buildSocialMetaTags(env: SocialMetaEnv): HeadTag[] {
  const networkLabel = env.VITE_NETWORK_LABEL || "Algorand";
  const genesisId = env.VITE_GENESIS_ID || "mainnet-v1.0";
  // Crawlers require an absolute image URL; strip trailing slashes so the
  // path join below can't produce "//og/...".
  const siteUrl = (
    env.VITE_SITE_URL || "https://algorand.scan.biatec.io"
  ).replace(/\/+$/, "");

  const variant = ogImageVariants[genesisId] ?? defaultOgImageVariant;
  const title = pageTitle(networkLabel);
  const description = pageDescription(networkLabel);
  const image = `${siteUrl}/og/${variant.slug}.png`;
  const imageAlt = `${SITE_NAME} - ${networkLabel} DEX explorer`;

  const meta = (
    key: "name" | "property",
    id: string,
    content: string,
  ): HeadTag => ({
    tag: "meta",
    attrs: { [key]: id, content },
    injectTo: "head",
  });

  return [
    { tag: "title", children: title, injectTo: "head" },
    meta("name", "description", description),

    meta("property", "og:type", "website"),
    meta("property", "og:site_name", SITE_NAME),
    meta("property", "og:locale", "en_US"),
    meta("property", "og:title", title),
    meta("property", "og:description", description),
    meta("property", "og:image", image),
    meta("property", "og:image:type", "image/png"),
    meta("property", "og:image:width", String(OG_IMAGE_WIDTH)),
    meta("property", "og:image:height", String(OG_IMAGE_HEIGHT)),
    meta("property", "og:image:alt", imageAlt),

    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", description),
    meta("name", "twitter:image", image),
    meta("name", "twitter:image:alt", imageAlt),
  ];
}
