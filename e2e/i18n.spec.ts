import { test, expect } from "@playwright/test";

test.describe("translations", () => {
  test("language switcher changes rendered text and persists the choice", async ({
    page,
  }) => {
    await page.goto("/settings");

    const heading = page.locator("h1");
    await expect(heading).toHaveText("Settings");

    // Open the language switcher and pick Slovak.
    await page.getByTitle("Toggle language").click();
    await page.getByRole("button", { name: "Slovenčina" }).click();

    await expect(heading).toHaveText("Nastavenia");
    await expect(async () => {
      expect(await page.evaluate(() => localStorage.getItem("locale"))).toBe(
        "sk",
      );
    }).toPass();

    // The choice must persist across navigation and a full reload.
    await page.goto("/about");
    await expect(page.locator("h1")).toHaveText("O Biatec Algorand Scan");

    await page.reload();
    await expect(page.locator("h1")).toHaveText("O Biatec Algorand Scan");
  });

  test("settings page label is translated for every supported locale", async ({
    page,
  }) => {
    const expectedTitles: Record<string, string> = {
      en: "Settings",
      sk: "Nastavenia",
    };

    for (const [locale, title] of Object.entries(expectedTitles)) {
      await page.addInitScript((l) => {
        localStorage.setItem("locale", l);
      }, locale);
      await page.goto("/settings");
      await expect(page.locator("h1")).toHaveText(title);
    }
  });
});
