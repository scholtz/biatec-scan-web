import { test, expect, type Page } from "@playwright/test";

// Link-preview crawlers don't execute JavaScript. With JS disabled the DOM
// is exactly the served HTML run through a real HTML parser, so these checks
// see what a crawler sees without depending on how Vite serialises the tags.
test.use({ javaScriptEnabled: false });

// Null for an absent tag: a bare getAttribute() would auto-wait for the
// element and time out instead of letting the assertion (and its hint) fail.
async function meta(
  page: Page,
  attr: "property" | "name",
  id: string,
): Promise<string | null> {
  const tag = page.locator(`head meta[${attr}="${id}"]`);
  return (await tag.count()) > 0 ? tag.first().getAttribute("content") : null;
}

// The image tags are only emitted when the bundle was built with
// VITE_SITE_URL, which playwright.config.ts sets for the server it starts.
const noImageHint =
  "og:image is missing - if Playwright reused an already running preview " +
  "server, rebuild it with VITE_SITE_URL set (see playwright.config.ts)";

test("served HTML carries Open Graph and Twitter Card tags", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/.+ Explorer - Biatec Scan$/);
  expect(await meta(page, "name", "description")).toBeTruthy();
  expect(await meta(page, "property", "og:title")).toBeTruthy();
  expect(await meta(page, "property", "og:description")).toBeTruthy();

  const image = await meta(page, "property", "og:image");
  expect(image, noImageHint).toMatch(
    /^https?:\/\/.+\/og\/.+\.jpg\?v=[0-9a-f]{8}$/,
  );
  expect(await meta(page, "name", "twitter:card")).toBe("summary_large_image");
  expect(await meta(page, "name", "twitter:image")).toBe(image);
});

test("the share image referenced by og:image is served as a JPEG", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const image = await meta(page, "property", "og:image");
  expect(image, noImageHint).toBeTruthy();

  // og:image points at the production host; fetch the same path locally.
  const { pathname, search } = new URL(image ?? "");
  const response = await request.get(pathname + search);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/jpeg");
});
