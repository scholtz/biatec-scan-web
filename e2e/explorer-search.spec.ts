import { test, expect } from "@playwright/test";

test.describe("Explorer search", () => {
  test("landing page (narrow): captioned search box with Search button navigates to /search", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    const form = page.locator("main").getByRole("search");
    await expect(form).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Explorer search" }),
    ).toBeVisible();
    await form.getByRole("textbox").fill("  12345  ");
    await form.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search\?q=12345$/);
  });

  test("navbar (wide): icon-only search button has a title and no icon inside the input", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const button = page.locator("nav").getByRole("button", { name: "Search" });
    await expect(button).toHaveAttribute("title", "Search");
    await expect(button).toHaveText("");
    await page.locator("nav").getByRole("textbox").fill("abc");
    await button.click();
    await expect(page).toHaveURL(/\/search\?q=abc$/);
  });
});
