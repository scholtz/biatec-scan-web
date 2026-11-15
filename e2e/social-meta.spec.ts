import { test, expect } from "@playwright/test";

// Link-preview crawlers don't execute JavaScript, so these checks read the
// raw served HTML rather than the rendered DOM.
test("served HTML carries Open Graph and Twitter Card tags", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();

  const content = (attr: "property" | "name", id: string) =>
    new RegExp(`<meta ${attr}="${id}" content="([^"]*)"`).exec(html)?.[1];

  expect(html).toMatch(/<title>.+ Explorer - Biatec Scan<\/title>/);
  expect(content("name", "description")).toBeTruthy();
  expect(content("property", "og:title")).toBeTruthy();
  expect(content("property", "og:description")).toBeTruthy();
  expect(content("property", "og:image")).toMatch(/^https:\/\/.+\/og\/.+\.png$/);
  expect(content("name", "twitter:card")).toBe("summary_large_image");
  expect(content("name", "twitter:image")).toBe(
    content("property", "og:image"),
  );
});

test("the share image referenced by og:image is served as a PNG", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();
  const image = /<meta property="og:image" content="([^"]*)"/.exec(html)?.[1];
  expect(image).toBeTruthy();

  // og:image points at the production host; fetch the same path locally.
  const response = await request.get(new URL(image ?? "").pathname);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
});
