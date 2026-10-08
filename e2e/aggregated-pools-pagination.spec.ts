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

/** The document must not be taller than the viewport (no page scrollbar). */
async function expectFitsViewport(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight))
    .toBeLessThanOrEqual(0);
}

test.describe("aggregated pools pagination", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("renders only one page of rows with a range summary", async ({ page }) => {
    await page.goto("/aggregated-pools/0?pageSize=25");
    await expect(page.getByTestId("loaded-count")).toHaveText(String(TOTAL));
    await expect(pairLinks(page)).toHaveCount(25); // default page size
    await expect(page.getByTestId("pagination-range")).toContainText("1");
    await expect(page.getByTestId("pagination-page")).toContainText("1");
    await expect(page.getByTestId("pagination-page")).toContainText("3");
    await expect(page.getByTestId("pagination-prev")).toBeDisabled();
    await expect(page.getByTestId("pagination-next")).toBeEnabled();
  });

  test("next/prev move through pages and update the URL", async ({ page }) => {
    await page.goto("/aggregated-pools/0?pageSize=25");
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
    await page.goto("/aggregated-pools/0?page=3&pageSize=25");
    await expect(pairLinks(page)).toHaveCount(10);

    await page.getByTestId("pagination-size").selectOption("15");
    await expect(page).toHaveURL(/pageSize=15/);
    await expect(page).not.toHaveURL(/page=3/);
    await expect(pairLinks(page)).toHaveCount(15);
    await expect(page.locator('a[href="/pools/0/1001"]').first()).toBeVisible();
  });

  test("malformed or out-of-range query values degrade gracefully", async ({ page }) => {
    // Page 999 -> clamped to the last page (3).
    await page.goto("/aggregated-pools/0?page=999&pageSize=25");
    await expect(pairLinks(page)).toHaveCount(10);
    await expect(page.getByTestId("pagination-next")).toBeDisabled();

    await page.goto("/aggregated-pools/0?page=abc&pageSize=25");
    await expect(pairLinks(page)).toHaveCount(25);
    await expect(page.getByTestId("pagination-prev")).toBeDisabled();
  });

  test("without ?pageSize= the rows fit the viewport without page scrolling", async ({ page }) => {
    await page.goto("/aggregated-pools/0");
    await expect(page.getByTestId("loaded-count")).toHaveText(String(TOTAL));
    await expectFitsViewport(page);
    const n = await pairLinks(page).count();
    expect(n).toBeGreaterThanOrEqual(5);
    expect(n).toBeLessThan(TOTAL);
    // The fitted size is offered (and selected) as the "Auto" option.
    await expect(page.getByTestId("pagination-size")).toHaveValue("auto");
    await expect(page.getByTestId("pagination-size").locator("option:checked")).toHaveText(`${n} (Auto)`);
  });

  test("the fitted size follows the viewport height and invalid sizes mean auto", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto("/aggregated-pools/0?pageSize=7");
    await expect(page.getByTestId("loaded-count")).toHaveText(String(TOTAL));
    await expectFitsViewport(page);
    const small = await pairLinks(page).count();

    await page.setViewportSize({ width: 1280, height: 1000 });
    await expect.poll(() => pairLinks(page).count()).toBeGreaterThan(small);
    await expectFitsViewport(page);
  });

  test("the mobile card layout also fits without page scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/aggregated-pools/0");
    await expect(page.getByTestId("loaded-count")).toHaveText(String(TOTAL));
    await expect(page.getByTestId("pagination")).toBeVisible();
    await expectFitsViewport(page);
  });

  test("a single-pair asset (nothing to measure) still shows the Auto option selected", async ({ page }) => {
    await page.route("**/api/aggregated-pool**", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(pools.slice(0, 1)) });
    });
    await page.goto("/aggregated-pools/0");
    await expect(page.getByTestId("loaded-count")).toHaveText("1");
    await expect(page.getByTestId("pagination-size")).toHaveValue("auto");
    await expect(pairLinks(page)).toHaveCount(1);
  });

  test("a viewport fitting a single row recovers when it grows again", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 330 });
    await page.goto("/aggregated-pools/0");
    await expect(page.getByTestId("loaded-count")).toHaveText(String(TOTAL));
    await expect(pairLinks(page)).toHaveCount(1);

    await page.setViewportSize({ width: 390, height: 900 });
    await expect.poll(() => pairLinks(page).count()).toBeGreaterThan(1);
    await expectFitsViewport(page);
  });

  test("a fixed size equal to the currently fitted size can still be pinned", async ({ page }) => {
    await page.goto("/aggregated-pools/0");
    await expect(page.getByTestId("loaded-count")).toHaveText(String(TOTAL));
    // Find a viewport height at which the fitted size equals a fixed option (15).
    let found = false;
    for (let h = 500; h <= 1400 && !found; h += 20) {
      await page.setViewportSize({ width: 1280, height: h });
      await expect(page.getByTestId("pagination-size")).toHaveValue("auto");
      await page.waitForTimeout(150);
      found = (await page.getByTestId("pagination-size").locator("option:checked").textContent())?.startsWith("15 ") ?? false;
    }
    expect(found, "a viewport height fitting exactly 15 rows").toBe(true);

    await page.getByTestId("pagination-size").selectOption("15");
    await expect(page).toHaveURL(/pageSize=15/);
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.waitForTimeout(300);
    await expect(pairLinks(page)).toHaveCount(15); // pinned: did not follow the taller viewport
  });

  test("picking a fixed size pins it; picking the Auto option goes back to fitting", async ({ page }) => {
    await page.goto("/aggregated-pools/0");
    await expect(page.getByTestId("loaded-count")).toHaveText(String(TOTAL));
    await expectFitsViewport(page);
    const fitted = await pairLinks(page).count();

    await page.getByTestId("pagination-size").selectOption("50");
    await expect(page).toHaveURL(/pageSize=50/);
    await expect(pairLinks(page)).toHaveCount(50);

    await page.getByTestId("pagination-size").selectOption("auto");
    await expect(page).not.toHaveURL(/pageSize=/);
    await expect(pairLinks(page)).toHaveCount(fitted);
    await expectFitsViewport(page);
  });
});
