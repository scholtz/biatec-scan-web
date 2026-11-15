import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_NETWORK_LABEL, pageTitle } from "./siteIdentity";
import {
  allOgImageVariants,
  buildSocialMetaTags,
  ogImageFileName,
  socialMetaWarnings,
  type HeadTag,
  type SocialMetaEnv,
} from "./socialMeta";

/** Content of the meta tag identified by `property=` or `name=`. */
function content(tags: HeadTag[], id: string): string | undefined {
  return tags.find((t) => t.attrs?.property === id || t.attrs?.name === id)
    ?.attrs?.content;
}

const mainnet: SocialMetaEnv = {
  VITE_NETWORK_LABEL: "Algorand",
  VITE_GENESIS_ID: "mainnet-v1.0",
  VITE_SITE_URL: "https://algorand.scan.biatec.io",
};

const voi: SocialMetaEnv = {
  VITE_NETWORK_LABEL: "Voi",
  VITE_GENESIS_ID: "voimain-v1.0",
  VITE_SITE_URL: "https://voi.scan.biatec.io",
};

describe("buildSocialMetaTags", () => {
  it("emits every Open Graph and Twitter Card tag with a value", () => {
    const tags = buildSocialMetaTags(mainnet);
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
    expect(content(tags, "og:title")).toBe("Algorand Explorer - Biatec Scan");
    expect(content(tags, "og:image")).toBe(
      "https://algorand.scan.biatec.io/og/algorand.jpg",
    );
    expect(content(tags, "og:image:type")).toBe("image/jpeg");
    expect(content(tags, "og:image:width")).toBe("1200");
    expect(content(tags, "og:image:height")).toBe("630");
    expect(content(tags, "twitter:card")).toBe("summary_large_image");
  });

  it("keeps the title and description consistent across tag families", () => {
    const tags = buildSocialMetaTags(voi);
    const title = tags.find((t) => t.tag === "title")?.children;
    expect(content(tags, "og:title")).toBe(title);
    expect(content(tags, "twitter:title")).toBe(title);
    expect(content(tags, "og:description")).toBe(content(tags, "description"));
    expect(content(tags, "twitter:description")).toBe(
      content(tags, "description"),
    );
  });

  it("is network-specific: the Voi build never mentions Algorand", () => {
    const tags = buildSocialMetaTags(voi);

    expect(content(tags, "og:title")).toBe("Voi Explorer - Biatec Scan");
    expect(content(tags, "og:image")).toBe(
      "https://voi.scan.biatec.io/og/voi.jpg",
    );
    expect(content(tags, "twitter:image")).toBe(content(tags, "og:image"));
    expect(JSON.stringify(tags)).not.toMatch(/algorand/i);
  });

  it("without VITE_SITE_URL degrades to a text-only card, never another host", () => {
    // Unset, or "" as Docker passes an undeclared build arg.
    for (const siteUrl of [undefined, ""]) {
      const tags = buildSocialMetaTags({ ...voi, VITE_SITE_URL: siteUrl });

      // The runtime title (main.ts) is pageTitle(networkLabel) too.
      expect(tags.find((t) => t.tag === "title")?.children).toBe(
        pageTitle("Voi"),
      );
      expect(content(tags, "og:title")).toBe("Voi Explorer - Biatec Scan");
      expect(content(tags, "og:description")).toBeTruthy();
      expect(content(tags, "twitter:card")).toBe("summary");
      expect(content(tags, "og:image")).toBeUndefined();
      expect(content(tags, "twitter:image")).toBeUndefined();
      expect(JSON.stringify(tags)).not.toMatch(/https?:/);
    }
  });

  it("defaults to the Algorand label when no build variables are set", () => {
    const tags = buildSocialMetaTags({});
    expect(tags.find((t) => t.tag === "title")?.children).toBe(
      pageTitle(DEFAULT_NETWORK_LABEL),
    );
  });

  it("reduces the site URL to its origin (trailing slash, path, query)", () => {
    for (const siteUrl of [
      "https://testnet.scan.biatec.io/",
      "https://testnet.scan.biatec.io/app/?x=1",
    ]) {
      const tags = buildSocialMetaTags({
        VITE_SITE_URL: siteUrl,
        VITE_GENESIS_ID: "testnet-v1.0",
      });
      expect(content(tags, "og:image"), siteUrl).toBe(
        "https://testnet.scan.biatec.io/og/algorand-testnet.jpg",
      );
    }
  });

  it("rejects a site URL that is not an absolute http(s) URL", () => {
    for (const siteUrl of ["voi.scan.biatec.io", "ftp://voi.scan.biatec.io"]) {
      expect(
        () => buildSocialMetaTags({ VITE_SITE_URL: siteUrl }),
        siteUrl,
      ).toThrow(/VITE_SITE_URL must be an absolute http\(s\) URL/);
    }
  });

  it("HTML-escapes the title element's text", () => {
    const tags = buildSocialMetaTags({
      VITE_NETWORK_LABEL: "A&B </title><script>",
    });
    expect(tags.find((t) => t.tag === "title")?.children).toBe(
      "A&amp;B &lt;/title&gt;&lt;script&gt; Explorer - Biatec Scan",
    );
    // Attribute values are escaped by Vite when it serialises the tag.
    expect(content(tags, "og:title")).toBe(
      "A&B </title><script> Explorer - Biatec Scan",
    );
  });

  it("appends the image version as a cache-buster to both image tags", () => {
    const tags = buildSocialMetaTags(mainnet, "1a2b3c4d");
    const expected =
      "https://algorand.scan.biatec.io/og/algorand.jpg?v=1a2b3c4d";
    expect(content(tags, "og:image")).toBe(expected);
    expect(content(tags, "twitter:image")).toBe(expected);
  });

  it("uses the network-neutral image for a network without its own variant", () => {
    for (const genesisId of ["aramidmain-v1.0", "constructor", "__proto__"]) {
      const tags = buildSocialMetaTags({
        VITE_NETWORK_LABEL: "Aramid",
        VITE_GENESIS_ID: genesisId,
        VITE_SITE_URL: "https://aramid.scan.biatec.io",
      });
      expect(content(tags, "og:image"), genesisId).toBe(
        "https://aramid.scan.biatec.io/og/default.jpg",
      );
    }
  });

  it("omits og:url so shared deep links are not attributed to the home page", () => {
    expect(content(buildSocialMetaTags(mainnet), "og:url")).toBeUndefined();
  });
});

describe("socialMetaWarnings", () => {
  it("is silent for a consistently configured network", () => {
    expect(socialMetaWarnings(mainnet)).toEqual([]);
    expect(socialMetaWarnings(voi)).toEqual([]);
    // A network without its own image has no label to disagree with.
    expect(
      socialMetaWarnings({
        VITE_NETWORK_LABEL: "Aramid",
        VITE_GENESIS_ID: "aramidmain-v1.0",
        VITE_SITE_URL: "https://aramid.scan.biatec.io",
      }),
    ).toEqual([]);
  });

  it("warns when VITE_SITE_URL is missing", () => {
    const warnings = socialMetaWarnings({ ...voi, VITE_SITE_URL: "" });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/VITE_SITE_URL is not set/);
  });

  it("warns when the label and the genesis id describe different networks", () => {
    // VITE_GENESIS_ID forgotten: defaults to Algorand mainnet's image.
    const warnings = socialMetaWarnings({
      VITE_NETWORK_LABEL: "Voi",
      VITE_SITE_URL: "https://voi.scan.biatec.io",
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/"Voi".*depicts "Algorand"/);
  });
});

describe("share images", () => {
  it("has a committed image under 300 kB in public/og for every variant", () => {
    for (const variant of allOgImageVariants) {
      const file = fileURLToPath(
        new URL(`../../public/og/${ogImageFileName(variant)}`, import.meta.url),
      );
      // Throws if the file is missing. 300 kB is where some messengers
      // (WhatsApp) stop showing the large preview image.
      expect(statSync(file).size, file).toBeLessThan(300_000);
    }
  });
});
