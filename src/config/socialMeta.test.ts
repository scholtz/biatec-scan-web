import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_NETWORK_LABEL, pageTitle } from "./siteIdentity";
import {
  allOgImageVariants,
  buildPageTags,
  buildSocialMetaTags,
  ogImageFileName,
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

    // The runtime title (main.ts) is pageTitle(networkLabel) with the same
    // default label, so the baked and the runtime title agree.
    expect(tags.find((t) => t.tag === "title")?.children).toBe(
      pageTitle(DEFAULT_NETWORK_LABEL),
    );
    expect(content(tags, "og:title")).toBe("Algorand Explorer - Biatec Scan");
    expect(content(tags, "og:image")).toBe(
      "https://algorand.scan.biatec.io/og/algorand.jpg",
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
    expect(content(tags, "og:image:type")).toBe("image/jpeg");
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
      "https://voi.scan.biatec.io/og/voi.jpg",
    );
    expect(content(tags, "twitter:image")).toBe(content(tags, "og:image"));
    expect(JSON.stringify(tags)).not.toMatch(/algorand/i);
  });

  it("uses a known network's own host when VITE_SITE_URL is unset or empty", () => {
    // Docker passes an undeclared build arg as "".
    const tags = buildSocialMetaTags({
      VITE_GENESIS_ID: "voimain-v1.0",
      VITE_SITE_URL: "",
    });
    expect(content(tags, "og:image")).toBe(
      "https://voi.scan.biatec.io/og/voi.jpg",
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
    const tags = buildSocialMetaTags({}, "1a2b3c4d");
    const expected = "https://algorand.scan.biatec.io/og/algorand.jpg?v=1a2b3c4d";
    expect(content(tags, "og:image")).toBe(expected);
    expect(content(tags, "twitter:image")).toBe(expected);
  });

  it("falls back to the network-neutral image for an unknown network", () => {
    const tags = buildSocialMetaTags({
      VITE_NETWORK_LABEL: "Aramid",
      VITE_GENESIS_ID: "aramidmain-v1.0",
      VITE_SITE_URL: "https://aramid.scan.biatec.io",
    });
    expect(content(tags, "og:image")).toBe(
      "https://aramid.scan.biatec.io/og/default.jpg",
    );
  });

  it("treats inherited Object.prototype keys as unknown networks", () => {
    const tags = buildSocialMetaTags({
      VITE_GENESIS_ID: "constructor",
      VITE_SITE_URL: "https://x.scan.biatec.io",
    });
    expect(content(tags, "og:image")).toBe(
      "https://x.scan.biatec.io/og/default.jpg",
    );
  });

  it("fails the build for an unknown network without VITE_SITE_URL", () => {
    // Guessing another deployment's host would point previews at the wrong site.
    expect(() =>
      buildSocialMetaTags({ VITE_GENESIS_ID: "aramidmain-v1.0" }),
    ).toThrow(/VITE_SITE_URL must be set/);
  });

  it("can still build the title and description when the origin is unknown", () => {
    const tags = buildPageTags({
      VITE_NETWORK_LABEL: "Aramid",
      VITE_GENESIS_ID: "aramidmain-v1.0",
    });
    expect(tags.map((t) => t.tag)).toEqual(["title", "meta"]);
    expect(tags[0].children).toBe("Aramid Explorer - Biatec Scan");
    expect(content(tags, "description")).toContain("Aramid DEX explorer");
  });

  it("omits og:url so shared deep links are not attributed to the home page", () => {
    expect(content(buildSocialMetaTags({}), "og:url")).toBeUndefined();
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
