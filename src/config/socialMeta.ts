// Open Graph / Twitter Card metadata for link previews.
//
// Crawlers (X, Discord, Telegram, Slack, LinkedIn, ...) do not execute
// JavaScript, so these tags must be in the static index.html. They are
// injected at build time by the `socialMeta` plugin in vite.config.ts from the
// same VITE_* variables as src/config/env.ts - which is why this module must
// stay free of `import.meta.env` and browser APIs (it runs in Node too).

import { DEFAULT_GENESIS_ID, DEFAULT_NETWORK_LABEL } from "./networkDefaults";

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
  /** Public origin of the deployment; optional for the networks listed below. */
  VITE_SITE_URL?: string;
}

/**
 * One pre-rendered share image (see scripts/generate-og-images.ts). The text
 * is baked into the pixels, so unlike the tags it can't follow the VITE_*
 * variables - a new network needs an entry here and a re-render, and until it
 * has one its build uses the network-neutral default image.
 */
export interface OgImageVariant {
  /** File is served at `/og/<slug>.jpg`. */
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
export const OG_IMAGE_TYPE = "image/jpeg";

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

/** Every variant that must have a rendered file in public/og/. */
export const allOgImageVariants: OgImageVariant[] = [
  defaultOgImageVariant,
  ...Object.values(ogImageVariants),
];

/** File name of a variant's rendered image inside public/og/. */
export function ogImageFileName(variant: OgImageVariant): string {
  return `${variant.slug}.jpg`;
}

/** Share image variant for the network a build targets. */
export function ogImageVariantFor(env: SocialMetaEnv): OgImageVariant {
  return (
    ogImageVariants[env.VITE_GENESIS_ID || DEFAULT_GENESIS_ID] ??
    defaultOgImageVariant
  );
}

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
 * Public origin the absolute image URL is built on: VITE_SITE_URL, or for a
 * known network its own production host. An unknown network without
 * VITE_SITE_URL is an error rather than a silent fallback to another
 * deployment's host, which would point its previews at the wrong site.
 */
function siteUrlFor(env: SocialMetaEnv, variant: OgImageVariant): string {
  if (env.VITE_SITE_URL) {
    // Strip trailing slashes so the path join can't produce "//og/...".
    return env.VITE_SITE_URL.replace(/\/+$/, "");
  }
  if (variant === defaultOgImageVariant) {
    throw new Error(
      `VITE_SITE_URL must be set for network "${env.VITE_GENESIS_ID}": the ` +
        `og:image / twitter:image tags need the deployment's public origin ` +
        `(e.g. https://<network>.scan.biatec.io).`,
    );
  }
  return `https://${variant.host}`;
}

/**
 * Builds the title, description, Open Graph and Twitter Card tags for the
 * network a build targets. Defaults mirror src/config/env.ts (Algorand
 * mainnet) so an unconfigured local build still yields valid tags.
 *
 * `imageVersion` (a content hash, supplied by the Vite plugin) is appended
 * to the image URL as a cache-buster: crawlers cache the image by URL for a
 * long time, so a re-rendered image at an unchanged URL would never show up.
 *
 * `og:url` / `rel=canonical` are deliberately omitted: the SPA serves this
 * one index.html for every route, so a fixed URL would make crawlers treat
 * every shared deep link (an asset, a pool, a transaction) as the home page.
 * Without it they fall back to the URL that was actually shared.
 */
export function buildSocialMetaTags(
  env: SocialMetaEnv,
  imageVersion?: string,
): HeadTag[] {
  // Same fallback as `networkLabel` in env.ts, so this title is the one
  // main.ts sets at runtime.
  const networkLabel = env.VITE_NETWORK_LABEL || DEFAULT_NETWORK_LABEL;
  const variant = ogImageVariantFor(env);

  const title = pageTitle(networkLabel);
  const description = pageDescription(networkLabel);
  const image =
    `${siteUrlFor(env, variant)}/og/${ogImageFileName(variant)}` +
    (imageVersion ? `?v=${imageVersion}` : "");
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
    meta("property", "og:image:type", OG_IMAGE_TYPE),
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
