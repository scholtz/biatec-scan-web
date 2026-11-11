import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// The Pact CLAMM ALGO/USDC pool 3762241535 as the backend serves it: reserves, price and the liquidity ranges read
// from the pool's on-chain tick boxes (TVL 18.94k USD - Pact reports 18.93k).
const pool = JSON.parse(readFileSync(new URL("./fixtures/pact-clamm-3762241535-pool.json", import.meta.url), "utf-8"));

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,OPTIONS",
};

async function mockApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const url = new URL(route.request().url());
    // pools are looked up via the list endpoint's address filter; every other list (trades, liquidity, ...) is empty
    const body = url.pathname.toLowerCase().endsWith("/api/pool") ? [pool] : [];
    await route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(body) });
  });
}

test.describe("pool details of a tick based CLAMM pool", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto(`/pool/${pool.poolAddress}`);
  });

  test("shows the contract price and the 24h volume", async ({ page }) => {
    // 1 ALGO = 0.0899308 USDC - not the reserve ratio (~46.5) the page showed before
    await expect(page.getByText("Price of 1 ALGO:")).toBeVisible();
    await expect(page.getByText(/0\.0899308/).first()).toBeVisible();
    await expect(page.getByText(/11\.1197/).first()).toBeVisible();
    await expect(page.getByText("24h volume:")).toBeVisible();
    await expect(page.getByText(/\$5,917\.94/)).toBeVisible();
    // TVL comes from the box-derived reserves: 18,937.71 USD
    await expect(page.getByText(/\$18,937\.71/)).toBeVisible();
  });

  test("draws the liquidity distribution with the active range and the price marker", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Liquidity distribution" })).toBeVisible();
    await expect(page.getByText("Liquidity ranges: 50")).toBeVisible();
    await expect(page.getByTestId("liquidity-bar")).toHaveCount(49);
    await expect(page.getByTestId("liquidity-bar-active")).toHaveCount(1);
    await expect(page.getByTestId("liquidity-price-marker")).toHaveCount(1);

    // hovering a bar explains it
    await page.getByTestId("liquidity-bar-active").locator("xpath=following-sibling::*[1]").hover({ force: true });
    await expect(page.getByTestId("liquidity-tooltip")).toContainText("Price range");
    await expect(page.getByTestId("liquidity-tooltip")).toContainText("Active range");

    // and the same data is available as a table
    await page.getByTestId("liquidity-table-toggle").click();
    await expect(page.getByTestId("liquidity-table-row")).toHaveCount(50);

    await page.getByRole("heading", { name: "Liquidity distribution" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: "test-results/pool-liquidity-distribution.png", fullPage: true });
  });
});
