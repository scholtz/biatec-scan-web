import { describe, expect, it } from "vitest";
import { classifyAccountLookup } from "./accountLookup";

describe("classifyAccountLookup", () => {
  it("treats 2xx as found", () => {
    expect(classifyAccountLookup(200)).toBe("found");
  });

  it("treats the indexer's no-account 404 as an empty (closed) account", () => {
    expect(
      classifyAccountLookup(404, "no accounts found for address: ABC"),
    ).toBe("empty");
  });

  it("keeps a generic 404 (wrong indexer URL / gateway) as an error", () => {
    expect(classifyAccountLookup(404, "Not Found")).toBe("error");
    expect(classifyAccountLookup(404)).toBe("error");
  });

  it("keeps invalid-address and server failures as errors", () => {
    expect(classifyAccountLookup(400, "invalid input")).toBe("error");
    expect(classifyAccountLookup(500)).toBe("error");
    expect(classifyAccountLookup(503)).toBe("error");
  });
});
