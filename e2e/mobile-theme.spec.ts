import { test, expect, type Page } from "@playwright/test";

// Elements whose right edge sticks out of the viewport. `overflow-x: clip` on
// <html> hides page-level scrolling, so scrollWidth alone cannot catch clipped
// content - measure the elements instead.
async function overflowingElements(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders: string[] = [];
    document.querySelectorAll<HTMLElement>("#app *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // Ignore content inside intentionally horizontally-scrollable boxes.
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "auto" || ox === "scroll") return;
      }
      if (r.right > vw + 1) {
        offenders.push(
          `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 120),
        );
      }
    });
    return offenders;
  });
}

test.describe("mobile layout", () => {
  for (const width of [320, 375, 430]) {
    test(`swap page does not overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/swap");
      await expect(page.locator("h1")).toBeVisible();
      expect(await overflowingElements(page)).toEqual([]);
    });
  }

  test("asset picker opens as a bottom sheet within the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await page.goto("/swap");
    await page.getByRole("button", { name: /ALGO|VOI/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  });
});

test.describe("theme", () => {
  test("defaults to the system preference", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "light" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await ctx.close();
  });

  test("toggle switches theme and persists across reloads", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page
      .getByTestId("theme-toggle")
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await ctx.close();
  });

  test("light theme renders ink-coloured headings, not white", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ colorScheme: "light" });
    const page = await ctx.newPage();
    await page.goto("/settings");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    const color = await h1.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe("rgb(15, 23, 42)");
    await ctx.close();
  });

  test("settings page theme selector sets the mode", async ({ page }) => {
    await page.goto("/settings");
    await page.getByTestId("theme-option-light").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.getByTestId("theme-option-light")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
