// Open Graph / Twitter Card metadata for link previews.
//
// Crawlers (X, Discord, Telegram, Slack, LinkedIn, ...) do not execute
// JavaScript, so these tags must be in the static index.html. They are
// injected at build time by the `socialMeta` plugin in vite.config.ts from the
// same VITE_* variables as src/config/env.ts. This module is build-time only
// (Vite config, image generator, tests) - the browser bundle must not import
// it; what both sides share lives in ./siteIdentity.

import {
  DEFAULT_GENESIS_ID,
  DEFAULT_NETWORK_LABEL,
  SITE_NAME,
  pageTitle,
} from "./siteIdentity";

/**
 * A `<head>` tag to inject. Deliberately narrower than Vite's
 * HtmlTagDescriptor (string-only attrs/children); vite.config.ts returns it
 * from transformIndexHtml, so any incompatibility is a compile error there.
 */
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
  /** Public origin of the deployment; only needed for networks not listed below. */
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
  /**
   * Production host of the network's deployment: shown in the image footer
   * and the default origin of the image URL. Empty for the network-neutral
   * image, which names no deployment.
   */
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
  host: "",
  unit: "TOKEN",
};

/**
 * Share image variants keyed by the genesis id of the network they depict.
 * `host` is printed in the image, which is why the production origin of the
 * known networks lives here and not in the CI matrix (keep in sync with the
 * ingress host in k8s/<network>/deployment-fe.yaml and re-render on change).
 * A deployment on any other host - a preview, a fork, a network without a
 * variant yet - sets VITE_SITE_URL instead.
 */
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
  const genesisId = env.VITE_GENESIS_ID || DEFAULT_GENESIS_ID;
  // Object.hasOwn: the id is external input, and "constructor"/"toString"
  // would otherwise resolve to inherited Object.prototype members.
  return Object.hasOwn(ogImageVariants, genesisId)
    ? ogImageVariants[genesisId]
    : defaultOgImageVariant;
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
 * known network its own production host. Throws - rather than silently
 * emitting a broken or wrong-host URL - when VITE_SITE_URL is not an absolute
 * http(s) URL, or when it is unset for a network without a known host.
 */
function siteOriginFor(env: SocialMetaEnv, variant: OgImageVariant): string {
  if (env.VITE_SITE_URL) {
    let url: URL | undefined;
    try {
      url = new URL(env.VITE_SITE_URL);
    } catch {
      // not parseable as an absolute URL - reported below
    }
    if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
      throw new Error(
        `VITE_SITE_URL must be an absolute http(s) URL such as ` +
          `https://algorand.scan.biatec.io, got "${env.VITE_SITE_URL}".`,
      );
    }
    // The app is served from the root of its host, so only the origin
    // matters; this also drops any trailing slash, path or query.
    return url.origin;
  }
  if (!variant.host) {
    throw new Error(
      `VITE_SITE_URL must be set for network "${env.VITE_GENESIS_ID}": the ` +
        `og:image / twitter:image tags need the deployment's public origin ` +
        `(e.g. https://<network>.scan.biatec.io).`,
    );
  }
  return `https://${variant.host}`;
}

/** Vite escapes injected tag attributes but not tag children. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const meta = (
  key: "name" | "property",
  id: string,
  content: string,
): HeadTag => ({
  tag: "meta",
  attrs: { [key]: id, content },
  injectTo: "head",
});

// Same fallback as `networkLabel` in env.ts, so the baked title is the one
// main.ts sets at runtime.
const networkLabelOf = (env: SocialMetaEnv): string =>
  env.VITE_NETWORK_LABEL || DEFAULT_NETWORK_LABEL;

/**
 * The `<title>` and description alone. They need neither the site origin nor
 * the share image, so they can be emitted even when those are unusable.
 */
export function buildPageTags(env: SocialMetaEnv): HeadTag[] {
  const networkLabel = networkLabelOf(env);
  return [
    {
      tag: "title",
      children: escapeHtml(pageTitle(networkLabel)),
      injectTo: "head",
    },
    meta("name", "description", pageDescription(networkLabel)),
  ];
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
  const networkLabel = networkLabelOf(env);
  const variant = ogImageVariantFor(env);

  const title = pageTitle(networkLabel);
  const description = pageDescription(networkLabel);
  const image =
    `${siteOriginFor(env, variant)}/og/${ogImageFileName(variant)}` +
    (imageVersion ? `?v=${imageVersion}` : "");
  const imageAlt = `${SITE_NAME} - ${networkLabel} DEX explorer`;

  return [
    ...buildPageTags(env),

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
