import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildSocialMetaTags,
  defaultOgImageVariant,
  ogImageVariants,
  type HeadTag,
} from "./socialMeta";

/** Content of the meta tag identified by `property=` or `name=`. */
function content(tags: HeadTag[], id: string): string | undefined {
  return tags.find(
    (t) => t.attrs?.property === id || t.attrs?.name === id,
  )?.attrs?.content;
}

describe("buildSocialMetaTags", () => {
  it("defaults to Algorand mainnet when no build variables are set", () => {
    const tags = buildSocialMetaTags({});

    expect(tags.find((t) => t.tag === "title")?.children).toBe(
      "Algorand Explorer - Biatec Scan",
    );
    expect(content(tags, "og:title")).toBe("Algorand Explorer - Biatec Scan");
    expect(content(tags, "og:image")).toBe(
      "https://algorand.scan.biatec.io/og/algorand.png",
    );
    expect(content(tags, "twitter:card")).toBe("summary_large_image");
  });

  it("emits every Open Graph and Twitter Card tag with a value", () => {
    const tags = buildSocialMetaTags({});
    for (const id of [
      "description",
      "og:type",
      "og:site_name",
      "og:locale",
      "og:title",
      "og:description",
      "og:image",
      "og:image:type",
      "og:image:width",
      "og:image:height",
      "og:image:alt",
      "twitter:card",
      "twitter:title",
      "twitter:description",
      "twitter:image",
      "twitter:image:alt",
    ]) {
      expect(content(tags, id), id).toBeTruthy();
    }
    expect(content(tags, "og:image:width")).toBe("1200");
    expect(content(tags, "og:image:height")).toBe("630");
  });

  it("is network-specific: the Voi build never mentions Algorand", () => {
    const tags = buildSocialMetaTags({
      VITE_NETWORK_LABEL: "Voi",
      VITE_GENESIS_ID: "voimain-v1.0",
      VITE_SITE_URL: "https://voi.scan.biatec.io",
    });

    expect(content(tags, "og:title")).toBe("Voi Explorer - Biatec Scan");
    expect(content(tags, "og:image")).toBe(
      "https://voi.scan.biatec.io/og/voi.png",
    );
    expect(content(tags, "twitter:image")).toBe(content(tags, "og:image"));
    expect(JSON.stringify(tags)).not.toMatch(/algorand/i);
  });

  it("tolerates a trailing slash on the site URL", () => {
    const tags = buildSocialMetaTags({
      VITE_SITE_URL: "https://testnet.scan.biatec.io/",
      VITE_GENESIS_ID: "testnet-v1.0",
    });
    expect(content(tags, "og:image")).toBe(
      "https://testnet.scan.biatec.io/og/algorand-testnet.png",
    );
  });

  it("falls back to the network-neutral image for an unknown network", () => {
    const tags = buildSocialMetaTags({
      VITE_NETWORK_LABEL: "Aramid",
      VITE_GENESIS_ID: "aramidmain-v1.0",
      VITE_SITE_URL: "https://aramid.scan.biatec.io",
    });
    expect(content(tags, "og:image")).toBe(
      "https://aramid.scan.biatec.io/og/default.png",
    );
  });

  it("omits og:url so shared deep links are not attributed to the home page", () => {
    expect(content(buildSocialMetaTags({}), "og:url")).toBeUndefined();
  });
});

describe("share images", () => {
  it("has a committed PNG in public/og for every variant", () => {
    for (const variant of [
      defaultOgImageVariant,
      ...Object.values(ogImageVariants),
    ]) {
      const file = fileURLToPath(
        new URL(`../../public/og/${variant.slug}.png`, import.meta.url),
      );
      expect(existsSync(file), file).toBe(true);
    }
  });
});
