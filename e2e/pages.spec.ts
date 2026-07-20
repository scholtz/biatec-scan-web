import { test, expect } from "@playwright/test";

// Routes that don't require dynamic params, so they can be visited directly.
const routes = [
  { path: "/", name: "Dashboard" },
  { path: "/explore", name: "Explore" },
  { path: "/assets", name: "Assets" },
  { path: "/trades", name: "Trades" },
  { path: "/favorite", name: "Favorite" },
  { path: "/settings", name: "Settings" },
  { path: "/search", name: "Search" },
  { path: "/about", name: "About" },
];

for (const route of routes) {
  test(`page "${route.name}" (${route.path}) loads without console/page errors`, async ({
    page,
  }) => {
    // SignalR can't reach the live backend from a test environment (blocked by
    // CORS / no network route), and the app is designed to degrade gracefully
    // (shows "OFFLINE"), so that specific network failure is expected noise.
    // Anything else mentioning signalr/negotiation (e.g. a TypeError from a
    // bug in the connection setup code) must NOT be swallowed by this filter.
    const isExpectedSignalRNoise = (text: string) =>
      /signalr|negotiation/i.test(text) &&
      /failed to fetch|cors policy|err_failed|websocket/i.test(text);

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && !isExpectedSignalRNoise(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      if (!isExpectedSignalRNoise(err.message)) pageErrors.push(err.message);
    });

    const response = await page.goto(route.path);
    expect(response?.ok()).toBeTruthy();

    // The app should mount and render the SPA root.
    await expect(page.locator("#app").first()).not.toBeEmpty();

    // Basic accessibility sanity: the document must have a lang attribute
    // and at least one heading identifying the page content.
    await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
    await expect(page.locator("h1, h2").first()).toBeVisible();

    expect(consoleErrors, `console errors on ${route.path}`).toEqual([]);
    expect(pageErrors, `page errors on ${route.path}`).toEqual([]);
  });
}
