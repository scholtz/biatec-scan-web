import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { APPLICATION_ROUTE_PATH, TAB_KEYS } from "./applicationTabs";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: APPLICATION_ROUTE_PATH, name: "ApplicationDetails", component: { render: () => null } },
  ],
});

describe("application tab route", () => {
  it("matches the bare URL with no tab", () => {
    const r = router.resolve("/application/123");
    expect(r.name).toBe("ApplicationDetails");
    expect(r.params.tab).toBeFalsy();
  });

  it.each(TAB_KEYS)("matches /application/123/%s", (tab) => {
    const r = router.resolve(`/application/123/${tab}`);
    expect(r.name).toBe("ApplicationDetails");
    expect(r.params.tab).toBe(tab);
  });

  it("does not match unknown tabs", () => {
    expect(router.resolve("/application/123/nope").name).toBeUndefined();
  });

  it("builds URLs, omitting the tab segment when undefined", () => {
    expect(router.resolve({ name: "ApplicationDetails", params: { appId: "1" } }).path).toBe("/application/1");
    expect(
      router.resolve({ name: "ApplicationDetails", params: { appId: "1", tab: "boxes" } }).path,
    ).toBe("/application/1/boxes");
  });
});
