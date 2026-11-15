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

/** The build-time variables the social metadata depends on (see src/vite-env.d.ts). */
export interface SocialMetaEnv {
  VITE_NETWORK_LABEL?: string;
  VITE_GENESIS_ID?: string;
  /**
   * Public origin of the deployment (e.g. https://voi.scan.biatec.io), the
   * only source of the absolute share-image URL. Without it the image tags
   * are left out - never pointed at some other deployment's host.
   */
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
   * Host printed in the image footer (decorative only - the image URL comes
   * from VITE_SITE_URL). Empty for the network-neutral image.
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
  const genesisId = env.VITE_GENESIS_ID || DEFAULT_GENESIS_ID;
  // Object.hasOwn: the id is external input, and "constructor"/"toString"
  // would otherwise resolve to inherited Object.prototype members.
  return Object.hasOwn(ogImageVariants, genesisId)
    ? ogImageVariants[genesisId]
    : defaultOgImageVariant;
}

// Same fallback as `networkLabel` in env.ts, so the baked title is the one
// main.ts sets at runtime.
const networkLabelOf = (env: SocialMetaEnv): string =>
  env.VITE_NETWORK_LABEL || DEFAULT_NETWORK_LABEL;

export function pageDescription(networkLabel: string): string {
  return (
    `${SITE_NAME} is a real-time ${networkLabel} DEX explorer: blocks, ` +
    `transactions, AMM trades, liquidity pools, asset prices and swap ` +
    `routing in one place.`
  );
}

/**
 * Origin of VITE_SITE_URL, or undefined when it is unset/empty (Docker passes
 * an undeclared build arg as ""). Throws when it is set but is not an
 * absolute http(s) URL, which would otherwise yield a silently broken image
 * URL.
 */
export function siteOriginOf(env: SocialMetaEnv): string | undefined {
  if (!env.VITE_SITE_URL) return undefined;
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
  // The app is served from the root of its host, so only the origin matters;
  // this also drops any trailing slash, path or query.
  return url.origin;
}

/**
 * Non-fatal configuration problems worth a build warning: previews still
 * work, but not as well as they could.
 */
export function socialMetaWarnings(env: SocialMetaEnv): string[] {
  const warnings: string[] = [];
  if (!siteOriginOf(env)) {
    warnings.push(
      "VITE_SITE_URL is not set, so link previews will have no image " +
        "(og:image / twitter:image need the deployment's public origin, " +
        "e.g. https://algorand.scan.biatec.io).",
    );
  }
  const variant = ogImageVariantFor(env);
  const networkLabel = networkLabelOf(env);
  if (variant !== defaultOgImageVariant && variant.label !== networkLabel) {
    warnings.push(
      `VITE_NETWORK_LABEL is "${networkLabel}" but the share image selected ` +
        `by VITE_GENESIS_ID depicts "${variant.label}" - check that both ` +
        `variables describe the same network.`,
    );
  }
  return warnings;
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

/**
 * Builds the title, description, Open Graph and Twitter Card tags for the
 * network a build targets. Defaults mirror src/config/env.ts (Algorand
 * mainnet) so an unconfigured local build still yields valid tags.
 *
 * The image tags are only emitted when VITE_SITE_URL provides the origin for
 * their absolute URL; without it the preview degrades to a text-only card
 * (`twitter:card=summary`) instead of referencing another deployment's host.
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
  const title = pageTitle(networkLabel);
  const description = pageDescription(networkLabel);
  const origin = siteOriginOf(env);

  const tags: HeadTag[] = [
    { tag: "title", children: escapeHtml(title), injectTo: "head" },
    meta("name", "description", description),

    meta("property", "og:type", "website"),
    meta("property", "og:site_name", SITE_NAME),
    meta("property", "og:locale", "en_US"),
    meta("property", "og:title", title),
    meta("property", "og:description", description),
  ];

  if (!origin) {
    return [
      ...tags,
      meta("name", "twitter:card", "summary"),
      meta("name", "twitter:title", title),
      meta("name", "twitter:description", description),
    ];
  }

  const image =
    `${origin}/og/${ogImageFileName(ogImageVariantFor(env))}` +
    (imageVersion ? `?v=${imageVersion}` : "");
  const imageAlt = `${SITE_NAME} - ${networkLabel} DEX explorer`;

  return [
    ...tags,
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
