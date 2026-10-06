import { test, expect, type Page } from "@playwright/test";

const TOTAL = 60;

// 60 pairs for asset 0, ordered by descending reserve so that the default
// order is deterministic: pair i (1-based) has other asset 1000 + i.
const pools = Array.from({ length: TOTAL }, (_, i) => ({
  id: `agg-${i + 1}`,
  assetIdA: 0,
  assetIdB: 1001 + i,
  poolCount: 1,
  tvL_A: (TOTAL - i) * 1_000_000,
  tvL_B: 1_000_000,
  totalTVLAssetAInUSD: TOTAL - i,
  lastUpdated: "2026-10-01T00:00:00Z",
}));

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,OPTIONS",
};

async function mockApi(page: Page) {
  await page.route("**/api/aggregated-pool**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(pools) });
  });
}

/** Pair links in the desktop grid, e.g. "-/1001" (label falls back to the asset id). */
function pairLinks(page: Page) {
  return page.getByRole("link", { name: /^\S+\/10\d\d$/ });
}

test.describe("aggregated pools pagination", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("renders only one page of rows with a range summary", async ({ page }) => {
    await page.goto("/aggregated-pools/0");
    await expect(page.getByTestId("loaded-count")).toHaveText(String(TOTAL));
    await expect(pairLinks(page)).toHaveCount(25); // default page size
    await expect(page.getByTestId("pagination-range")).toContainText("1");
    await expect(page.getByTestId("pagination-page")).toContainText("1");
    await expect(page.getByTestId("pagination-page")).toContainText("3");
    await expect(page.getByTestId("pagination-prev")).toBeDisabled();
    await expect(page.getByTestId("pagination-next")).toBeEnabled();
  });

  test("next/prev move through pages and update the URL", async ({ page }) => {
    await page.goto("/aggregated-pools/0");
    await expect(pairLinks(page)).toHaveCount(25);

    await page.getByTestId("pagination-next").click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pairLinks(page)).toHaveCount(25);
    await expect(page.locator('a[href="/pools/0/1026"]').first()).toBeVisible();
    await expect(page.locator('a[href="/pools/0/1001"]')).toHaveCount(0);

    await page.getByTestId("pagination-next").click();
    await expect(pairLinks(page)).toHaveCount(10); // 60 = 25 + 25 + 10
    await expect(page.getByTestId("pagination-next")).toBeDisabled();

    await page.getByTestId("pagination-prev").click();
    await page.getByTestId("pagination-prev").click();
    await expect(page.getByTestId("pagination-prev")).toBeDisabled();
    await expect(page.locator('a[href="/pools/0/1001"]').first()).toBeVisible();
  });

  test("page and page size are restored from the URL", async ({ page }) => {
    await page.goto("/aggregated-pools/0?page=2&pageSize=50");
    await expect(pairLinks(page)).toHaveCount(10); // 60 = 50 + 10
    await expect(page.getByTestId("pagination-size")).toHaveValue("50");
    await expect(page.locator('a[href="/pools/0/1051"]').first()).toBeVisible();
  });

  test("changing the page size goes back to the first page", async ({ page }) => {
    await page.goto("/aggregated-pools/0?page=3");
    await expect(pairLinks(page)).toHaveCount(10);

    await page.getByTestId("pagination-size").selectOption("15");
    await expect(page).toHaveURL(/pageSize=15/);
    await expect(page).not.toHaveURL(/page=3/);
    await expect(pairLinks(page)).toHaveCount(15);
    await expect(page.locator('a[href="/pools/0/1001"]').first()).toBeVisible();
  });

  test("malformed or out-of-range query values degrade gracefully", async ({ page }) => {
    await page.goto("/aggregated-pools/0?page=999&pageSize=7");
    // Invalid size -> default 25; page 999 -> clamped to the last page (3).
    await expect(pairLinks(page)).toHaveCount(10);
    await expect(page.getByTestId("pagination-next")).toBeDisabled();

    await page.goto("/aggregated-pools/0?page=abc");
    await expect(pairLinks(page)).toHaveCount(25);
    await expect(page.getByTestId("pagination-prev")).toBeDisabled();
  });
});
